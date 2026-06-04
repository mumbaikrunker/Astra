const { PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');
const { balanceTeams, formatTeamField } = require('../../utils/matchMaker');
const { createMatch, updateMatchStatus } = require('./matchService');
const { updateQueueMessage } = require('../../utils/queueManager');
const { clearQueue } = require('../../utils/listStore');
const { buildActionRow: buildMatchInfoAction } = require('../../utils/matchInfoManager');

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
  const { teamA, teamB } = balanceTeams(queue);
  const difference = Math.abs(teamA.total - teamB.total);
  const channelName = `match-${Math.floor(Date.now() / 1000)}`;

  const matchChannel = await createMatchChannel(interaction, channelName, [...teamA.players, ...teamB.players]);

  let matchRecord;
  try {
    matchRecord = await createMatch({
      guildId: interaction.guildId,
      creatorId: interaction.user.id,
      matchName: channelName,
      teamA: teamA.players,
      teamB: teamB.players,
    });
  } catch (error) {
    if (matchChannel.deletable) {
      await matchChannel.delete('Cleanup after failed match creation');
    }
    throw error;
  }

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
    const refreshedChannel = interaction.guild.channels.cache.get(matchChannel.id);
    if (refreshedChannel && refreshedChannel.deletable) {
      await refreshedChannel.delete('Match expired');
      await updateMatchStatus(matchRecord.id, 'expired', { expiredAt: new Date().toISOString() }).catch(() => null);
    }
  }, matchLifetimeSeconds * 1000);

  return { matchRecord, summaryEmbed };
}

module.exports = { createMatchFromQueue };
