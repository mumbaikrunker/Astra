const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { enqueueItem, getQueue } = require('../utils/listStore');
const queueManager = require('../utils/queueManager');
const { getGuildConfig } = require('../systems/configs/guildConfigService');
const { createMatchFromQueue } = require('../systems/matchmaking/matchFactory');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add a player to the pickup queue')
    .addStringOption((option) =>
      option
        .setName('player')
        .setDescription('Player name')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('rating')
        .setDescription('Player rating (defaults to 1500)')
        .setRequired(false)
    ),
  async execute(interaction) {
    const player = interaction.options.getString('player', true).trim();
    const guildConfig = await getGuildConfig(interaction.guildId);
    const rating = interaction.options.getInteger('rating') ?? guildConfig.default_player_rating;
    const result = await enqueueItem(interaction.guildId, interaction.user.id, player, rating, guildConfig.queue_max_size);

    let title = 'Queue Error';
    let color = 'Yellow';
    let description = 'An error occurred.';

    if (result.success) {
      title = 'Player Queued';
      color = 'Green';
      description = `Added **${player}** (Rating: **${rating}**) to the queue. (${result.currentSize}/${guildConfig.queue_max_size})`;
    } else if (result.reason === 'duplicate') {
      title = 'Duplicate Player';
      color = 'Yellow';
      description = `You are already in the queue.`;
    } else if (result.reason === 'full') {
      title = 'Queue Full';
      color = 'Yellow';
      description = `The queue has reached its maximum size of **${guildConfig.queue_max_size}**.`;
    } else if (result.reason === 'banned') {
      title = 'You are banned from the queue';
      color = 'Red';
      description = `You are currently banned from joining queues.` + (result.expiresAt ? ` Ban expires at ${new Date(result.expiresAt).toUTCString()}` : '');
    }

    const embed = new EmbedBuilder().setTitle(title).setColor(color).setDescription(description).setFooter({ text: `Queue limit: ${guildConfig.queue_max_size}` }).setTimestamp();

    await interaction.reply({ embeds: [embed] });
    try {
      queueManager.setClient(interaction.client);
      await queueManager.upsertQueueMessage(interaction);
    } catch (err) {
      console.error('Failed to update live queue message after add:', err);
    }

    if (result.success) {
      const queue = getQueue(interaction.guildId);
      if (queue.length >= guildConfig.queue_max_size) {
        try {
          const matchSummary = await createMatchFromQueue(interaction, queue, guildConfig.match_lifetime_seconds);
          await interaction.followUp({ embeds: [matchSummary.summaryEmbed], ephemeral: false });
        } catch (err) {
          console.error('Auto match creation failed:', err);
        }
      }
    }
  },
};
