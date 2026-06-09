const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ensureUser } = require('../systems/users/userService');
const { getUserRank } = require('../systems/ratings/leaderboardService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show your current rating and leaderboard position'),

  async execute(interaction) {
    await ensureUser(
      interaction.user.id,
      interaction.user.username
    );

    const userData = await getUserRank(interaction.user.id);

    if (!userData) {
      return interaction.reply({
        content: 'No rating data found.',
        ephemeral: true
      });
    }

    const totalGames = userData.wins + userData.losses;

    const embed = new EmbedBuilder()
      .setTitle(`🏅 ${interaction.user.username}'s Competitive Rank`)
      .setColor('#FFD700') // Gold color
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }))
      .setDescription(`Your current competitive standing in Astra.`)
      .addFields(
        {
          name: '📈 Leaderboard Rank',
          value: `#${userData.rank}`,
          inline: true
        },
        {
          name: '🏆 Rating',
          value: `${userData.rating}`,
          inline: true
        },
        {
          name: '🎮 Games Played',
          value: `${totalGames}`,
          inline: true
        },
        {
          name: '📊 Record',
          value: `${userData.wins}W / ${userData.losses}L`,
          inline: false
        }
      )
      .setFooter({
        text: 'Astra Ranked System'
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed]
    });
  }
};