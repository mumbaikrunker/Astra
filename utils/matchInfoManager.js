const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getMatch, updateMatchStatus } = require('../systems/matchmaking/matchService');
const { applyMatchRatings } = require('../systems/ratings/ratingService');

function buildMatchInfoEmbed(match) {
  const fields = [
    { name: 'Match Channel', value: `${match.match_name || 'Unknown'}`, inline: false },
    { name: 'Host', value: `<@${match.creator_id}>`, inline: false },
    { name: 'Team A', value: formatTeamList(match.team_a), inline: true },
    { name: 'Team B', value: formatTeamList(match.team_b), inline: true },
  ];

  if (match.result) {
    const score = match.result.score ? `${match.result.score.a} - ${match.result.score.b}` : 'N/A';
    fields.unshift({ name: 'Result', value: `${match.result.winner || 'Unknown'} (${score})`, inline: false });
  }

  return new EmbedBuilder()
    .setTitle('Match Info')
    .setColor('Purple')
    .setDescription(`Match ID: **${match.id}**\nStatus: **${match.status}**`)
    .addFields(fields)
    .setTimestamp();
}

function formatTeamList(team) {
  if (!team.length) return 'No players assigned';
  return team.map((player, index) => `${index + 1}. **${player.name}** — ${player.rating}`).join('\n');
}

function buildActionRow(matchId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`matchinfo_a:${matchId}`)
      .setLabel('Team A Win')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`matchinfo_b:${matchId}`)
      .setLabel('Team B Win')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`matchinfo_tie:${matchId}`)
      .setLabel('Tie')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`matchinfo_cancel:${matchId}`)
      .setLabel('Cancel Match')
      .setStyle(ButtonStyle.Danger)
  );
}

async function handleMatchInfoButton(interaction) {
  const [action, matchId] = interaction.customId.split(':');
  const match = await getMatch(matchId);
  if (!match) {
    return interaction.reply({ content: 'Match not found.', ephemeral: true });
  }
  if (match.status !== 'active') {
    return interaction.reply({ content: 'This match is no longer active.', ephemeral: true });
  }

  const isModerator = interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild);
  const isHost = interaction.user.id === match.creator_id;
  if (!isModerator && !isHost) {
    return interaction.reply({ content: 'Only the match host or moderators can resolve this match.', ephemeral: true });
  }

  if (action === 'matchinfo_cancel') {
    await updateMatchStatus(matchId, 'cancelled', { cancelledBy: interaction.user.tag });
    await interaction.update({ content: 'Match has been cancelled.', embeds: [], components: [] });
    return;
  }

  const outcome = action === 'matchinfo_a' ? 'A' : action === 'matchinfo_b' ? 'B' : 'TIE';
  const scoreA = outcome === 'A' ? 1 : outcome === 'B' ? 0 : 0;
  const scoreB = outcome === 'B' ? 1 : outcome === 'A' ? 0 : 0;

  const ratingChanges = await applyMatchRatings(matchId, match.team_a, match.team_b, outcome);
  await updateMatchStatus(matchId, 'complete', {
    winner: outcome === 'A' ? 'Team A' : outcome === 'B' ? 'Team B' : 'Tie',
    score: { a: scoreA, b: scoreB },
    resolvedBy: interaction.user.tag,
  });

  const resultEmbed = new EmbedBuilder()
    .setTitle('Match Resolved')
    .setColor('Green')
    .setDescription(`Match **${matchId}** has been resolved as **${outcome === 'A' ? 'Team A' : outcome === 'B' ? 'Team B' : 'Tie'}**.`)
    .addFields(
      { name: 'ELO Changes', value: ratingChanges.map((change) => `${change.name}: ${change.oldRating} ➜ ${change.newRating} (${change.delta >= 0 ? '+' : ''}${change.delta})`).join('\n') }
    )
    .setTimestamp();

  await interaction.update({ content: null, embeds: [resultEmbed], components: [] });
}

module.exports = { buildMatchInfoEmbed, buildActionRow, handleMatchInfoButton };
