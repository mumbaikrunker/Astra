const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    EmbedBuilder
} = require('discord.js');
const { getMatch } = require('../systems/matchmaking/matchService');
const { query } = require('../database/postgres');

const rematchRequests = new Map();

async function handleResultInteraction(interaction, client) {
    if (!interaction.customId) return false; // Ensure customId exists
    const [action, matchId] = interaction.customId.split(':');

    // Rematch System
    if (action === 'match_rematch') {
        const match = await getMatch(matchId);
        if (!match) return interaction.reply({ content: '❌ Match not found.', ephemeral: true });

        const allPlayers = [...match.team_a, ...match.team_b];
        if (!allPlayers.find(p => p.userId === interaction.user.id)) {
            return interaction.reply({ content: '❌ Only players from this match can request a rematch.', ephemeral: true });
        }

        let request = rematchRequests.get(matchId);
        if (!request) {
            request = new Set();
            rematchRequests.set(matchId, request);
        }

        if (request.has(interaction.user.id)) {
            return interaction.reply({ content: '⚠️ You have already accepted the rematch.', ephemeral: true });
        }

        request.add(interaction.user.id);
        const needed = allPlayers.length;
        const current = request.size;

        if (current >= needed) {
            rematchRequests.delete(matchId);
            return await interaction.reply({
                content: `🚀 **Rematch Accepted!** All ${needed} players agreed. Re-queueing or starting match...`,
                components: []
            });
        }

        return await interaction.reply({
            content: `🔄 **Rematch Request:** ${interaction.user.username} wants a rematch! (${current}/${needed} accepted)`,
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`match_rematch:${matchId}`)
                        .setLabel('Accept Rematch')
                        .setStyle(ButtonStyle.Primary)
                )
            ]
        });
    }

    // MVP Voting Initiation
    if (action === 'match_vote_mvp') {
        const match = await getMatch(matchId);
        if (!match) return interaction.reply({ content: '❌ Match not found.', ephemeral: true });

        const players = [...match.team_a, ...match.team_b];
        
        const select = new StringSelectMenuBuilder()
            .setCustomId(`match_mvp_select:${matchId}`)
            .setPlaceholder('Select the MVP of this match')
            .addOptions(
                players.map(p => ({
                    label: p.name,
                    description: `Rating: ${p.rating}`,
                    value: p.userId
                }))
            );

        const row = new ActionRowBuilder().addComponents(select);

        return await interaction.reply({
            content: '🌟 Vote for the Most Valuable Player (MVP):',
            components: [row],
            ephemeral: true
        });
    }

    // MVP Selection Handling
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('match_mvp_select:')) {
        const matchId = interaction.customId.split(':')[1];
        const candidateId = interaction.values[0];

        try {
            const sql = `
                INSERT INTO mvp_votes (match_id, guild_id, voter_id, candidate_id)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (match_id, voter_id) DO UPDATE SET candidate_id = EXCLUDED.candidate_id
            `;
            await query(sql, [matchId, interaction.guildId, interaction.user.id, candidateId]);

            return await interaction.update({
                content: `✅ Your vote for <@${candidateId}> has been recorded!`,
                components: []
            });
        } catch (error) {
            console.error('MVP Vote error:', error);
            return await interaction.reply({ content: '❌ Failed to record vote.', ephemeral: true });
        }
    }

    return false;
}

module.exports = { handleResultInteraction };