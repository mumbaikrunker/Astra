const { query } = require('../../database/postgres');

async function ensureUser(discordId, username, rating = 1500) {
  const sql = `
    INSERT INTO users (discord_id, username, rating)
    VALUES ($1, $2, $3)
    ON CONFLICT (discord_id)
    DO UPDATE SET username = EXCLUDED.username
    RETURNING *
  `;
  const values = [discordId, username, rating];
  const result = await query(sql, values);
  return result.rows[0];
}

async function getUser(discordId) {
  const result = await query('SELECT * FROM users WHERE discord_id = $1', [discordId]);
  return result.rows[0] || null;
}

async function updateRating(discordId, newRating) {
  const sql = `
    UPDATE users
    SET rating = $1
    WHERE discord_id = $2
    RETURNING *
  `;
  const result = await query(sql, [newRating, discordId]);
  return result.rows[0];
}

async function updateRecord(discordId, resultType) {
  let sql;
  if (resultType === 'win') {
    sql = `
      UPDATE users
      SET wins = wins + 1,
          winstreak = winstreak + 1
      WHERE discord_id = $1
      RETURNING *
    `;
  } else if (resultType === 'loss') {
    sql = `
      UPDATE users
      SET losses = losses + 1,
          winstreak = 0
      WHERE discord_id = $1
      RETURNING *
    `;
  } else {
    sql = `
      UPDATE users
      SET winstreak = 0
      WHERE discord_id = $1
      RETURNING *
    `;
  }
  const result = await query(sql, [discordId]);
  return result.rows[0];
}

module.exports = { ensureUser, getUser, updateRating, updateRecord };
