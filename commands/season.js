const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { createSeason, startSeason, endSeason, listSeasons } = require('../systems/seasons/seasonsService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('season')
    .setDescription('Season management commands')
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create a new season')
        .addStringOption((o) =>
          o.setName('name').setDescription('Season name').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Start an existing season')
        .addIntegerOption((o) =>
          o.setName('id').setDescription('Season ID').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('end')
        .setDescription('End a season')
        .addIntegerOption((o) =>
          o.setName('id').setDescription('Season ID').setRequired(true)
        )
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('List seasons for this guild')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return interaction.reply({ content: 'You need Manage Guild permission to create seasons.', ephemeral: true });
      }
      const name = interaction.options.getString('name', true).trim();
      const season = await createSeason(interaction.guildId, name);
      const embed = new EmbedBuilder().setTitle('Season Created').setColor('Green').setDescription(`Created season **${season.name}** (ID: ${season.id})`).setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'start') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return interaction.reply({ content: 'You need Manage Guild permission to start seasons.', ephemeral: true });
      }
      const id = interaction.options.getInteger('id', true);
      const started = await startSeason(id);
      if (!started) return interaction.reply({ content: 'Season not found.', ephemeral: true });
      return interaction.reply({ content: `Season **${started.name}** started.` });
    }

    if (sub === 'end') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return interaction.reply({ content: 'You need Manage Guild permission to end seasons.', ephemeral: true });
      }
      const id = interaction.options.getInteger('id', true);
      const ended = await endSeason(id);
      if (!ended) return interaction.reply({ content: 'Season not found.', ephemeral: true });
      return interaction.reply({ content: `Season **${ended.name}** ended.` });
    }

    if (sub === 'list') {
      const seasons = await listSeasons(interaction.guildId);
      const embed = new EmbedBuilder().setTitle('Seasons').setColor('Blue').setDescription(
        seasons.length ? seasons.map((s) => `ID: **${s.id}** — **${s.name}** — Status: ${s.status}`).join('\n') : 'No seasons found.'
      ).setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
