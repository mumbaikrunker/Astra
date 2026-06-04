const { SlashCommandBuilder } = require('discord.js');
const { getMatch } = require('../systems/matchmaking/matchService');
const { buildMatchInfoEmbed, buildActionRow } = require('../utils/matchInfoManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('matchinfo')
    .setDescription('Post a match info panel with team buttons for match resolution')
    .addStringOption((option) =>
      option.setName('match_id').setDescription('The match ID to create an info panel for').setRequired(true)
    ),
  async execute(interaction) {
    const matchId = interaction.options.getString('match_id', true).trim();
    const match = await getMatch(matchId);

    if (!match) {
      return interaction.reply({ content: 'Could not find that match.', ephemeral: true });
    }
    if (match.status !== 'active') {
      return interaction.reply({ content: 'This match is not active.', ephemeral: true });
    }

    const embed = buildMatchInfoEmbed(match);
    const row = buildActionRow(matchId);

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
