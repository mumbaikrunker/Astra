const { handleButton: handleReadyButton, getSession } = require('../utils/readyManager');
const { handleReportButton } = require('../utils/reportManager');
const { handleMatchInfoButton } = require('../utils/matchInfoManager');

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
    try {
      if (DEBUG) {
        console.log(`[DEBUG] [Interaction] Type: ${interaction.type}, User: ${interaction.user.tag}`);
      }

      // ===== BUTTON INTERACTIONS =====
      if (interaction.isButton()) {
        if (DEBUG) {
          console.log(`[DEBUG] Button interaction received: ${interaction.customId}`);
        }

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
            username: interaction.user.username,
            guildId: interaction.guildId,
            guildName: interaction.guild?.name || 'DM',
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
          });

          if (DEBUG) {
            console.error(`[DEBUG] Button error details:`, error);
          }

          try {
            if (interaction.replied) {
              await interaction.followUp({
                content: '❌ Error processing button. Please try again.',
                ephemeral: true
              });
            } else {
              await interaction.reply({
                content: '❌ Error processing button. Please try again.',
                ephemeral: true
              });
            }
          } catch (replyError) {
            console.error('[Button Handler] Failed to send error reply:', {
              customId: interaction.customId,
              replyError: replyError.message
            });
          }
        }
        return;
      }

      // ===== SLASH COMMAND INTERACTIONS =====
      if (!interaction.isChatInputCommand()) {
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
