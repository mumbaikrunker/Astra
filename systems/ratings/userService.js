const { query } = require('../../database/postgres');

async function ensureUser(discordId, username) {
  const sql = `
    INSERT INTO users (
      discord_id,
      username,
      rating,
      wins,
      losses,
      winstreak
    )
    VALUES ($1,$2,1500,0,0,0)
    ON CONFLICT (discord_id)
    DO UPDATE SET username = EXCLUDED.username
    RETURNING *;
  `;

  const result = await query(sql, [discordId, username]);
  return result.rows[0];
}

async function getUser(discordId) {
  const result = await query(
    `
    SELECT *
    FROM users
    WHERE discord_id = $1
    `,
    [discordId]
  );

  return result.rows[0] || null;
}

async function updateRating(discordId, rating) {
  const result = await query(
    `
    UPDATE users
    SET rating = $1
    WHERE discord_id = $2
    RETURNING *
    `,
    [rating, discordId]
  );

  return result.rows[0];
}

async function updateRecord(discordId, resultType) {
  if (resultType === 'win') {
    await query(
      `
      UPDATE users
      SET
        wins = wins + 1,
        winstreak = winstreak + 1
      WHERE discord_id = $1
      `,
      [discordId]
    );
  }

  if (resultType === 'loss') {
    await query(
      `
      UPDATE users
      SET
        losses = losses + 1,
        winstreak = 0
      WHERE discord_id = $1
      `,
      [discordId]
    );
  }
}

module.exports = {
  ensureUser,
  getUser,
  updateRating,
  updateRecord
};