const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ensureUser } = require('../systems/users/userService');
const { getUserProfile } = require('../systems/ratings/leaderboardService');

function getTier(rating) {
    if (rating >= 3500) return 'Kracked';
    if (rating >= 3000) return 'Master';
    if (rating >= 2300) return 'Diamond';
    if (rating >= 2000) return 'Platinum';
    if (rating >= 1100) return 'Gold';
    if (rating >= 400) return 'Silver';
    return 'Bronze';
}

function getTierColor(rating) {
    if (rating >= 3500) return 0xff4655;
    if (rating >= 3000) return 0x9b59b6;
    if (rating >= 2300) return 0x3498db;
    if (rating >= 2000) return 0x2ecc71;
    if (rating >= 1100) return 0xf1c40f;
    if (rating >= 400) return 0x95a5a6;
    return 0x7f8c8d;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your Astra competitive profile'),

    async execute(interaction) {
        try {
            await ensureUser(
                interaction.user.id,
                interaction.user.username
            );

            const userData = await getUserProfile(
                interaction.user.id
            );

            if (!userData) {
                return interaction.reply({
                    content: 'No profile data found.',
                    ephemeral: true
                });
            }

            const wins = userData.wins || 0;
            const losses = userData.losses || 0;
            const totalGames = wins + losses;

            const winRate = totalGames > 0
                ? ((wins / totalGames) * 100).toFixed(1)
                : '0.0';

            const tier = getTier(userData.rating || 1500);

            const registeredDate = userData.created_at
                ? new Date(userData.created_at).toLocaleDateString()
                : 'Unknown';

            const embed = new EmbedBuilder()
                .setColor(getTierColor(userData.rating || 1500))
                .setAuthor({
                    name: '👤 ASTRA Profile'
                })
                .setThumbnail(
                    interaction.user.displayAvatarURL({
                        size: 256
                    })
                )
                .setDescription(
`**Player:** ${interaction.user.username}

🏆 **Competitive**
• Rank: #${userData.rank || 'N/A'}
• Tier: ${tier}
• Rating: ${userData.rating || 1500}

📊 **Statistics**
• Wins: ${wins}
• Losses: ${losses}
• Matches Played: ${totalGames}
• Win Rate: ${winRate}%

🔥 **Current Streak**
• ${userData.winstreak || 0} Wins

📅 **Registered**
• ${registeredDate}

━━━━━━━━━━━━━━━━━━
ASTRA Competitive System`
                )
                .setFooter({
                    text: `${tier} • Rank #${userData.rank || 'N/A'}`
                })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed]
            });

        } catch (error) {
            console.error('Profile command error:', error);

            if (!interaction.replied) {
                return interaction.reply({
                    content: 'An error occurred while loading your profile.',
                    ephemeral: true
                });
            }
        }
    }
};