const { SlashCommandBuilder } = require('discord.js');
const { createPunishment } = require('../systems/moderation/modService');
const { logModeration } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Apply a temporary timeout to a user')
    .addUserOption((o) => o.setName('user').setDescription('User to timeout').setRequired(true))
    .addIntegerOption((o) => o.setName('minutes').setDescription('Duration in minutes').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason for timeout').setRequired(false)),

  async execute(interaction) {
    if (!interaction.member.permissions.has('ModerateMembers')) {
      return interaction.reply({ content: 'You need Moderate Members permission to timeout users.', ephemeral: true });
    }
    const target = interaction.options.getUser('user', true);
    const minutes = interaction.options.getInteger('minutes', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const lengthSeconds = minutes * 60;

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'Could not find that member in the guild.', ephemeral: true });

    try {
      await member.timeout(minutes * 60 * 1000, reason);
    } catch (err) {
      console.error('Failed to timeout member:', err);
      return interaction.reply({ content: 'Failed to apply timeout. Check bot permissions.', ephemeral: true });
    }

    const row = await createPunishment({ guildId: interaction.guildId, userId: target.id, moderatorId: interaction.user.id, type: 'timeout', reason, lengthSeconds });
    await logModeration(interaction.guild, interaction.client, { title: 'Member Timed Out', description: `${target.tag} was timed out by ${interaction.user.tag} for ${minutes} minutes`, fields: [{ name: 'Reason', value: reason }] });
    return interaction.reply({ content: `Timed out ${target.tag} for ${minutes} minutes.`, ephemeral: false });
  },
};
