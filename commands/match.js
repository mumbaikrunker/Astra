const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../utils/listStore');
const { getGuildConfig } = require('../systems/configs/guildConfigService');
const { createMatchFromQueue } = require('../systems/matchmaking/matchFactory');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('match')
    .setDescription('Create a temporary match channel with balanced teams'),
  async execute(interaction) {
    const queue = getQueue(interaction.guildId);

    if (queue.length < 2) {
      const embed = new EmbedBuilder()
        .setTitle('Not enough players')
        .setColor('Red')
        .setDescription('At least two players are required to create a match.')
        .setTimestamp();

      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
      const guildConfig = await getGuildConfig(interaction.guildId);
      const matchSummary = await createMatchFromQueue(interaction, queue, guildConfig.match_lifetime_seconds);
      await interaction.reply({ embeds: [matchSummary.summaryEmbed] });
    } catch (error) {
      console.error('Manual match creation failed:', error);
      const embed = new EmbedBuilder()
        .setTitle('Match Error')
        .setColor('Red')
        .setDescription('Failed to create the match. Please try again later.')
        .setTimestamp();
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
