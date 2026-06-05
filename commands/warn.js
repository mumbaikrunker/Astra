const { SlashCommandBuilder } = require('discord.js');
const { createPunishment } = require('../systems/moderation/modService');
const { logModeration } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a warning to a user')
    .addUserOption((o) => o.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for the warning').setRequired(false)),

  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: 'You need Manage Guild permission to warn.', ephemeral: true });
    }
    const target = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const row = await createPunishment({ guildId: interaction.guildId, userId: target.id, username: target.tag, moderatorId: interaction.user.id, type: 'warn', reason });
    await logModeration(interaction.guild, interaction.client, { title: 'User Warned', description: `${target.tag} was warned by ${interaction.user.tag}`, fields: [{ name: 'Reason', value: reason }] });
    return interaction.reply({ content: `Warned ${target.tag}.`, ephemeral: false });
  },
};
