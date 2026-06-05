const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserProfile } = require('../systems/ratings/leaderboardService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Show detailed player statistics')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Player to view')
        .setRequired(false)
    ),

  async execute(interaction) {
    const target =
      interaction.options.getUser('user') || interaction.user;

    const profile = await getUserProfile(target.id);

    if (!profile) {
      return interaction.reply({
        content: 'No player statistics were found.',
        ephemeral: true,
      });
    }

    const totalGames = profile.wins + profile.losses;

    const winRate =
      totalGames > 0
        ? ((profile.wins / totalGames) * 100).toFixed(1)
        : '0.0';

    const embed = new EmbedBuilder()
      .setTitle(`${profile.username}'s Profile`)
      .setColor('Blue')
      .addFields(
        {
          name: 'Rank',
          value: `#${profile.rank}`,
          inline: true,
        },
        {
          name: 'Rating',
          value: `${profile.rating}`,
          inline: true,
        },
        {
          name: 'Win Rate',
          value: `${winRate}%`,
          inline: true,
        },
        {
          name: 'Wins',
          value: `${profile.wins}`,
          inline: true,
        },
        {
          name: 'Losses',
          value: `${profile.losses}`,
          inline: true,
        },
        {
          name: 'Current Streak',
          value: `${profile.winstreak}`,
          inline: true,
        },
        {
          name: 'Total Games',
          value: `${totalGames}`,
          inline: true,
        },
        {
          name: 'Joined',
          value: `<t:${Math.floor(
            new Date(profile.created_at).getTime() / 1000
          )}:D>`,
          inline: true,
        }
      )
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
    });
  },
};