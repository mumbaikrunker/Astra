const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTopPlayers } = require('../systems/ratings/leaderboardService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the top rated players'),
  async execute(interaction) {
    const players = await getTopPlayers(10);
    if (!players.length) {
      return interaction.reply({ content: 'No leaderboard data is available yet.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('Astra Leaderboard')
      .setColor('Gold')
      .setDescription(players.map((player, index) => `**${index + 1}. ${player.username}** — ${player.rating} rating (${player.wins}W ${player.losses}L)`).join('\n'))
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
