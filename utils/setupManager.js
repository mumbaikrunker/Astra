const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    ChannelType,
    StringSelectMenuBuilder
} = require('discord.js');

const {
    getGuildConfig
} = require('../systems/configs/guildConfigService');

const {
    getCustomQueues
} = require('../systems/matchmaking/customQueueService');
const { settings: guildConfigSettings } = require('../commands/guildconfig'); // Import settings for validation

async function showMainSetupPanel(interaction) {
    const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('⚙️ ASTRA Setup Panel')
        .setDescription('Configure your ASTRA matchmaking system.');

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('astra_setup_channels')
            .setLabel('Channels')
            .setEmoji('📁')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('astra_setup_timers')
            .setLabel('Timers')
            .setEmoji('⏱️')
            .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('astra_setup_ready')
            .setLabel('Ready System')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('astra_setup_prefix')
            .setLabel('Prefix')
            .setEmoji('🔧')
            .setStyle(ButtonStyle.Secondary)
    );

    const payload = { embeds: [embed], components: [row1, row2] };
    if (interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu() || interaction.isChannelSelectMenu()) {
        return await interaction.update(payload);
    }
    return await interaction.reply(payload);
}

async function showChannelsPanel(interaction) {
    try {
        const config = await getGuildConfig(interaction.guildId);
        const customQueues =
    await getCustomQueues(
        interaction.guildId
    );

const customQueueText =
    customQueues.length
        ? customQueues
              .map(
                  q =>
                      `• ${q.queue_name} (${q.queue_size})`
              )
              .join('\n')
        : 'No custom queues configured';

        const embed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('📁 ASTRA Channel Configuration')
            .setDescription(
`Configure matchmaking channels.

**2v2 Queue**
${config.two_v_two_channel_id ? `<#${config.two_v_two_channel_id}>` : 'Not Set'}

**3v3 Queue**
${config.three_v_three_channel_id ? `<#${config.three_v_three_channel_id}>` : 'Not Set'}

**4v4 Queue**
${config.four_v_four_channel_id ? `<#${config.four_v_four_channel_id}>` : 'Not Set'}

━━━━━━━━━━━━━━

**Custom Queues**

${customQueueText}

**Results Channel**
${config.results_channel_id ? `<#${config.results_channel_id}>` : 'Not Set'}`
            );

        // Phase 5: Admin Results Channel
        embed.addFields({ name: 'Admin Results Channel', value: config.admin_results_channel_id ? `<#${config.admin_results_channel_id}>` : 'Not Set', inline: false });

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('astra_set_2v2')
                .setLabel('Set 2v2')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('astra_set_3v3')
                .setLabel('Set 3v3')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('astra_set_4v4')
                .setLabel('Set 4v4')
                .setStyle(ButtonStyle.Primary)
        );

        const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
        .setCustomId('astra_add_custom_queue')
        .setLabel('Add Custom Queue')
        .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
        .setCustomId('astra_manage_custom_queues')
        .setLabel('Manage Queues')
        .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
        .setCustomId('astra_set_results')
        .setLabel('Set Results')
        .setStyle(ButtonStyle.Primary)
);

        // Phase 5: Admin Results Channel button
        row2.addComponents(new ButtonBuilder()
            .setCustomId('astra_set_admin_results')
            .setLabel('Set Admin Results')
            .setStyle(ButtonStyle.Primary));

const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
        .setCustomId('astra_main_menu')
        .setLabel('Back')
        .setStyle(ButtonStyle.Danger)
);

        if (interaction.isButton()) {
            return await interaction.update({
                embeds: [embed],
                components: [row1, row2, row3]
            });
        }

        return await interaction.reply({
            embeds: [embed],
            components: [row1, row2, row3]
        });

    } catch (error) {
        console.error('[SETUP MANAGER ERROR]', error);

        if (!interaction.replied) {
            return await interaction.reply({
                content: `❌ Setup error: ${error.message}`
            });
        }
    }
}

async function showChannelSelector(interaction, type) {
    const row = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId(`astra_channel_select:${type}`)
            .setPlaceholder('Select a channel...')
            .setChannelTypes(ChannelType.GuildText)
    );

    return await interaction.update({
        content: `Select the channel for ${type}`,
        embeds: [],
        components: [row]
    });
}

async function showManageQueuesPanel(
    interaction
) {

    const queues =
        await getCustomQueues(
            interaction.guildId
        );

    if (!queues.length) {
        return await interaction.reply({
            content:
                '❌ No custom queues found.'
        });
    }

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(
                'astra_manage_queue_select'
            )
            .setPlaceholder(
                'Select a queue'
            )
            .addOptions(
                queues.map(queue => ({
                    label:
                        `${queue.queue_name} (${queue.queue_size})`,
                    value:
                        String(queue.id)
                }))
            );

    const row =
        new ActionRowBuilder()
            .addComponents(menu);

    return await interaction.reply({
        content:
            'Select a queue to manage.',
        components: [row]
    });
}

// Phase 2: Timers Setup Panel
async function showTimersPanel(interaction) {
    const config = await getGuildConfig(interaction.guildId);

    const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('⏱️ ASTRA Timer Configuration')
        .setDescription('Configure various timeouts for matchmaking processes.');

    embed.addFields(
        { name: 'Ready Timeout', value: `${config.ready_timeout_seconds} seconds`, inline: true },
        { name: 'Report Timeout', value: `${config.report_timeout_seconds} seconds`, inline: true },
        { name: 'Match Lifetime', value: `${config.match_lifetime_seconds} seconds`, inline: true }
    );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('guild_config_modal:ready_timeout_seconds')
            .setLabel('Edit Ready Timeout')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('guild_config_modal:report_timeout_seconds')
            .setLabel('Edit Report Timeout')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('guild_config_modal:match_lifetime_seconds')
            .setLabel('Edit Match Lifetime')
            .setStyle(ButtonStyle.Primary)
    );

    const backRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('astra_main_menu') // Back to main setup panel
            .setLabel('Back')
            .setStyle(ButtonStyle.Danger)
    );

    const payload = { embeds: [embed], components: [row, backRow] };
    if (interaction.isButton() || interaction.isModalSubmit()) {
        return await interaction.update(payload);
    }
    return await interaction.reply(payload);
}

// Phase 3: Ready System Setup Panel
async function showReadySystemPanel(interaction) {
    const config = await getGuildConfig(interaction.guildId);

    const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('✅ ASTRA Ready System Configuration')
        .setDescription('Configure how players confirm their readiness for a match.');

    embed.addFields(
        { name: 'Current Method', value: config.ready_method === 'button' ? 'Button' : 'Reaction', inline: true },
        { name: 'Ready Timeout', value: `${config.ready_timeout_seconds} seconds`, inline: true }
    );

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('guild_config_set_ready_method:button') // Custom ID to differentiate method change
            .setLabel('Set Button Ready')
            .setStyle(config.ready_method === 'button' ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('guild_config_set_ready_method:reaction') // Custom ID to differentiate method change
            .setLabel('Set Reaction Ready')
            .setStyle(config.ready_method === 'reaction' ? ButtonStyle.Success : ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('guild_config_modal:ready_timeout_seconds') // Reuses modal for timeout
            .setLabel('Edit Ready Timeout')
            .setStyle(ButtonStyle.Primary)
    );

    const backRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('astra_main_menu')
            .setLabel('Back')
            .setStyle(ButtonStyle.Danger)
    );

    const payload = { embeds: [embed], components: [row1, row2, backRow] };
    if (interaction.isButton() || interaction.isModalSubmit()) {
        return await interaction.update(payload);
    }
    return await interaction.reply(payload);
}

// Phase 4: Prefix Setup Panel
async function showPrefixPanel(interaction) {
    const config = await getGuildConfig(interaction.guildId);

    const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🔧 ASTRA Prefix Configuration')
        .setDescription('Configure the command prefix for the bot.');

    embed.addFields(
        { name: 'Current Prefix', value: `\`${config.prefix}\``, inline: false }
    );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('guild_config_modal:prefix')
            .setLabel('Change Prefix')
            .setStyle(ButtonStyle.Primary)
    );

    const backRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('astra_main_menu')
            .setLabel('Back')
            .setStyle(ButtonStyle.Danger)
    );

    const payload = { embeds: [embed], components: [row, backRow] };
    if (interaction.isButton() || interaction.isModalSubmit()) {
        return await interaction.update(payload);
    }
    return await interaction.reply(payload);
}

async function showQueueManagementPanel(
    interaction,
    queue
) {

    const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(
            `🛠️ ${queue.queue_name}`
        )
        .setDescription(
`Queue Size: ${queue.queue_size}

Channel:
<#${queue.channel_id}>`
        );

    const row1 =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        `queue_rename:${queue.id}`
                    )
                    .setLabel(
                        'Rename'
                    )
                    .setStyle(
                        ButtonStyle.Primary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        `queue_size:${queue.id}`
                    )
                    .setLabel(
                        'Change Size'
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        `queue_channel:${queue.id}`
                    )
                    .setLabel(
                        'Change Channel'
                    )
                    .setStyle(
                        ButtonStyle.Success
                    )
            );

    const row2 =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        `queue_delete:${queue.id}`
                    )
                    .setLabel(
                        'Delete'
                    )
                    .setStyle(
                        ButtonStyle.Danger
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        'astra_manage_custom_queues'
                    )
                    .setLabel('Back')
                    .setStyle(
                        ButtonStyle.Secondary
                    )
            );

    return interaction.update({
        content: '',
        embeds: [embed],
        components: [row1, row2]
    });
}
module.exports = {
    showChannelsPanel,
    showChannelSelector,
    showManageQueuesPanel,
    showQueueManagementPanel,
    showMainSetupPanel, // Export new main setup panel
    showTimersPanel,
    showReadySystemPanel,
    showPrefixPanel
};