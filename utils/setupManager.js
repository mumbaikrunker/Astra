const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    ChannelType
} = require('discord.js');

const {
    getGuildConfig
} = require('../systems/configs/guildConfigService');

const {
    getCustomQueues
} = require('../systems/matchmaking/customQueueService');

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

**Custom Queue**
${config.custom_queue_channel_id ? `<#${config.custom_queue_channel_id}>` : 'Not Set'}

**Results Channel**
${config.results_channel_id ? `<#${config.results_channel_id}>` : 'Not Set'}`
            );

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

const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
        .setCustomId('astra_back_setup')
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

module.exports = {
    showChannelsPanel,
    showChannelSelector
};