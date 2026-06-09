const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTopPlayers } = require('../systems/ratings/leaderboardService');

// Helper function to format player data for embeds (not used directly in this version, but good practice)
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

    const medals = ['🥇', '🥈', '🥉']; // Define medals here

    const embed = new EmbedBuilder()
      .setTitle('🏆 Astra Global Leaderboard')
      .setColor('#FFD700') // Gold color for a premium feel
      .setDescription('Discover the elite players dominating the competitive scene!')
      .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 128 })) // Guild icon as thumbnail
      .addFields(
        players.map((player, index) => ({
          name: `${medals[index] || `Rank #${index + 1}`} ${player.username}`,
          value: `**Rating:** ${player.rating} | **Record:** ${player.wins}W - ${player.losses}L (${player.wins + player.losses} games)`,
          inline: false,
        }))
      )
      .setFooter({ text: 'Astra Competitive Leaderboard' })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed]
    });
  }
};