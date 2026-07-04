const { PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');
const { balanceTeams, formatTeamField } = require('../../utils/matchMaker');
const { createMatch, updateMatchStatus, deleteMatch } = require('./matchService');
const { updateQueueMessage } = require('../../utils/queueManager');
const { clearQueue, setQueue } = require('../../utils/listStore');
const { buildActionRow: buildMatchInfoAction } = require('../../utils/matchInfoManager');

// In-memory lock to prevent concurrent match creation per guild
const creatingMatches = new Set();

async function createMatchChannel(interaction, channelName, players) {
  const permissionOverwrites = [
    {
      id: interaction.guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel],
    },
  ];

  for (const player of players) {
    permissionOverwrites.push({
      id: player.userId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
    });
  }

  return interaction.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    topic: `Temporary match channel created by ${interaction.user.tag}`,
    reason: 'Automatic match channel creation',
    permissionOverwrites,
  });
}

async function createMatchFromQueue(interaction, queue, matchLifetimeSeconds = 600) {
  if (creatingMatches.has(interaction.guildId)) {
    throw new Error('Match creation already in progress for this guild');
  }
  creatingMatches.add(interaction.guildId);

  const queueSnapshot = queue.map((player) => ({ ...player }));
  const { teamA, teamB } = balanceTeams(queue);
  const difference = Math.abs(teamA.total - teamB.total);
  const channelName = `match-${Math.floor(Date.now() / 1000)}`;

  let matchChannel = null;
  let matchRecord = null;

  try {
    matchChannel = await createMatchChannel(interaction, channelName, [...teamA.players, ...teamB.players]);

    matchRecord = await createMatch({
      guildId: interaction.guildId,
      creatorId: interaction.user.id,
      matchName: channelName,
      teamA: teamA.players,
      teamB: teamB.players,
    });

    const teamEmbed = new EmbedBuilder()
      .setTitle('Match Teams')
      .setColor('Green')
      .addFields(
        formatTeamField('Team A', teamA),
        formatTeamField('Team B', teamB),
        {
          name: 'Match Info',
          value: `Channel: ${matchChannel}\nCreated by: ${interaction.user.tag}\nMatch ID: ${matchRecord.id}\nExpires in: ${matchLifetimeSeconds} seconds`,
          inline: false,
        }
      )
      .setTimestamp();

    await matchChannel.send({ embeds: [teamEmbed], components: [buildMatchInfoAction(matchRecord.id)] });

    const summaryEmbed = new EmbedBuilder()
      .setTitle('Match Created')
      .setColor('Aqua')
      .setDescription(`A temporary match channel has been created for this game. This channel will be deleted after **${matchLifetimeSeconds} seconds**.`)
      .addFields(
        { name: 'Match Channel', value: `${matchChannel}`, inline: false },
        { name: 'Players', value: `${queue.length}`, inline: true },
        { name: 'Rating Gap', value: `${difference} points`, inline: true },
        { name: 'Match ID', value: `${matchRecord.id}`, inline: false }
      )
      .setTimestamp();

    clearQueue(interaction.guildId);
    await updateQueueMessage(interaction.guildId).catch(() => null);

    setTimeout(async () => {
      try {
        const refreshedChannel = interaction.guild.channels.cache.get(matchChannel.id);
        if (refreshedChannel && refreshedChannel.deletable) {
          await refreshedChannel.delete('Match expired').catch(() => null);
          await updateMatchStatus(matchRecord.id, 'expired', { expiredAt: new Date().toISOString() }).catch(() => null);
        }
      } catch (err) {
        console.error('Failed to cleanup expired match channel:', err);
      }
    }, matchLifetimeSeconds * 1000);

    return { matchRecord, summaryEmbed };
  } catch (error) {
    if (matchChannel?.deletable) {
      await matchChannel.delete('Cleanup after failed match creation').catch(() => null);
    }

    if (matchRecord?.id) {
      await deleteMatch(matchRecord.id).catch(() => null);
    }

    setQueue(interaction.guildId, queueSnapshot);
    await updateQueueMessage(interaction.guildId).catch(() => null);
    throw error;
  } finally {
    creatingMatches.delete(interaction.guildId);
  }
}

module.exports = { createMatchFromQueue };
