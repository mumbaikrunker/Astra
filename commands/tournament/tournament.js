const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { listTournaments, createTournament } = require('../../systems/tournament/tournamentService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tournament')
    .setDescription('Manage tournaments')
    .addSubcommand((sub) => sub.setName('create').setDescription('Create a tournament'))
    .addSubcommand((sub) => sub.setName('list').setDescription('List tournaments')),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'list') {
      const tournaments = await listTournaments(interaction.guildId);
      const embed = new EmbedBuilder()
        .setTitle('Tournaments')
        .setColor('Purple')
        .setDescription(tournaments.length ? tournaments.map((t) => `• ${t.name} (${t.status})`).join('\n') : 'No tournaments created yet.');
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tournament_create').setLabel('Create Tournament').setStyle(ButtonStyle.Success)
      );
      return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (subcommand === 'create') {
      return interaction.reply({ content: 'Use the create button or the tournament dashboard.', ephemeral: true });
    }

    return interaction.reply({ content: 'Unsupported subcommand.', ephemeral: true });
  },
};
