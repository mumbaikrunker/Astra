const { handleButton: handleReadyButton, getSession } = require('../utils/readyManager');
const { handleReportButton } = require('../utils/reportManager');
const { handleMatchInfoButton } = require('../utils/matchInfoManager');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    // Handle button interactions
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
        console.error('[Button Handler] Error handling button interaction:', {
          customId: interaction.customId,
          userId: interaction.user.id,
          guildId: interaction.guildId,
          error: error.message,
          stack: error.stack
        });
        
        try {
          return interaction.reply({
            content: 'There was an error processing the button.',
            ephemeral: true
          });
        } catch (replyError) {
          console.error('[Button Handler] Failed to send error reply:', replyError.message);
        }
      }
    }

    // Handle slash commands
    if (!interaction.isChatInputCommand()) return;

    const commandName = interaction.commandName.toLowerCase().trim();
    const command = client.commands.get(commandName);

    // Command not found - detailed logging
    if (!command) {
      console.warn('[Command Handler] Command not found:', {
        requestedCommand: interaction.commandName,
        normalizedName: commandName,
        userId: interaction.user.id,
        username: interaction.user.username,
        guildId: interaction.guildId,
        guildName: interaction.guild?.name || 'DM',
        timestamp: new Date().toISOString()
      });

      // Log available commands for debugging
      const availableCommands = Array.from(client.commands.keys()).sort();
      console.warn('[Command Handler] Available commands:', availableCommands);

      try {
        return interaction.reply({
          content: `Command \`/${interaction.commandName}\` not found. Use \`/help\` for available commands.`,
          ephemeral: true
        });
      } catch (replyError) {
        console.error('[Command Handler] Failed to send "not found" reply:', replyError.message);
      }
      return;
    }

    // Log command execution attempt
    console.log('[Command Handler] Executing command:', {
      command: commandName,
      userId: interaction.user.id,
      username: interaction.user.username,
      guildId: interaction.guildId,
      guildName: interaction.guild?.name || 'DM',
      timestamp: new Date().toISOString()
    });

    try {
      await command.execute(interaction, client);
      
      // Log successful execution
      console.log('[Command Handler] Command executed successfully:', {
        command: commandName,
        userId: interaction.user.id,
        executionTime: `${Date.now() - interaction.createdTimestamp}ms`
      });

    } catch (error) {
      // Log command execution error with full context
      console.error('[Command Handler] Error executing command:', {
        command: commandName,
        userId: interaction.user.id,
        guildId: interaction.guildId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      // Determine appropriate error response
      const errorMessage = 'There was an error while executing this command.';

      try {
        if (interaction.replied) {
          // Already sent a response
          await interaction.followUp({
            content: errorMessage,
            ephemeral: true
          });
        } else if (interaction.deferred) {
          // Already deferred
          await interaction.editReply({
            content: errorMessage
          });
        } else {
          // No prior response
          await interaction.reply({
            content: errorMessage,
            ephemeral: true
          });
        }
      } catch (replyError) {
        console.error('[Command Handler] Failed to send error reply:', {
          command: commandName,
          replyError: replyError.message,
          originalError: error.message
        });
      }
    }
  },
};
