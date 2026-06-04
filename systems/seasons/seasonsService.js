const { query } = require('../../database/postgres');

async function createSeason(guildId, name) {
  const sql = `INSERT INTO seasons (guild_id, name) VALUES ($1, $2) RETURNING *`;
  const result = await query(sql, [guildId, name]);
  return result.rows[0];
}

async function startSeason(seasonId) {
  const sql = `UPDATE seasons SET status = 'active', started_at = NOW() WHERE id = $1 RETURNING *`;
  const result = await query(sql, [seasonId]);
  return result.rows[0] || null;
}

async function endSeason(seasonId) {
  const sql = `UPDATE seasons SET status = 'completed', ended_at = NOW() WHERE id = $1 RETURNING *`;
  const result = await query(sql, [seasonId]);
  return result.rows[0] || null;
}

async function getSeason(seasonId) {
  const result = await query('SELECT * FROM seasons WHERE id = $1', [seasonId]);
  return result.rows[0] || null;
}

async function listSeasons(guildId) {
  const result = await query('SELECT * FROM seasons WHERE guild_id = $1 ORDER BY created_at DESC', [guildId]);
  return result.rows;
}

module.exports = { createSeason, startSeason, endSeason, getSeason, listSeasons };
