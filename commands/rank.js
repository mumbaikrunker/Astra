const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserRank } = require('../systems/ratings/leaderboardService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show your current rating and leaderboard position'),
  async execute(interaction) {
    const userData = await getUserRank(interaction.user.id);
    if (!userData) {
      return interaction.reply({ content: 'No rating data was found for you yet.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`${userData.username}'s Rating`) 
      .setColor('Blue')
      .addFields(
        { name: 'Rank', value: `#${userData.rank}`, inline: true },
        { name: 'Rating', value: `${userData.rating}`, inline: true },
        { name: 'Record', value: `${userData.wins}W / ${userData.losses}L`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
