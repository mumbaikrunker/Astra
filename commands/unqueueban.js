const { SlashCommandBuilder } = require('discord.js');
const { removePunishment, getActivePunishment } = require('../systems/moderation/modService');
const { logModeration } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unqueueban')
    .setDescription('Remove a queue ban from a user')
    .addUserOption((o) => o.setName('user').setDescription('User to unban').setRequired(true)),

  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: 'You need Manage Guild permission to unqueueban.', ephemeral: true });
    }
    const target = interaction.options.getUser('user', true);
    const existing = await getActivePunishment(interaction.guildId, target.id, 'queueban');
    if (!existing) return interaction.reply({ content: 'No queue ban found for that user.', ephemeral: true });

    const removed = await removePunishment(interaction.guildId, target.id, 'queueban');
    await logModeration(interaction.guild, interaction.client, { title: 'Queue Ban Removed', description: `${target.tag} was unqueuebanned by ${interaction.user.tag}` });
    return interaction.reply({ content: `Removed queue ban for ${target.tag}.` });
  },
};
