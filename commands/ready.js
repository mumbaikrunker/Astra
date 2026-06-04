const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../utils/listStore');
const { createSession, getSession, setClient } = require('../utils/readyManager');
const { getGuildConfig } = require('../systems/configs/guildConfigService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ready')
    .setDescription('Start a ready check for players in the current queue'),
  async execute(interaction) {
    const queue = getQueue(interaction.guildId);
    const activeSession = getSession(interaction.guildId);

    if (activeSession) {
      const embed = new EmbedBuilder()
        .setTitle('Ready Check Already Active')
        .setColor('Yellow')
        .setDescription('A ready check is already in progress. Use the buttons in the message or /notready to cancel.')
        .setTimestamp();
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (queue.length < 2) {
      const embed = new EmbedBuilder()
        .setTitle('Not Enough Players')
        .setColor('Red')
        .setDescription('At least two queue players are required to start a ready check.')
        .setTimestamp();
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const guildConfig = await getGuildConfig(interaction.guildId);
    const session = await createSession(interaction, queue, guildConfig.ready_timeout_seconds);
    if (!session) {
      const embed = new EmbedBuilder()
        .setTitle('Unable to Start Ready Check')
        .setColor('Red')
        .setDescription('There was already an active ready session.')
        .setTimestamp();
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    setClient(interaction.client);
  },
};
