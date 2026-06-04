const { EmbedBuilder } = require('discord.js');
const { getQueue } = require('./listStore');

let globalClient = null;
const guildMessages = new Map();

function setClient(client) {
  globalClient = client;
}

function buildQueueEmbed(guildId) {
  const queue = getQueue(guildId);
  const embed = new EmbedBuilder()
    .setTitle('Live Queue')
    .setColor('Blue')
    .setDescription(
      queue.length
        ? queue.map((entry, index) => `${index + 1}. **${entry.name}** — Rating: ${entry.rating}`).join('\n')
        : 'The queue is currently empty.'
    )
    .setTimestamp();
  return embed;
}

async function upsertQueueMessage(interaction) {
  if (!globalClient) setClient(interaction.client);
  const guildId = interaction.guildId;
  const channelId = interaction.channelId;

  const key = guildId;
  const data = guildMessages.get(key) || { channelId, messageId: null };
  data.channelId = channelId;

  try {
    const channel = await interaction.client.channels.fetch(channelId);
    if (!channel) return null;

    const embed = buildQueueEmbed(guildId);

    if (data.messageId) {
      const msg = await channel.messages.fetch(data.messageId).catch(() => null);
      if (msg) {
        await msg.edit({ embeds: [embed] });
        guildMessages.set(key, data);
        return msg;
      }
    }

    const sent = await channel.send({ embeds: [embed] });
    data.messageId = sent.id;
    guildMessages.set(key, data);
    return sent;
  } catch (error) {
    console.error('Failed to upsert queue message:', error);
    return null;
  }
}

async function updateQueueMessage(guildId) {
  const data = guildMessages.get(guildId);
  if (!data) return null;
  if (!globalClient) return null;
  try {
    const channel = await globalClient.channels.fetch(data.channelId).catch(() => null);
    if (!channel) return null;
    const embed = buildQueueEmbed(guildId);
    const msg = await channel.messages.fetch(data.messageId).catch(() => null);
    if (msg) {
      await msg.edit({ embeds: [embed] });
      return msg;
    }
    const sent = await channel.send({ embeds: [embed] });
    data.messageId = sent.id;
    guildMessages.set(guildId, data);
    return sent;
  } catch (error) {
    console.error('Failed to update queue message:', error);
    return null;
  }
}

module.exports = { setClient, upsertQueueMessage, updateQueueMessage };
