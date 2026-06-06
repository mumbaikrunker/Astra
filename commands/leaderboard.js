const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTopPlayers } = require('../systems/ratings/leaderboardService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the top rated players'),

  async execute(interaction) {
    const players = await getTopPlayers(10);

    if (!players.length) {
      return interaction.reply({
        content: 'No leaderboard data available yet.',
        ephemeral: true
      });
    }

    const medals = ['🥇', '🥈', '🥉'];

    const leaderboardText = players
      .map((player, index) => {
        const badge = medals[index] || `#${index + 1}`;

        const games =
          Number(player.wins) +
          Number(player.losses);

        return `${badge} **${player.username}**
🏆 ${player.rating} Rating
📊 ${player.wins}W-${player.losses}L (${games} games)`;
      })
      .join('\n\n');

    const embed = new EmbedBuilder()
      .setTitle('🏆 Astra Global Leaderboard')
      .setColor(0xf1c40f)
      .setDescription(leaderboardText)
      .setFooter({
        text: 'Top Competitive Players'
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed]
    });
  }
};