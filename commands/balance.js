const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../utils/listStore');
const { balanceTeams, formatTeamField } = require('../utils/matchMaker');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Balance two teams automatically using player ratings'),
  async execute(interaction) {
    const queue = getQueue(interaction.guildId);

    if (queue.length < 2) {
      const embed = new EmbedBuilder()
        .setTitle('Not enough players')
        .setColor('Red')
        .setDescription('At least two players are required to balance teams.')
        .setTimestamp();

      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const { teamA, teamB } = balanceTeams(queue);
    const difference = Math.abs(teamA.total - teamB.total);
    const embed = new EmbedBuilder()
      .setTitle('Balanced Teams')
      .setColor('Green')
      .addFields(
        formatTeamField('Team A', teamA),
        formatTeamField('Team B', teamB),
        {
          name: 'Rating Gap',
          value: `${difference} points`,
          inline: false,
        }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
