const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getQueue, clearQueue, setQueue } = require('./listStore');
const { updateQueueMessage } = require('./queueManager');

let globalClient = null;
const sessions = new Map();

function buildReadyEmbed(session) {
  const total = session.participants.length;
  const readyCount = session.ready.size;
  const notReadyCount = session.notReady.size;
  const lines = session.participants.map((player) => {
    const status = session.ready.has(player.userId)
      ? '✅ Ready'
      : session.notReady.has(player.userId)
      ? '❌ Not Ready'
      : '⏳ Waiting';
    return `${player.name} — ${player.rating} (${status})`;
  });

  return new EmbedBuilder()
    .setTitle('Ready Check')
    .setColor('Blue')
    .setDescription(`React with Ready or Not Ready. Waiting for all players to confirm.`)
    .addFields(
      { name: 'Players', value: `${readyCount}/${total} ready`, inline: true },
      { name: 'Not Ready', value: `${notReadyCount}`, inline: true },
      { name: 'Timeout', value: `<t:${Math.floor(session.expiresAt / 1000)}:R>`, inline: false },
      { name: 'Queue', value: lines.join('\n') }
    )
    .setTimestamp();
}

function buildActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ready_accept')
      .setLabel('Ready')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('ready_decline')
      .setLabel('Not Ready')
      .setStyle(ButtonStyle.Danger)
  );
}

async function createSession(interaction, participants, readyTimeoutSeconds) {
  if (sessions.has(interaction.guildId)) {
    return null;
  }

  // snapshot the current queue and clear it to prevent duplicate joins
  const currentQueue = getQueue(interaction.guildId) || [];
  const snapshot = currentQueue.map((p) => ({ ...p }));

  const session = {
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    messageId: null,
    participants: snapshot,
    originalQueue: snapshot,
    ready: new Set(),
    notReady: new Set(),
    expiresAt: Date.now() + readyTimeoutSeconds * 1000,
    timeoutId: null,
  };

  // clear the live queue so others can't join while ready check is active
  try {
    clearQueue(interaction.guildId);
    await updateQueueMessage(interaction.guildId);
  } catch (err) {
    // non-fatal
  }

  const message = await interaction.reply({
    embeds: [buildReadyEmbed(session)],
    components: [buildActionRow()],
    fetchReply: true,
  });

  session.messageId = message.id;
  session.timeoutId = setTimeout(() => expireSession(interaction.guildId), readyTimeoutSeconds * 1000);
  sessions.set(interaction.guildId, session);

  return session;
}

function getSession(guildId) {
  return sessions.get(guildId);
}

function clearSession(guildId) {
  const session = sessions.get(guildId);
  if (!session) return;
  clearTimeout(session.timeoutId);
  sessions.delete(guildId);
}

function getParticipant(session, userId) {
  return session.participants.find((player) => player.userId === userId);
}

async function updateSessionMessage(session, channel) {
  try {
    const message = await channel.messages.fetch(session.messageId);
    await message.edit({ embeds: [buildReadyEmbed(session)] });
  } catch (error) {
    console.error('Failed to update ready session message:', error);
  }
}

async function completeSession(session, channel) {
  const message = await channel.messages.fetch(session.messageId);
  const embed = new EmbedBuilder()
    .setTitle('Ready Check Complete')
    .setColor('Green')
    .setDescription('All players are ready! You can now start the match.')
    .addFields(
      { name: 'Ready Players', value: `${session.ready.size}/${session.participants.length}`, inline: true }
    )
    .setTimestamp();

  await message.edit({ embeds: [embed], components: [] });
  clearSession(session.guildId);
  try {
    await updateQueueMessage(session.guildId);
  } catch (err) {
    // non-fatal
  }
}

async function cancelSession(session, channel, reason) {
  const message = await channel.messages.fetch(session.messageId);
  const embed = new EmbedBuilder()
    .setTitle('Ready Check Cancelled')
    .setColor('Red')
    .setDescription(reason)
    .setTimestamp();

  await message.edit({ embeds: [embed], components: [] });
  // restore the original queue
  try {
    setQueue(session.guildId, session.originalQueue || []);
    await updateQueueMessage(session.guildId);
  } catch (err) {
    console.error('Failed to restore queue on cancel:', err);
  }
  clearSession(session.guildId);
}

async function expireSession(guildId) {
  const session = sessions.get(guildId);
  if (!session) return;

  const channel = await sessionChannel(session);
  if (!channel) {
    // if we can't find channel, attempt to restore queue and clear
    try {
      setQueue(guildId, session.originalQueue || []);
      await updateQueueMessage(guildId);
    } catch (err) {
      // ignore
    }
    clearSession(guildId);
    return;
  }

  if (session.ready.size === session.participants.length) {
    await completeSession(session, channel);
    return;
  }

  await cancelSession(session, channel, 'Ready check timed out. Queue has been restored.');
}

async function sessionChannel(session) {
  const guild = await globalClient.guilds.fetch(session.guildId).catch(() => null);
  if (!guild) return null;
  return guild.channels.fetch(session.channelId).catch(() => null);
}

function setClient(client) {
  globalClient = client;
}

async function handleButton(interaction) {
  const session = getSession(interaction.guildId);
  if (!session) {
    return await interaction.reply({ content: 'There is no active ready session.', ephemeral: true });
  }

  const participant = getParticipant(session, interaction.user.id);
  if (!participant) {
    return await interaction.reply({ content: 'Only players in the current queue can participate in this ready check.', ephemeral: true });
  }

  if (interaction.customId === 'ready_accept') {
    session.notReady.delete(interaction.user.id);
    session.ready.add(interaction.user.id);
    await interaction.deferUpdate();

    const channel = await sessionChannel(session);
    if (channel) {
      if (session.ready.size === session.participants.length) {
        await completeSession(session, channel);
      } else {
        await updateSessionMessage(session, channel);
      }
    }
    return;
  }

  if (interaction.customId === 'ready_decline') {
    session.ready.delete(interaction.user.id);
    session.notReady.add(interaction.user.id);
    await interaction.deferUpdate();

    const channel = await sessionChannel(session);
    if (channel) {
      await cancelSession(session, channel, `${participant.name} is not ready. Ready check has been cancelled.`);
    }
    return;
  }
}

module.exports = { createSession, getSession, handleButton, clearSession, cancelSession, setClient };
