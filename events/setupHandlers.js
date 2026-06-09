const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ChannelSelectMenuBuilder,
    ChannelType,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require('discord.js');
const {
    updateGuildConfig,
    getGuildConfig
} = require('../systems/configs/guildConfigService');
const {
    showChannelsPanel,
    showChannelSelector,
    showManageQueuesPanel,
    showTimersPanel,
    showReadySystemPanel,
    showPrefixPanel,
    showMainSetupPanel
} = require('../utils/setupManager');
const { settings: guildConfigSettings } = require('../commands/guildconfig'); // Import settings for validation

const DEBUG = process.env.DEBUG === 'true';

async function handleSetupInteraction(interaction, client) {
    if (DEBUG) {
        console.log(`[DEBUG] Setup interaction received: ${interaction.customId}`);
    }

    // ===== BUTTON INTERACTIONS =====
    if (interaction.isButton()) {
        switch (interaction.customId) {
            case 'astra_main_menu':
                return await showMainSetupPanel(interaction);
            case 'astra_setup_channels':
                return await showChannelsPanel(interaction);
            case 'astra_setup_timers':
                return await showTimersPanel(interaction);
            case 'astra_setup_ready':
                return await showReadySystemPanel(interaction);
            case 'astra_setup_prefix':
                return await showPrefixPanel(interaction);
            case 'astra_set_2v2':
                return await showChannelSelector(interaction, '2v2');
            case 'astra_set_3v3':
                return await showChannelSelector(interaction, '3v3');
            case 'astra_set_4v4':
                return await showChannelSelector(interaction, '4v4');
            case 'astra_set_custom':
                return await showChannelSelector(interaction, 'custom');
            case 'astra_set_results':
                return await showChannelSelector(interaction, 'results');
            case 'astra_set_admin_results': // New for Phase 5
                return await showChannelSelector(interaction, 'admin_results');
            case 'astra_manage_custom_queues':
                return await showManageQueuesPanel(interaction);
            case 'astra_main_menu': // Global Back Button
            case 'guild_config_set_ready_method:button': // New for Phase 3
                await updateGuildConfig(interaction.guildId, 'ready_method', 'button');
                return await showReadySystemPanel(interaction);
            case 'guild_config_set_ready_method:reaction': // New for Phase 3
                await updateGuildConfig(interaction.guildId, 'ready_method', 'reaction');
                return await showReadySystemPanel(interaction);
            default:
                console.warn(`[Setup Handler] Unhandled setup button: ${interaction.customId}`);
                return await interaction.reply({ content: 'This setup button is not yet implemented.', ephemeral: true });
        }
    }

    // ===== SELECT MENU INTERACTIONS (ChannelSelectMenu) =====
    if (interaction.isChannelSelectMenu()) {
        if (interaction.customId.startsWith('astra_channel_select:')) {
            const [, type] = interaction.customId.split(':');
            const channelId = interaction.values[0];

            const map = {
                '2v2': 'two_v_two_channel_id',
                '3v3': 'three_v_three_channel_id',
                '4v4': 'four_v_four_channel_id',
                'custom': 'custom_queue_channel_id',
                'results': 'results_channel_id',
                'admin_results': 'admin_results_channel_id' // New for Phase 5
            };

            const key = map[type];

            if (!key) {
                console.warn(`[Setup Handler] Unknown channel select type: ${type}`);
                return await interaction.update({ content: '❌ Unknown channel type selected.', ephemeral: true });
            }

            await updateGuildConfig(interaction.guildId, key, channelId);

            // After updating, refresh the channels panel
            return await showChannelsPanel(interaction);
        }
    }

    // ===== MODAL SUBMIT INTERACTIONS (for Timers, Prefix, Ready Timeout) =====
    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('guild_config_modal:')) {
            const [, settingKey] = interaction.customId.split(':');
            const inputValue = interaction.fields.getTextInputValue('value');

            const settingInfo = guildConfigSettings[settingKey];

            if (!settingInfo) {
                return await interaction.reply({ content: '❌ Unknown setting.', ephemeral: true });
            }

            let parsedValue;
            if (settingKey.includes('seconds') ||
                settingKey === 'queue_max_size' ||
                settingKey === 'default_player_rating'
            ) {
                parsedValue = parseInt(inputValue, 10);
                if (Number.isNaN(parsedValue) || parsedValue < settingInfo.min || parsedValue > settingInfo.max) {
                    return await interaction.reply({ content: `❌ Value for ${settingInfo.label} must be a number between ${settingInfo.min} and ${settingInfo.max}.`, ephemeral: true });
                }
            } else if (settingKey === 'prefix') {
                parsedValue = inputValue.trim();
                if (!parsedValue || parsedValue.length < settingInfo.min_length || parsedValue.length > settingInfo.max_length) {
                    return await interaction.reply({ content: `❌ ${settingInfo.label} must be between ${settingInfo.min_length} and ${settingInfo.max_length} characters.`, ephemeral: true });
                }
            } else {
                parsedValue = inputValue; // Default for other string types
            }

            await updateGuildConfig(interaction.guildId, settingKey, parsedValue);

            // Refresh the relevant panel after update
            if (settingKey.includes('seconds')) { // Only timers and ready timeout
                return await showTimersPanel(interaction); // Refresh timers panel
            } else if (settingKey === 'prefix') {
                return await showPrefixPanel(interaction); // Refresh prefix panel
            } else {
                return await interaction.update({ content: `✅ ${settingInfo.label} updated to \`${parsedValue}\`.`, components: [], embeds: [] });
            }
        }
    }

    return false; // Indicate that this handler did not process the interaction
}

module.exports = { handleSetupInteraction };