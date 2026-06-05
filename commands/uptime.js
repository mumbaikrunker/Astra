const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    return 'Unavailable';
  }

  const days = Math.floor(milliseconds / DAY);
  const hours = Math.floor((milliseconds % DAY) / HOUR);
  const minutes = Math.floor((milliseconds % HOUR) / MINUTE);
  const seconds = Math.floor((milliseconds % MINUTE) / SECOND);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || parts.length) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(' ');
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return 'Unavailable';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Show bot uptime and runtime health information'),

  async execute(interaction) {
    const clientUptime = interaction.client?.uptime;
    const processUptime = process.uptime() * SECOND;
    const memoryUsage = process.memoryUsage();

    const embed = new EmbedBuilder()
      .setTitle('Astra Uptime')
      .setColor('Green')
      .addFields(
        {
          name: 'Bot Uptime',
          value: formatDuration(clientUptime),
          inline: true,
        },
        {
          name: 'Process Uptime',
          value: formatDuration(processUptime),
          inline: true,
        },
        {
          name: 'API Latency',
          value: `${Math.round(interaction.client.ws.ping)}ms`,
          inline: true,
        },
        {
          name: 'Memory Usage',
          value: formatBytes(memoryUsage.rss),
          inline: true,
        },
        {
          name: 'Node.js',
          value: process.version,
          inline: true,
        },
        {
          name: 'Status',
          value: interaction.client.isReady() ? 'Online' : 'Starting',
          inline: true,
        }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};