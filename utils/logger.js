const { EmbedBuilder } = require('discord.js');
const { getConfig } = require('../systems/configs/configService');

async function logModeration(guild, client, { title, description, fields = [] }) {
  try {
    const channelId = await getConfig(guild.id, 'mod_log_channel');
    const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor('Red').addFields(...fields).setTimestamp();
    if (channelId) {
      const ch = await client.channels.fetch(channelId).catch(() => null);
      if (ch && ch.send) {
        await ch.send({ embeds: [embed] });
        return;
      }
    }
    // fallback to console
    console.log('[MOD LOG]', title, description, fields);
  } catch (err) {
    console.error('Logger failed:', err);
  }
}

module.exports = { logModeration };
