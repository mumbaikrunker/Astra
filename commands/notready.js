const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../utils/listStore');
const { getSession, cancelSession } = require('../utils/readyManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notready')
    .setDescription('Opt out of the ready check and cancel it'),
  async execute(interaction) {
    const session = getSession(interaction.guildId);

    if (!session) {
      const embed = new EmbedBuilder()
        .setTitle('No Active Ready Check')
        .setColor('Yellow')
        .setDescription('There is no active ready check to cancel.')
        .setTimestamp();
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    const participant = session.participants.find((p) => p.userId === interaction.user.id);
    if (!participant) {
      const embed = new EmbedBuilder()
        .setTitle('Not In Ready Check')
        .setColor('Red')
        .setDescription('Only players in the active ready check may cancel it.')
        .setTimestamp();
      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const channel = interaction.channel;
    await cancelSession(session, channel, `${participant.name} is not ready. The ready check has been cancelled.`);
    await interaction.reply({ content: 'Your not-ready response was received and the ready check has been cancelled.', ephemeral: true });
  },
};
