const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getActiveMatches } = require('../systems/matchmaking/matchService');

function formatTeamSummary(team) {
  if (!Array.isArray(team) || team.length === 0) {
    return 'No players';
  }

  const names = team.map((player) => player.name).join(', ');
  return `${team.length} player${team.length === 1 ? '' : 's'}: ${names}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('matchstatus')
    .setDescription('Show active temporary matches for this server'),

  async execute(interaction) {
    const matches = await getActiveMatches(interaction.guildId);
    if (!matches.length) {
      return interaction.reply({ content: 'There are no active matches in this server.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('Active Matches')
      .setColor('Blue')
      .setDescription(`There ${matches.length === 1 ? 'is' : 'are'} ${matches.length} active match${matches.length === 1 ? '' : 'es'} in this server.`)
      .setTimestamp();

    matches.slice(0, 10).forEach((match) => {
      const createdAt = match.created_at ? Math.floor(new Date(match.created_at).valueOf() / 1000) : null;
      const value = [
        `Host: <@${match.creator_id}>`,
        `Channel: ${match.match_name || 'Unknown'}`,
        `Team A: ${formatTeamSummary(match.team_a)}`,
        `Team B: ${formatTeamSummary(match.team_b)}`,
        createdAt ? `Created: <t:${createdAt}:R>` : null,
      ]
        .filter(Boolean)
        .join('\n');

      embed.addFields({ name: `Match ${match.id}`, value, inline: false });
    });

    if (matches.length > 10) {
      embed.addFields({ name: 'More matches', value: `There are ${matches.length - 10} additional active matches not shown.`, inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  },
};