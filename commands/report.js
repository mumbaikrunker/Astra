const { SlashCommandBuilder } = require('discord.js');
const { getMatch } = require('../systems/matchmaking/matchService');
const { createPendingReport, buildConfirmationEmbed, buildActionRow } = require('../utils/reportManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Submit a match result for confirmation and ELO updates')
    .addStringOption((option) =>
      option.setName('match_id').setDescription('The ID of the match to report').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('winner')
        .setDescription('The winning team or a tie')
        .setRequired(true)
        .addChoices(
          { name: 'Team A', value: 'a' },
          { name: 'Team B', value: 'b' },
          { name: 'Tie', value: 'tie' }
        )
    )
    .addIntegerOption((option) =>
      option.setName('score_a').setDescription('Score for Team A').setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName('score_b').setDescription('Score for Team B').setRequired(true)
    ),
  async execute(interaction) {
    const matchId = interaction.options.getString('match_id', true).trim();
    const winner = interaction.options.getString('winner', true);
    const scoreA = interaction.options.getInteger('score_a', true);
    const scoreB = interaction.options.getInteger('score_b', true);

    if (scoreA < 0 || scoreB < 0) {
      return interaction.reply({ content: 'Scores must be zero or greater.', ephemeral: true });
    }

    if (scoreA === scoreB && winner !== 'tie') {
      return interaction.reply({ content: 'If the score is tied, the winner must be set to Tie.', ephemeral: true });
    }
    if (scoreA > scoreB && winner === 'b') {
      return interaction.reply({ content: 'The winner does not match the score. Choose Team A or Tie.', ephemeral: true });
    }
    if (scoreB > scoreA && winner === 'a') {
      return interaction.reply({ content: 'The winner does not match the score. Choose Team B or Tie.', ephemeral: true });
    }

    const match = await getMatch(matchId);
    if (!match) {
      return interaction.reply({ content: 'Could not find a match with that ID.', ephemeral: true });
    }
    if (match.status !== 'active') {
      return interaction.reply({ content: 'That match is not active and cannot be reported.', ephemeral: true });
    }

    const winnerLabel = winner === 'a' ? 'Team A' : winner === 'b' ? 'Team B' : 'Tie';
    const reportId = createPendingReport(interaction, {
      matchId,
      teamA: match.team_a,
      teamB: match.team_b,
      winner,
      winnerLabel,
      scoreA,
      scoreB,
    });

    const embed = buildConfirmationEmbed({ matchId, winnerLabel, scoreA, scoreB, reporterTag: interaction.user.tag });
    const row = buildActionRow(reportId);

    await interaction.reply({ content: 'Please confirm the reported match result:', embeds: [embed], components: [row], ephemeral: true });
  },
};
