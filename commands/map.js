const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { createMap, deleteMap, listMaps } = require('../systems/maps/mapsService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('map')
    .setDescription('Map management commands')
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create a new map entry')
        .addStringOption((opt) => opt.setName('name').setDescription('Map name').setRequired(true))
        .addStringOption((opt) => opt.setName('pool').setDescription('Map pool').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('delete')
        .setDescription('Delete a map by ID')
        .addIntegerOption((opt) => opt.setName('id').setDescription('Map ID').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('List maps for this guild')
        .addStringOption((opt) => opt.setName('pool').setDescription('Optional pool to filter'))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return interaction.reply({ content: 'You need Manage Guild permission to create maps.', ephemeral: true });
      }
      const name = interaction.options.getString('name', true).trim();
      const pool = interaction.options.getString('pool') ?? 'default';
      const map = await createMap(interaction.guildId, name, pool, interaction.user.tag);
      const embed = new EmbedBuilder().setTitle('Map Created').setColor('Green').setDescription(`Created map **${map.name}** (ID: ${map.id}) in pool **${map.pool}**`).setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'delete') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return interaction.reply({ content: 'You need Manage Guild permission to delete maps.', ephemeral: true });
      }
      const id = interaction.options.getInteger('id', true);
      const deleted = await deleteMap(interaction.guildId, id);
      if (!deleted) return interaction.reply({ content: 'Map not found or could not be deleted.', ephemeral: true });
      const embed = new EmbedBuilder().setTitle('Map Deleted').setColor('Red').setDescription(`Deleted map **${deleted.name}** (ID: ${deleted.id})`).setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'list') {
      const pool = interaction.options.getString('pool');
      const maps = await listMaps(interaction.guildId, pool);
      const embed = new EmbedBuilder().setTitle('Map List').setColor('Blue').setDescription(
        maps.length
          ? maps.map((m) => `ID: **${m.id}** — **${m.name}** (Pool: ${m.pool})`).join('\n')
          : 'No maps found for this guild.'
      ).setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
