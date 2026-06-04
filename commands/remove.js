const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { removeItem } = require('../utils/listStore');
const queueManager = require('../utils/queueManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a name from the queue')
    .addStringOption((option) =>
      option
        .setName('entry')
        .setDescription('Name to remove from the queue')
        .setRequired(true)
    ),
  async execute(interaction) {
    const entry = interaction.options.getString('entry', true).trim();
    const removed = removeItem(interaction.guildId, entry);

    const embed = new EmbedBuilder()
      .setTitle(removed ? 'Entry Removed' : 'Entry Not Found')
      .setColor(removed ? 'Red' : 'DarkRed')
      .setDescription(
        removed
          ? `Removed **${entry}** from the queue.`
          : `Could not find **${entry}** in the queue.`
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    try {
      queueManager.setClient(interaction.client);
      await queueManager.upsertQueueMessage(interaction);
    } catch (err) {
      console.error('Failed to update live queue message after remove:', err);
    }
  },
};
