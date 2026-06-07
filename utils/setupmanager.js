const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const {
    getGuildConfig
} = require('../systems/configs/guildConfigService');

async function showChannelsPanel(interaction) {
    try {
        const config = await getGuildConfig(interaction.guildId);

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
                .setCustomId('astra_set_custom')
                .setLabel('Set Custom')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('astra_set_results')
                .setLabel('Set Results')
                .setStyle(ButtonStyle.Success)
        );

        return await interaction.reply({
            embeds: [embed],
            components: [row1, row2],
            ephemeral: true
        });

    } catch (error) {
        console.error('[SETUP MANAGER ERROR]', error);

        if (!interaction.replied) {
            return await interaction.reply({
                content: `❌ Setup error: ${error.message}`,
                ephemeral: true
            });
        }
    }
}

module.exports = {
    showChannelsPanel
};