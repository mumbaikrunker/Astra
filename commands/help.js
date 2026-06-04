const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available queue commands'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('Astra Queue Help')
      .setColor('Purple')
      .setDescription('Use these commands to manage the queue:')
      .addFields(
        { name: '/ping', value: 'Check bot latency and responsiveness.', inline: false },
        { name: '/add', value: 'Add a player to the pickup queue.', inline: false },
        { name: '/remove', value: 'Remove a player from the queue.', inline: false },
        { name: '/who', value: 'Show current queue entries.', inline: false },
        { name: '/ready', value: 'Start a ready check for the current queue.', inline: false },
        { name: '/notready', value: 'Opt out of the ready check and cancel it.', inline: false },
        { name: '/report', value: 'Submit a match result for confirmation and ELO updates.', inline: false },
        { name: '/matchinfo', value: 'Post a match info panel with resolution buttons.', inline: false },
        { name: '/balance', value: 'Show balanced teams without creating a match channel.', inline: false },
        { name: '/match', value: 'Create an automatic match channel with team embeds and match info.', inline: false },
        { name: '/matchstatus', value: 'Show active temporary matches in this server.', inline: false },
        { name: '/leaderboard', value: 'Show the top rated players.', inline: false },
        { name: '/rank', value: 'Show your current rating and rank.', inline: false },
        { name: '/guildconfig', value: 'View or update guild-specific matchmaking settings.', inline: false },
        { name: '/help', value: 'Show this help message.', inline: false }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
