const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ensureUser } = require('../systems/users/userService');
const { getUserHistory } = require('../systems/ratings/leaderboardService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('View your recent match history'),

  async execute(interaction) {
    try {
      await ensureUser(
        interaction.user.id,
        interaction.user.username
      );

      const history = await getUserHistory(
        interaction.user.id,
        10
      );

      if (!history.length) {
        return interaction.reply({
          content: 'No match history found.',
          ephemeral: true
        });
      }

      const historyText = history
        .map(entry => {
          const icon = entry.delta >= 0 ? '✅' : '❌';
          const delta = entry.delta >= 0
            ? `+${entry.delta}`
            : `${entry.delta}`;

          return `${icon} ${delta} Rating (${entry.old_rating} → ${entry.new_rating})`;
        })
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setAuthor({
          name: '📜 ASTRA Match History'
        })
        .setThumbnail(
          interaction.user.displayAvatarURL({
            size: 256
          })
        )
        .setDescription(historyText)
        .setFooter({
          text: `Showing last ${history.length} rating changes`
        })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed]
      });

    } catch (error) {
      console.error('History command error:', error);

      if (!interaction.replied) {
        await interaction.reply({
          content: 'An error occurred while loading match history.',
          ephemeral: true
        });
      }
    }
  }
};