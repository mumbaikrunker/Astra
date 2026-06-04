const { handleButton: handleReadyButton, getSession } = require('../utils/readyManager');
const { handleReportButton } = require('../utils/reportManager');
const { handleMatchInfoButton } = require('../utils/matchInfoManager');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    if (interaction.isButton()) {
      try {
        if (interaction.customId.startsWith('report_')) {
          return await handleReportButton(interaction);
        }
        if (interaction.customId.startsWith('matchinfo_')) {
          return await handleMatchInfoButton(interaction);
        }
        return await handleReadyButton(interaction);
      } catch (error) {
        console.error('Error handling button interaction:', error);
        return interaction.reply({ content: 'There was an error processing the button.', ephemeral: true });
      }
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      return interaction.reply({ content: 'Command not found.', ephemeral: true });
    }

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`Error executing /${interaction.commandName}:`, error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: 'There was an error while executing this command.',
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: 'There was an error while executing this command.',
          ephemeral: true,
        });
      }
    }
  },
};
