const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { getGuildConfig, updateGuildConfig, resetGuildConfig } = require('../systems/configs/guildConfigService');

const settings = {
  queue_max_size: {
    label: 'Queue Maximum Size',
    description: 'Maximum number of players allowed in the queue',
    min: 2,
    max: 100,
  },
  default_player_rating: {
    label: 'Default Player Rating',
    description: 'Default rating used when a player does not provide one',
    min: 100,
    max: 3000,
  },
  match_lifetime_seconds: {
    label: 'Match Lifetime',
    description: 'How long temporary match channels remain active',
    min: 60,
    max: 3600,
  },
  ready_timeout_seconds: {
    label: 'Ready Timeout',
    description: 'How long ready checks remain open',
    min: 15,
    max: 600,
  },
};

const settingChoices = Object.entries(settings).map(([key, value]) => ({ name: `${value.label} (${key})`, value: key }));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guildconfig')
    .setDescription('View or update guild-specific matchmaking settings')
    .addSubcommand((sub) =>
      sub
        .setName('view')
        .setDescription('View the current guild configuration')
    )
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Update a guild configuration setting')
        .addStringOption((option) =>
          option
            .setName('setting')
            .setDescription('The setting to update')
            .setRequired(true)
            .addChoices(...settingChoices)
        )
        .addIntegerOption((option) =>
          option
            .setName('value')
            .setDescription('The new value for the selected setting')
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset')
        .setDescription('Reset all guild configuration settings to defaults')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildConfig = await getGuildConfig(interaction.guildId);

    if (subcommand === 'view') {
      const embed = new EmbedBuilder()
        .setTitle('Guild Configuration')
        .setColor('Blue')
        .addFields(
          { name: 'Queue Maximum Size', value: `${guildConfig.queue_max_size}`, inline: true },
          { name: 'Default Player Rating', value: `${guildConfig.default_player_rating}`, inline: true },
          { name: 'Match Lifetime', value: `${guildConfig.match_lifetime_seconds} seconds`, inline: true },
          { name: 'Ready Timeout', value: `${guildConfig.ready_timeout_seconds} seconds`, inline: true }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'set') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return interaction.reply({ content: 'You need Manage Guild permission to update guild settings.', ephemeral: true });
      }

      const settingKey = interaction.options.getString('setting', true);
      const value = interaction.options.getInteger('value', true);
      const setting = settings[settingKey];

      if (!setting) {
        return interaction.reply({ content: 'Unknown setting specified.', ephemeral: true });
      }

      if (!Number.isInteger(value) || value < setting.min || value > setting.max) {
        return interaction.reply({ content: `Value must be an integer between ${setting.min} and ${setting.max}.`, ephemeral: true });
      }

      let updatedConfig;
      try {
        updatedConfig = await updateGuildConfig(interaction.guildId, settingKey, value);
      } catch (error) {
        console.error('Failed to update guild config:', error);
        return interaction.reply({ content: 'Could not update the configuration. Please try again later.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('Guild Configuration Updated')
        .setColor('Green')
        .setDescription(`Updated **${setting.label}** to **${value}**.`)
        .addFields({ name: 'Setting', value: settingKey, inline: true }, { name: 'New Value', value: `${value}`, inline: true })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'reset') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return interaction.reply({ content: 'You need Manage Guild permission to reset guild settings.', ephemeral: true });
      }

      let resetConfig;
      try {
        resetConfig = await resetGuildConfig(interaction.guildId);
      } catch (error) {
        console.error('Failed to reset guild config:', error);
        return interaction.reply({ content: 'Could not reset the configuration. Please try again later.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('Guild Configuration Reset')
        .setColor('Green')
        .setDescription('All guild settings have been reset to default values.')
        .addFields(
          { name: 'Queue Maximum Size', value: `${resetConfig.queue_max_size}`, inline: true },
          { name: 'Default Player Rating', value: `${resetConfig.default_player_rating}`, inline: true },
          { name: 'Match Lifetime', value: `${resetConfig.match_lifetime_seconds} seconds`, inline: true },
          { name: 'Ready Timeout', value: `${resetConfig.ready_timeout_seconds} seconds`, inline: true }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    return interaction.reply({ content: 'Unsupported subcommand.', ephemeral: true });
  },
};