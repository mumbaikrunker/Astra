const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ensureUser } = require('../systems/users/userService');
const { getUserProfile } = require('../systems/ratings/leaderboardService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Show detailed player statistics'),

  async execute(interaction) {
    await ensureUser(
      interaction.user.id,
      interaction.user.username
    );

    const userData = await getUserProfile(interaction.user.id);

    if (!userData) {
      return interaction.reply({
        content: 'No profile data found.',
        ephemeral: true
      });
    }

    const totalGames = userData.wins + userData.losses;

    const winRate =
      totalGames > 0
        ? ((userData.wins / totalGames) * 100).toFixed(1)
        : '0.0';

    const createdDate = new Date(userData.created_at);

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${userData.username}'s Profile`)
      .setColor(0x3498db)
      .addFields(
        {
          name: '🏆 Rating',
          value: `${userData.rating}`,
          inline: true
        },
        {
          name: '📈 Rank',
          value: `#${userData.rank}`,
          inline: true
        },
        {
          name: '🔥 Winstreak',
          value: `${userData.winstreak}`,
          inline: true
        },
        {
          name: '✅ Wins',
          value: `${userData.wins}`,
          inline: true
        },
        {
          name: '❌ Losses',
          value: `${userData.losses}`,
          inline: true
        },
        {
          name: '🎯 Win Rate',
          value: `${winRate}%`,
          inline: true
        },
        {
          name: '🎮 Matches Played',
          value: `${totalGames}`,
          inline: true
        },
        {
          name: '📅 Joined Database',
          value: `<t:${Math.floor(createdDate.getTime() / 1000)}:D>`,
          inline: true
        }
      )
      .setFooter({
        text: 'Astra Competitive Profile'
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed]
    });
  }
};