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
    createCustomQueue,
    getCustomQueue,
    updateCustomQueue,
    deleteCustomQueue
} = require('../systems/matchmaking/customQueueService');
const {
    showManageQueuesPanel,
    showQueueManagementPanel
} = require('../utils/setupManager');

const DEBUG = process.env.DEBUG === 'true';
const pendingCustomQueues = new Map(); // Moved here from interactionCreate.js

async function handleQueueInteraction(interaction, client) {
    if (DEBUG) {
        console.log(`[DEBUG] Queue interaction received: ${interaction.customId}`);
    }

    // ===== BUTTON INTERACTIONS =====
    if (interaction.isButton()) {
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

        if (interaction.customId.startsWith('queue_rename:')) {
            const queueId = interaction.customId.split(':')[1];
            const queue = await getCustomQueue(queueId);

            if (!queue) {
                return await interaction.reply({ content: '❌ Queue not found.', ephemeral: true });
            }

            const modal = new ModalBuilder()
                .setCustomId(`queue_rename_modal:${queueId}`)
                .setTitle(`Rename Queue: ${queue.queue_name}`);

            const newQueueNameInput = new TextInputBuilder()
                .setCustomId('new_queue_name')
                .setLabel('New Queue Name')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(50)
                .setValue(queue.queue_name);

            modal.addComponents(new ActionRowBuilder().addComponents(newQueueNameInput));
            return await interaction.showModal(modal);
        }

        if (interaction.customId.startsWith('queue_size:')) {
            const queueId = interaction.customId.split(':')[1];
            const queue = await getCustomQueue(queueId);

            if (!queue) {
                return await interaction.reply({ content: '❌ Queue not found.', ephemeral: true });
            }

            const modal = new ModalBuilder()
                .setCustomId(`queue_size_modal:${queueId}`)
                .setTitle(`Change Queue Size: ${queue.queue_name}`);

            const newQueueSizeInput = new TextInputBuilder()
                .setCustomId('new_queue_size')
                .setLabel('New Queue Size (2-100)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('10')
                .setValue(String(queue.queue_size));

            modal.addComponents(new ActionRowBuilder().addComponents(newQueueSizeInput));
            return await interaction.showModal(modal);
        }

        if (interaction.customId.startsWith('queue_channel:')) {
            const queueId = interaction.customId.split(':')[1];
            const queue = await getCustomQueue(queueId);

            if (!queue) {
                return await interaction.reply({ content: '❌ Queue not found.', ephemeral: true });
            }

            const row = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId(`queue_channel_select:${queueId}`)
                    .setPlaceholder('Select a new channel...')
                    .setChannelTypes(ChannelType.GuildText)
            );

            return await interaction.update({
                content: `Select the new channel for queue: **${queue.queue_name}**`,
                embeds: [],
                components: [row]
            });
        }

        if (interaction.customId.startsWith('queue_delete:')) {
            const queueId = interaction.customId.split(':')[1];
            const queue = await getCustomQueue(queueId);

            if (!queue) {
                return await interaction.reply({ content: '❌ Queue not found.', ephemeral: true });
            }

            // Confirmation step
            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`queue_delete_confirm:${queueId}`)
                    .setLabel('Confirm Delete')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`queue_delete_cancel:${queueId}`)
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

            return await interaction.reply({
                content: `⚠️ Are you sure you want to delete the queue **${queue.queue_name}**? This action cannot be undone.`,
                components: [confirmRow],
                ephemeral: true
            });
        }

        if (interaction.customId.startsWith('queue_delete_confirm:')) {
            const queueId = interaction.customId.split(':')[1];
            await deleteCustomQueue(queueId);
            await interaction.update({ content: '✅ Queue deleted successfully.', components: [], embeds: [] });
            // Refresh the manage queues panel
            return await showManageQueuesPanel(interaction);
        }

        if (interaction.customId.startsWith('queue_delete_cancel:')) {
            return await interaction.update({ content: 'Deletion cancelled.', components: [], embeds: [] });
        }
    }

    // ===== SELECT MENU INTERACTIONS =====
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'astra_manage_queue_select') {
            const queueId = interaction.values[0];
            const queue = await getCustomQueue(queueId);

            if (!queue) {
                return await interaction.reply({ content: '❌ Queue not found.', ephemeral: true });
            }
            return await showQueueManagementPanel(interaction, queue);
        }
    }

    if (interaction.isChannelSelectMenu()) {
        if (interaction.customId === 'astra_custom_queue_channel') {
            const pending = pendingCustomQueues.get(interaction.user.id);

            if (!pending) {
                return await interaction.reply({ content: '❌ Queue creation expired.', ephemeral: true });
            }

            const channelId = interaction.values[0];

            await createCustomQueue(
                interaction.guildId,
                pending.queueName,
                pending.queueSize,
                channelId
            );

            pendingCustomQueues.delete(interaction.user.id);

            return await interaction.update({
                content: `✅ Custom Queue Created\n\nName: ${pending.queueName}\nSize: ${pending.queueSize}\nChannel: <#${channelId}>`,
                components: []
            });
        }

        if (interaction.customId.startsWith('queue_channel_select:')) {
            const queueId = interaction.customId.split(':')[1];
            const newChannelId = interaction.values[0];

            const updatedQueue = await updateCustomQueue(queueId, { channel_id: newChannelId });

            if (!updatedQueue) {
                return await interaction.reply({ content: '❌ Failed to update queue channel.', ephemeral: true });
            }

            await interaction.update({ content: `✅ Queue channel updated to <#${newChannelId}>.`, components: [], embeds: [] });
            // Refresh the queue management panel
            return await showQueueManagementPanel(interaction, updatedQueue);
        }
    }

    // ===== MODAL SUBMIT INTERACTIONS =====
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'astra_create_queue_modal') {
            const queueName = interaction.fields.getTextInputValue('queue_name');
            const queueSize = parseInt(interaction.fields.getTextInputValue('queue_size'), 10);

            if (Number.isNaN(queueSize) || queueSize < 2 || queueSize > 100) { // Added max validation
                return await interaction.reply({ content: '❌ Queue size must be a number between 2 and 100.', ephemeral: true });
            }

            pendingCustomQueues.set(interaction.user.id, { queueName, queueSize });

            const row = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId('astra_custom_queue_channel')
                    .setPlaceholder('Select queue channel')
                    .setChannelTypes(ChannelType.GuildText)
            );

            return await interaction.reply({
                content: 'Select the channel for this queue.',
                components: [row],
                ephemeral: true
            });
        }

        if (interaction.customId.startsWith('queue_rename_modal:')) {
            const queueId = interaction.customId.split(':')[1];
            const newQueueName = interaction.fields.getTextInputValue('new_queue_name');

            const updatedQueue = await updateCustomQueue(queueId, { queue_name: newQueueName });

            if (!updatedQueue) {
                return await interaction.reply({ content: '❌ Failed to rename queue.', ephemeral: true });
            }

            await interaction.update({ content: `✅ Queue renamed to **${newQueueName}**.`, components: [], embeds: [] });
            // Refresh the queue management panel with the updated queue
            return await showQueueManagementPanel(interaction, updatedQueue);
        }

        if (interaction.customId.startsWith('queue_size_modal:')) {
            const queueId = interaction.customId.split(':')[1];
            const newQueueSize = parseInt(interaction.fields.getTextInputValue('new_queue_size'), 10);

            if (Number.isNaN(newQueueSize) || newQueueSize < 2 || newQueueSize > 100) {
                return await interaction.reply({ content: '❌ Queue size must be a number between 2 and 100.', ephemeral: true });
            }

            const updatedQueue = await updateCustomQueue(queueId, { queue_size: newQueueSize });

            if (!updatedQueue) {
                return await interaction.reply({ content: '❌ Failed to change queue size.', ephemeral: true });
            }

            await interaction.update({ content: `✅ Queue size changed to **${newQueueSize}**.`, components: [], embeds: [] });
            // Refresh the queue management panel with the updated queue
            return await showQueueManagementPanel(interaction, updatedQueue);
        }
    }

    return false; // Indicate that this handler did not process the interaction
}

module.exports = { handleQueueInteraction, pendingCustomQueues };