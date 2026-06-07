const { query } = require('../../database/postgres');

async function getTopPlayers(limit = 10) {
  const sql = `
    SELECT discord_id, username, rating, wins, losses
    FROM users
    ORDER BY rating DESC
    LIMIT $1
  `;

  const result = await query(sql, [limit]);
  return result.rows;
}

async function getUserRank(discordId) {
  const sql = `
    SELECT rank, rating, wins, losses, username
    FROM (
      SELECT
        discord_id,
        username,
        rating,
        wins,
        losses,
        RANK() OVER (ORDER BY rating DESC) AS rank
      FROM users
    ) ranked
    WHERE discord_id = $1
  `;

  const result = await query(sql, [discordId]);
  return result.rows[0] || null;
}

async function getUserProfile(discordId) {
  const sql = `
    SELECT
      rank,
      rating,
      wins,
      losses,
      username,
      winstreak,
      created_at
    FROM (
      SELECT
        discord_id,
        username,
        rating,
        wins,
        losses,
        winstreak,
        created_at,
        RANK() OVER (ORDER BY rating DESC) AS rank
      FROM users
    ) ranked
    WHERE discord_id = $1
  `;

  const result = await query(sql, [discordId]);
  return result.rows[0] || null;
}

async function getUserHistory(discordId, limit = 10) {
  const sql = `
    SELECT
      match_id,
      old_rating,
      new_rating,
      delta,
      note,
      changed_at
    FROM ratings
    WHERE user_id = $1
    ORDER BY changed_at DESC
    LIMIT $2
  `;

  const result = await query(sql, [discordId, limit]);
  return result.rows;
}

module.exports = {
  getTopPlayers,
  getUserRank,
  getUserProfile,
  getUserHistory
};