const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getMatch, updateMatchStatus } = require('../systems/matchmaking/matchService');
const { applyMatchRatings } = require('../systems/ratings/ratingService');

const pendingReports = new Map();

function buildConfirmationEmbed(report) {
  return new EmbedBuilder()
    .setTitle('Confirm Match Report')
    .setColor('Orange')
    .setDescription(`Please confirm the result for match **${report.matchId}**.`)
    .addFields(
      { name: 'Winner', value: report.winnerLabel, inline: true },
      { name: 'Score', value: `${report.scoreA} - ${report.scoreB}`, inline: true },
      { name: 'Reported by', value: report.reporterTag, inline: false }
    )
    .setTimestamp();
}

function buildActionRow(reportId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`report_confirm:${reportId}`)
      .setLabel('Confirm')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`report_cancel:${reportId}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger)
  );
}

function createPendingReport(interaction, reportData) {
  const reportId = `${interaction.user.id}-${Date.now()}`;
  pendingReports.set(reportId, {
    ...reportData,
    reporterId: interaction.user.id,
    reporterTag: interaction.user.tag,
    createdAt: Date.now(),
  });
  return reportId;
}

async function handleReportButton(interaction) {
  const [action, reportId] = interaction.customId.split(':');
  const report = pendingReports.get(reportId);
  if (!report) {
    return interaction.reply({ content: 'This report is no longer valid.', ephemeral: true });
  }
  if (report.reporterId !== interaction.user.id && !interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
    return interaction.reply({ content: 'Only the reporter or a moderator may confirm this report.', ephemeral: true });
  }

  if (action === 'report_cancel') {
    pendingReports.delete(reportId);
    await interaction.update({ content: 'Match report cancelled.', embeds: [], components: [] });
    return;
  }

  if (action !== 'report_confirm') {
    return interaction.reply({ content: 'Unknown report action.', ephemeral: true });
  }

  if (report.handled) {
    return interaction.reply({ content: 'This report has already been handled.', ephemeral: true });
  }

  report.handled = true;
  pendingReports.delete(reportId);

  const match = await getMatch(report.matchId);
  if (!match || match.status !== 'active') {
    await interaction.update({ content: 'The match is no longer active or could not be found.', embeds: [], components: [] });
    return;
  }

  const outcome = report.winner === 'a' ? 'A' : report.winner === 'b' ? 'B' : 'TIE';
  const ratingChanges = await applyMatchRatings(report.matchId, report.teamA, report.teamB, outcome);
  await updateMatchStatus(report.matchId, 'complete', {
    winner: report.winnerLabel,
    score: { a: report.scoreA, b: report.scoreB },
  });

  const resultEmbed = new EmbedBuilder()
    .setTitle('Match Report Complete')
    .setColor('Green')
    .setDescription(`Match **${report.matchId}** has been finalized.`)
    .addFields(
      { name: 'Winner', value: report.winnerLabel, inline: true },
      { name: 'Final Score', value: `${report.scoreA} - ${report.scoreB}`, inline: true },
      { name: 'Rating Changes', value: ratingChanges.map((change) => `${change.name}: ${change.oldRating} ➜ ${change.newRating} (${change.delta >= 0 ? '+' : ''}${change.delta})`).join('\n') }
    )
    .setTimestamp();

  await interaction.update({ content: null, embeds: [resultEmbed], components: [] });
}

module.exports = { createPendingReport, buildConfirmationEmbed, buildActionRow, handleReportButton };
