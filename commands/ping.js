const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('Pong! 🏓')
      .setColor('Aqua')
      .addFields(
        { name: 'Latency', value: `${Date.now() - interaction.createdTimestamp}ms`, inline: true },
        { name: 'API Latency', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
