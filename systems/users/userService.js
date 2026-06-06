const { query } = require('../../database/postgres');

/**
 * Ensure user exists in DB (auto-register system)
 */
async function ensureUser(discordId, username) {
  const sql = `
    INSERT INTO users (discord_id, username)
    VALUES ($1, $2)
    ON CONFLICT (discord_id)
    DO UPDATE SET username = EXCLUDED.username
    RETURNING *;
  `;

  const result = await query(sql, [discordId, username]);
  return result.rows[0];
}

async function getUser(discordId) {
  const sql = `
    SELECT * FROM users
    WHERE discord_id = $1
  `;

  const result = await query(sql, [discordId]);
  return result.rows[0] || null;
}

module.exports = {
  ensureUser,
  getUser
};