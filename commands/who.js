const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../utils/listStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('who')
    .setDescription('Show current queue entries'),
  async execute(interaction) {
    const queue = getQueue(interaction.guildId);

    const embed = new EmbedBuilder()
      .setTitle('Current Queue')
      .setColor('Blue')
      .setDescription(
        queue.length
          ? queue.map((entry, index) => `${index + 1}. **${entry.name}** — Rating: ${entry.rating}`).join('\n')
          : 'The queue is currently empty.'
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
