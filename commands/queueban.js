const { SlashCommandBuilder } = require('discord.js');
const { createPunishment, getActivePunishment } = require('../systems/moderation/modService');
const { logModeration } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queueban')
    .setDescription('Ban a user from joining queues')
    .addUserOption((o) => o.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the ban').setRequired(false))
    .addIntegerOption((o) => o.setName('minutes').setDescription('Optional duration in minutes').setRequired(false)),

  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: 'You need Manage Guild permission to queueban.', ephemeral: true });
    }
    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const minutes = interaction.options.getInteger('minutes');
    const lengthSeconds = minutes ? minutes * 60 : null;

    const existing = await getActivePunishment(interaction.guildId, target.id, 'queueban');
    if (existing) {
      return interaction.reply({ content: 'That user already has an active queue ban.', ephemeral: true });
    }

    const row = await createPunishment({ guildId: interaction.guildId, userId: target.id, moderatorId: interaction.user.id, type: 'queueban', reason, lengthSeconds });

    await logModeration(interaction.guild, interaction.client, { title: 'Queue Ban Issued', description: `${target.tag} was queue-banned by ${interaction.user.tag}`, fields: [{ name: 'Reason', value: reason, inline: false }] });

    return interaction.reply({ content: `Queue ban issued for ${target.tag}.`, ephemeral: false });
  },
};
