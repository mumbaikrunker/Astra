const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder // Keep ActionRowBuilder for generic error replies if needed
} = require('discord.js');

// Handler Imports
const { handleSetupInteraction } = require('../events/setupHandlers');
const { handleQueueInteraction } = require('../events/queueHandlers');
const { handleReportInteraction } = require('../events/reportHandlers');
const { handleReadyInteraction } = require('../events/readyHandlers');
const { handleResultInteraction } = require('../events/resultHandlers');

const DEBUG = process.env.DEBUG === 'true';

/**
 * Handle all Discord interactions: slash commands, buttons, and other interactions
 * Features:
 * - Command name normalization and validation
 * - Comprehensive debug logging for troubleshooting
 * - Robust error handling with fallback responses
 * - Execution isolation to prevent crashes
 * - Detailed error reporting with context
 */
module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    // Helper function for error handling
    const handleInteractionError = async (error, handlerName, customId = 'N/A') => {
      console.error(`[${handlerName}] Error handling interaction:`, {
        customId: customId,
        userId: interaction.user?.id,
        username: interaction.user?.username,
        guildId: interaction.guildId,
        guildName: interaction.guild?.name || 'DM',
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      if (DEBUG) {
        console.error(`[DEBUG] ${handlerName} error details:`, error);
      }

      try {
        const errorMessage = `❌ Error processing ${handlerName.toLowerCase().replace(' handler', '')}. Please try again.`;
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        }
      } catch (replyError) {
        console.error(`[${handlerName}] Failed to send error reply:`, {
          customId: customId,
          replyError: replyError.message
        });
      }
    };

    try {
      if (DEBUG) {
        console.log(`[DEBUG] [Interaction] Type: ${interaction.type}, User: ${interaction.user.tag}`);
      }

      // ===== BUTTON INTERACTIONS =====
      if (interaction.isButton()) {
        try {
          if (interaction.customId.startsWith('astra_setup_') ||
              interaction.customId.startsWith('astra_set_') ||
              interaction.customId === 'astra_manage_custom_queues' ||
              interaction.customId === 'astra_main_menu' || // Back button for setup panels
              interaction.customId.startsWith('guild_config_set_ready_method:') // For setting ready method
            ) {
            return await handleSetupInteraction(interaction, client);
          }

          if (interaction.customId.startsWith('astra_add_custom_queue') ||
              interaction.customId.startsWith('queue_') // For custom queue management buttons (rename, size, channel, delete, confirm, cancel)
            ) {
            return await handleQueueInteraction(interaction, client);
          }

          if (interaction.customId.startsWith('report_') || interaction.customId.startsWith('matchinfo_')) {
            return await handleReportInteraction(interaction, client);
          }

          if (interaction.customId.startsWith('ready_')) {
            return await handleReadyInteraction(interaction, client);
          }

          if (interaction.customId.startsWith('match_')) {
            return await handleResultInteraction(interaction, client);
          }

          console.warn(`[InteractionCreate] Unhandled button customId: ${interaction.customId}`);
          return await interaction.reply({ content: 'This button is not yet implemented or recognized.', ephemeral: true });
        } catch (error) {
          await handleInteractionError(error, 'Button Handler', interaction.customId);
        }
        return;
      }

      // ===== SELECT MENU INTERACTIONS (StringSelectMenu and ChannelSelectMenu) =====
      if (interaction.isStringSelectMenu() || interaction.isChannelSelectMenu()) {
        try {
          if (interaction.customId === 'astra_manage_queue_select' ||
              interaction.customId === 'astra_custom_queue_channel' ||
              interaction.customId.startsWith('queue_channel_select:') // For changing custom queue channel
            ) {
            return await handleQueueInteraction(interaction, client);
          }

          if (interaction.customId.startsWith('astra_channel_select:')) {
            return await handleSetupInteraction(interaction, client);
          }

          if (interaction.customId.startsWith('match_mvp_select:')) {
            return await handleResultInteraction(interaction, client);
          }

          console.warn(`[InteractionCreate] Unhandled select menu customId: ${interaction.customId}`);
          return await interaction.reply({ content: 'This select menu is not yet implemented or recognized.', ephemeral: true });
        } catch (error) {
          await handleInteractionError(error, 'Select Menu Handler', interaction.customId);
        }
        return;
      }

      // ===== MODAL SUBMIT INTERACTIONS =====
      if (interaction.isModalSubmit()) {
        try {
          if (interaction.customId === 'astra_create_queue_modal' ||
              interaction.customId.startsWith('queue_rename_modal:') ||
              interaction.customId.startsWith('queue_size_modal:')
            ) {
            return await handleQueueInteraction(interaction, client);
          }

          if (interaction.customId.startsWith('guild_config_modal:')) {
            return await handleSetupInteraction(interaction, client);
          }

          console.warn(`[InteractionCreate] Unhandled modal customId: ${interaction.customId}`);
          return await interaction.reply({ content: 'This modal is not yet implemented or recognized.', ephemeral: true });
        } catch (error) {
          await handleInteractionError(error, 'Modal Handler', interaction.customId);
        }
        return;
      }

      // ===== SLASH COMMAND INTERACTIONS =====
      if (
        !interaction.isChatInputCommand()
      ) {
        if (DEBUG) {
          console.log(`[DEBUG] Ignoring non-command interaction: ${interaction.type}`);
        }
        return;
      }

      // ----- COMMAND NAME RESOLUTION -----
      // Log command received
      console.log('[Command Handler] 📨 Command received:', {
        rawCommandName: interaction.commandName,
        userId: interaction.user.id,
        username: interaction.user.username,
        guildId: interaction.guildId,
        guildName: interaction.guild?.name || 'DM',
        timestamp: new Date().toISOString()
      });

      if (DEBUG) {
        console.log(`[DEBUG] Raw command name: "${interaction.commandName}"`);
        console.log(`[DEBUG] Type: ${typeof interaction.commandName}`);
      }

      // Validate and normalize command name
      let commandName;
      try {
        if (!interaction.commandName || typeof interaction.commandName !== 'string') {
          throw new Error(
            `Invalid commandName: ${typeof interaction.commandName} (expected string)`
          );
        }
        commandName = interaction.commandName.toLowerCase().trim();

        if (!commandName) {
          throw new Error('Command name is empty after normalization');
        }

        if (DEBUG) {
          console.log(`[DEBUG] Normalized command name: "${commandName}"`);
        }
      } catch (parseError) {
        console.error('[Command Handler] ❌ Failed to parse command name:', {
          error: parseError.message,
          rawValue: interaction.commandName,
          type: typeof interaction.commandName,
          userId: interaction.user.id
        });

        if (DEBUG) {
          console.error(`[DEBUG] Parse error details:`, parseError);
        }

        try {
          await interaction.reply({
            content: '❌ Invalid command format. Please try again.',
            ephemeral: true
          });
        } catch (replyError) {
          console.error('[Command Handler] Failed to send parse error reply:', replyError.message);
        }
        return;
      }

      // ----- COMMAND LOOKUP -----
      const command = client.commands.get(commandName);
      const startTime = Date.now();

      if (DEBUG) {
        console.log(`[DEBUG] Looking up command: "${commandName}"`);
        console.log(`[DEBUG] Command found: ${!!command}`);
        console.log(`[DEBUG] Available commands:`, Array.from(client.commands.keys()));
      }

      // Command not found
      if (!command) {
        console.warn('[Command Handler] ❌ Command not found:', {
          requestedCommand: commandName,
          userId: interaction.user.id,
          username: interaction.user.username,
          guildId: interaction.guildId,
          availableCommandCount: client.commands.size,
          timestamp: new Date().toISOString()
        });

        // Log fallback info for debugging
        const availableCommands = Array.from(client.commands.keys()).sort();
        if (availableCommands.length > 0) {
          console.warn('[Command Handler] 📋 Available commands:', availableCommands.join(', '));
        } else {
          console.warn('[Command Handler] ⚠️  No commands loaded! Check handler.js for errors.');
        }

        if (DEBUG) {
          console.log(`[DEBUG] Command not found. Available count: ${client.commands.size}`);
          console.log(`[DEBUG] Available: ${JSON.stringify(availableCommands)}`);
        }

        try {
          await interaction.reply({
            content: `❌ Command \`/${commandName}\` not found.\n\nUse \`/help\` to see available commands.`,
            ephemeral: true
          });
        } catch (replyError) {
          console.error('[Command Handler] Failed to send "not found" reply:', {
            command: commandName,
            replyError: replyError.message,
            userId: interaction.user.id
          });
        }
        return;
      }

      // Command found
      console.log('[Command Handler] ✅ Command found and executing:', {
        command: commandName,
        userId: interaction.user.id,
        username: interaction.user.username,
        guildId: interaction.guildId,
        guildName: interaction.guild?.name || 'DM',
        timestamp: new Date().toISOString()
      });

      if (DEBUG) {
        console.log(`[DEBUG] Executing command: ${commandName}`);
        console.log(`[DEBUG] Command object:`, {
          hasData: !!command.data,
          hasExecute: !!command.execute,
          isExecuteFunction: typeof command.execute === 'function'
        });
      }

      // ----- COMMAND EXECUTION -----
      try {
        // Execute the command in isolation
        await command.execute(interaction, client);

        // Log successful execution
        const executionTime = Date.now() - startTime;
        console.log('[Command Handler] ✅ Command executed successfully:', {
          command: commandName,
          userId: interaction.user.id,
          executionTimeMs: executionTime,
          timestamp: new Date().toISOString()
        });

        if (DEBUG) {
          console.log(`[DEBUG] Command execution completed in ${executionTime}ms`);
        }
      } catch (executionError) {
        // ----- EXECUTION ERROR HANDLING -----
        const executionTime = Date.now() - startTime;

        console.error('[Command Handler] ❌ Error executing command:', {
          command: commandName,
          userId: interaction.user.id,
          username: interaction.user.username,
          guildId: interaction.guildId,
          guildName: interaction.guild?.name || 'DM',
          errorMessage: executionError.message,
          errorName: executionError.name,
          errorCode: executionError.code,
          executionTimeMs: executionTime,
          stack: executionError.stack,
          timestamp: new Date().toISOString()
        });

        if (DEBUG) {
          console.error(`[DEBUG] Full error object:`, {
            message: executionError.message,
            name: executionError.name,
            code: executionError.code,
            stack: executionError.stack
          });
        }

        // Send error response to user
        const errorMessage = '❌ An error occurred while executing this command.';

        try {
          if (interaction.replied) {
            // Already sent a response - send followUp
            await interaction.followUp({
              content: errorMessage,
              ephemeral: true
            });

            if (DEBUG) {
              console.log(`[DEBUG] Sent followUp error message`);
            }
          } else if (interaction.deferred) {
            // Already deferred - edit the deferred response
            await interaction.editReply({
              content: errorMessage
            });

            if (DEBUG) {
              console.log(`[DEBUG] Edited deferred error message`);
            }
          } else {
            // No prior response - send new reply
            await interaction.reply({
              content: errorMessage,
              ephemeral: true
            });

            if (DEBUG) {
              console.log(`[DEBUG] Sent new reply error message`);
            }
          }

          console.log('[Command Handler] 📤 Error reply sent to user:', {
            command: commandName,
            userId: interaction.user.id
          });
        } catch (replyError) {
          console.error('[Command Handler] ❌ Failed to send error reply to user:', {
            command: commandName,
            userId: interaction.user.id,
            originalError: executionError.message,
            replyError: replyError.message,
            replyErrorCode: replyError.code
          });

          if (DEBUG) {
            console.error(`[DEBUG] Reply error details:`, replyError);
          }
        }
      }
    } catch (unexpectedError) {
      // ----- UNEXPECTED ERROR (OUTER CATCH) -----
      console.error('[Command Handler] 🔥 Unexpected error in interaction handler:', {
        errorMessage: unexpectedError.message,
        errorName: unexpectedError.name,
        errorStack: unexpectedError.stack,
        timestamp: new Date().toISOString()
      });

      if (DEBUG) {
        console.error(`[DEBUG] Unexpected error details:`, unexpectedError);
      }

      // Attempt to notify user if possible
      try {
        if (interaction && typeof interaction.reply === 'function') {
          await interaction.reply({
            content: '❌ An unexpected error occurred. Please try again later.',
            ephemeral: true
          });
        }
      } catch (notifyError) {
        console.error(
          '[Command Handler] Could not notify user of unexpected error:',
          notifyError.message
        );
      }
    }
  }
};
