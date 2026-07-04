const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function buildTournamentDashboardEmbed(tournament, teams = [], matches = []) {
  const embed = new EmbedBuilder()
    .setTitle(`🏆 ${tournament.name}`)
    .setColor('Purple')
    .setDescription(`Format: **${tournament.format}**\nBest Of: **${tournament.best_of}**\nStatus: **${tournament.status}**`)
    .addFields(
      { name: 'Teams', value: `${teams.length}`, inline: true },
      { name: 'Matches', value: `${matches.length}`, inline: true },
      { name: 'Organizer', value: `<@${tournament.organizer_id}>`, inline: false }
    )
    .setTimestamp();

  if (teams.length) {
    embed.addFields({
      name: 'Registered Teams',
      value: teams.map((team) => `• ${team.name} (${team.status})`).join('\n'),
      inline: false,
    });
  }

  return embed;
}

function buildTournamentBracketEmbed(tournament, matches = []) {
  const embed = new EmbedBuilder()
    .setTitle(`Bracket • ${tournament.name}`)
    .setColor('Blue')
    .setDescription('Live tournament bracket')
    .setTimestamp();

  if (!matches.length) {
    embed.addFields({ name: 'Matches', value: 'No matches generated yet.', inline: false });
    return embed;
  }

  const lines = matches.map((match) => `R${match.round_number} M${match.match_number}: ${match.team_a_id || 'TBD'} vs ${match.team_b_id || 'TBD'} (${match.status})`);
  embed.addFields({ name: 'Matches', value: lines.join('\n'), inline: false });
  return embed;
}

function buildTournamentActions(tournamentId) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`tournament_dashboard:${tournamentId}`).setLabel('Dashboard').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`tournament_bracket:${tournamentId}`).setLabel('Bracket').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`tournament_register:${tournamentId}`).setLabel('Register').setStyle(ButtonStyle.Success)
  );
  return row;
}

module.exports = {
  buildTournamentDashboardEmbed,
  buildTournamentBracketEmbed,
  buildTournamentActions,
};
