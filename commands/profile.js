const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { ensureUser } = require('../systems/users/userService');
const { getUserProfile } = require('../systems/ratings/leaderboardService');

function getTier(rating) {
  if (rating >= 2200) return 'Master';
  if (rating >= 1900) return 'Diamond';
  if (rating >= 1600) return 'Platinum';
  if (rating >= 1400) return 'Gold';
  if (rating >= 1200) return 'Silver';
  return 'Bronze';
}

function getTierColor(rating) {
  if (rating >= 2200) return 0xe74c3c;
  if (rating >= 1900) return 0x9b59b6;
  if (rating >= 1600) return 0x3498db;
  if (rating >= 1400) return 0xf1c40f;
  if (rating >= 1200) return 0x95a5a6;
  return 0x7f8c8d;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View a player's competitive profile'),

async execute(interaction) {
      await ensureUser(
        interaction.user.id,
      interaction.user.username
);

```
const userData = await getUserProfile(interaction.user.id);

if (!userData) {
  return interaction.reply({
    content: 'No profile data found.',
    ephemeral: true
  });
}

const member = interaction.member;

const totalGames =
  (userData.wins || 0) +
  (userData.losses || 0);

const winRate =
  totalGames > 0
    ? ((userData.wins / totalGames) * 100).toFixed(1)
    : '0.0';

const tier = getTier(userData.rating);

const joinedDiscord =
  Math.floor(interaction.user.createdTimestamp / 1000);

const joinedServer =
  member?.joinedTimestamp
    ? Math.floor(member.joinedTimestamp / 1000)
    : null;

const registeredDate =
  userData.created_at
    ? Math.floor(
        new Date(userData.created_at).getTime() / 1000
      )
    : null;

const embed = new EmbedBuilder()
  .setColor(getTierColor(userData.rating))
  .setAuthor({
    name: `${ interaction.user.username } `,
    iconURL: interaction.user.displayAvatarURL({
      dynamic: true
    })
  })
  .setThumbnail(
    interaction.user.displayAvatarURL({
      dynamic: true,
      size: 512
    })
  )
  .setTitle('ASTRA PLAYER PROFILE')
  .addFields(
    {
      name: 'PLAYER INFORMATION',
      value:
        [
          `Username: ${ interaction.user.username } `,
          `Display Name: ${ member?.displayName || interaction.user.username } `,
          joinedServer
            ? `Joined Server: <t:${joinedServer}: D>`
  : null,
  `Joined Discord: <t:${joinedDiscord}:D>`
  ]
  .filter(Boolean)
  .join('\n'),
  inline: false
    },
  {
    name: 'COMPETITIVE STATISTICS',
  value:
  [
  `Rank: #${userData.rank}`,
  `Rating: ${userData.rating}`,
  `Tier: ${tier}`,
  `Current Streak: ${userData.winstreak || 0}`
  ].join('\n'),
  inline: false
    },
  {
    name: 'MATCH HISTORY',
  value:
  [
  `Wins: ${userData.wins}`,
  `Losses: ${userData.losses}`,
  `Matches Played: ${totalGames}`,
  `Win Rate: ${winRate}%`
  ].join('\n'),
  inline: false
    },
  {
    name: 'ACCOUNT STATUS',
  value:
  [
  'Queue Banned: No',
  'Warnings: 0',
  'Timeouts: 0',
  registeredDate
  ? `Registered: <t:${registeredDate}:D>`
  : null
  ]
  .filter(Boolean)
  .join('\n'),
  inline: false
    }
  )
  .setFooter({
    text: `Astra Competitive System • ${tier}`
  })
  .setTimestamp();

  await interaction.reply({
    embeds: [embed]
});
  ```

}
};
