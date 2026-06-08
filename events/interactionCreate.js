const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require('discord.js');
const {
    createCustomQueue
} = require('../systems/matchmaking/customQueueService');
const {
    updateGuildConfig
} = require('../systems/configs/guildConfigService');
const {
    showChannelsPanel,
    showChannelSelector,
    showManageQueuesPanel
} = require('../utils/setupManager');
const { handleButton: handleReadyButton, getSession } = require('../utils/readyManager');
const { handleReportButton } = require('../utils/reportManager');
const { handleMatchInfoButton } = require('../utils/matchInfoManager');

const DEBUG = process.env.DEBUG === 'true';
const pendingCustomQueues = new Map();

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
// ===== ASTRA SETUP BUTTONS =====

if (interaction.customId === 'astra_setup_channels') {
    return await showChannelsPanel(interaction);
}

if (interaction.customId === 'astra_setup_timers') {
    return await interaction.reply({
        content: '⏱️ Timer setup system coming next.',
        ephemeral: true
    });
}

if (interaction.customId === 'astra_setup_ready') {
    return await interaction.reply({
        content: '✅ Ready system setup coming next.',
        ephemeral: true
    });
}

if (interaction.customId === 'astra_setup_prefix') {
    return await interaction.reply({
        content: '🔧 Prefix setup coming next.',
        ephemeral: true
    });
}

// ===== EXISTING BUTTONS =====

if (interaction.customId === 'astra_set_2v2') {
    return await showChannelSelector(interaction, '2v2');
}

if (interaction.customId === 'astra_set_3v3') {
    return await showChannelSelector(interaction, '3v3');
}

if (interaction.customId === 'astra_set_4v4') {
    return await showChannelSelector(interaction, '4v4');
}

if (interaction.customId === 'astra_set_custom') {
    return await showChannelSelector(interaction, 'custom');
}

if (interaction.customId === 'astra_set_results') {
    return await showChannelSelector(interaction, 'results');
}
if (interaction.customId === 'astra_add_custom_queue') {

    const modal = new ModalBuilder()
        .setCustomId('astra_create_queue_modal')
        .setTitle('Create Custom Queue');

    const queueName =
        new TextInputBuilder()
            .setCustomId('queue_name')
            .setLabel('Queue Name')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(50);

    const queueSize =
        new TextInputBuilder()
            .setCustomId('queue_size')
            .setLabel('Queue Size')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('10');

    modal.addComponents(
        new ActionRowBuilder().addComponents(queueName),
        new ActionRowBuilder().addComponents(queueSize)
    );

    return await interaction.showModal(modal);
}

if (interaction.customId === 'astra_manage_custom_queues') {
    return await interaction.reply({
        content: '🚧 Queue manager coming next.',
        ephemeral: true
    });
}

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
if (interaction.isChannelSelectMenu()) {
if (
    interaction.customId ===
    'astra_manage_custom_queues'
) {
    return await showManageQueuesPanel(
        interaction
    );
} {

    const pending =
        pendingCustomQueues.get(
            interaction.user.id
        );

    if (!pending) {
        return await interaction.reply({
            content:
                '❌ Queue creation expired.',
            ephemeral: true
        });
    }

    const channelId =
        interaction.values[0];

    await createCustomQueue(
        interaction.guildId,
        pending.queueName,
        pending.queueSize,
        channelId
    );

    pendingCustomQueues.delete(
        interaction.user.id
    );

    return await interaction.update({
        content:
            `✅ Custom Queue Created

Name: ${pending.queueName}
Size: ${pending.queueSize}
Channel: <#${channelId}>`,
        components: []
    });
}
    const [prefix, type] =
        interaction.customId.split(':');

    if (prefix !== 'astra_channel_select') {
        return;
    }

    const channelId = interaction.values[0];

    const map = {
        '2v2': 'two_v_two_channel_id',
        '3v3': 'three_v_three_channel_id',
        '4v4': 'four_v_four_channel_id',
        'custom': 'custom_queue_channel_id',
        'results': 'results_channel_id'
    };

    const key = map[type];

    if (!key) {
        return;
    }

    await updateGuildConfig(
        interaction.guildId,
        key,
        channelId
    );

    return await interaction.update({
        content: `✅ ${type} channel saved: <#${channelId}>`,
        embeds: [],
        components: []
    });
}
if (interaction.isModalSubmit()) {

    if (
        interaction.customId ===
        'astra_create_queue_modal'
    ) {

        const queueName =
            interaction.fields.getTextInputValue(
                'queue_name'
            );

        const queueSize =
            parseInt(
                interaction.fields.getTextInputValue(
                    'queue_size'
                ),
                10
            );

        if (
            Number.isNaN(queueSize) ||
            queueSize < 2
        ) {
            return await interaction.reply({
                content:
                    '❌ Queue size must be a number greater than 1.',
                ephemeral: true
            });
        }

        pendingCustomQueues.set(
            interaction.user.id,
            {
                queueName,
                queueSize
            }
        );

        const {
            ActionRowBuilder,
            ChannelSelectMenuBuilder,
            ChannelType
        } = require('discord.js');

        const row =
            new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId(
                        'astra_custom_queue_channel'
                    )
                    .setPlaceholder(
                        'Select queue channel'
                    )
                    .setChannelTypes(
                        ChannelType.GuildText
                    )
            );

        return await interaction.reply({
            content:
                'Select the channel for this queue.',
            components: [row],
            ephemeral: true
        });
    }
}
      // ===== SLASH COMMAND INTERACTIONS =====
      if (
    !interaction.isChatInputCommand() &&
    !interaction.isChannelSelectMenu()
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
