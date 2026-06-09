const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Open the ASTRA setup panel'),

    async execute(interaction) {
        if (
            !interaction.member.permissions.has(
                PermissionsBitField.Flags.Administrator
            )
        ) {
            return interaction.reply({
                content:
                    '❌ Only administrators can use this command.',
                ephemeral: true
            });
        }

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

        await interaction.reply({
            embeds: [embed],
            components: [row1, row2],
        });
    }
};