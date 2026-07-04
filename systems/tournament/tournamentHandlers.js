const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createTournament, getTournament, listTournaments, updateTournament, deleteTournament, createTournamentTeam, getTournamentTeams, createTournamentMatch, listTournamentMatches, updateTournamentMatch } = require('./tournamentService');
const { buildTournamentDashboardEmbed, buildTournamentBracketEmbed, buildTournamentActions } = require('./tournamentUiService');

async function handleTournamentInteraction(interaction) {
  if (!interaction.customId) return false;

  const [action, targetId] = interaction.customId.split(':');

  if (action === 'tournament_dashboard') {
    const tournament = await getTournament(targetId);
    if (!tournament) return interaction.reply({ content: 'Tournament not found.', ephemeral: true });
    const teams = await getTournamentTeams(tournament.id);
    const matches = await listTournamentMatches(tournament.id);
    const embed = buildTournamentDashboardEmbed(tournament, teams, matches);
    return interaction.reply({ embeds: [embed], components: [buildTournamentActions(tournament.id)] });
  }

  if (action === 'tournament_bracket') {
    const tournament = await getTournament(targetId);
    if (!tournament) return interaction.reply({ content: 'Tournament not found.', ephemeral: true });
    const matches = await listTournamentMatches(tournament.id);
    const embed = buildTournamentBracketEmbed(tournament, matches);
    return interaction.reply({ embeds: [embed], components: [buildTournamentActions(tournament.id)] });
  }

  if (action === 'tournament_register') {
    const tournament = await getTournament(targetId);
    if (!tournament) return interaction.reply({ content: 'Tournament not found.', ephemeral: true });
    const modal = new ModalBuilder().setCustomId(`tournament_register_modal:${tournament.id}`).setTitle('Register Team');
    const teamNameInput = new TextInputBuilder().setCustomId('team_name').setLabel('Team Name').setStyle(TextInputStyle.Short).setRequired(true);
    const captainNameInput = new TextInputBuilder().setCustomId('captain_name').setLabel('Captain Name').setStyle(TextInputStyle.Short).setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(teamNameInput), new ActionRowBuilder().addComponents(captainNameInput));
    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith('tournament_register_modal:')) {
    const tournamentId = interaction.customId.split(':')[1];
    const teamName = interaction.fields.getTextInputValue('team_name').trim();
    const captainName = interaction.fields.getTextInputValue('captain_name').trim();
    await createTournamentTeam({ tournamentId, captainId: interaction.user.id, name: teamName, members: [captainName] });
    return interaction.reply({ content: `✅ Team **${teamName}** registered for the tournament.`, ephemeral: true });
  }

  if (action === 'tournament_create') {
    const modal = new ModalBuilder().setCustomId('tournament_create_modal').setTitle('Create Tournament');
    const nameInput = new TextInputBuilder().setCustomId('tournament_name').setLabel('Tournament Name').setStyle(TextInputStyle.Short).setRequired(true);
    const formatInput = new TextInputBuilder().setCustomId('tournament_format').setLabel('Format (single/double/manual)').setStyle(TextInputStyle.Short).setRequired(true);
    const bestOfInput = new TextInputBuilder().setCustomId('best_of').setLabel('Best Of (1/3/5)').setStyle(TextInputStyle.Short).setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(nameInput), new ActionRowBuilder().addComponents(formatInput), new ActionRowBuilder().addComponents(bestOfInput));
    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === 'tournament_create_modal') {
    const name = interaction.fields.getTextInputValue('tournament_name').trim();
    const format = interaction.fields.getTextInputValue('tournament_format').trim().toLowerCase();
    const bestOf = parseInt(interaction.fields.getTextInputValue('best_of'), 10);
    const tournament = await createTournament({ guildId: interaction.guildId, name, format, bestOf, organizerId: interaction.user.id, channelId: interaction.channelId });
    return interaction.reply({ content: `✅ Tournament **${tournament.name}** created.`, ephemeral: true });
  }

  return false;
}

module.exports = { handleTournamentInteraction };
