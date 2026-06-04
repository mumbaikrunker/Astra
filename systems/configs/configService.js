const { query } = require('../../database/postgres');

async function getConfig(guildId, key) {
  const sql = `SELECT value FROM configs WHERE guild_id = $1 AND key = $2 LIMIT 1`;
  const res = await query(sql, [guildId, key]);
  return res.rows[0] ? res.rows[0].value : null;
}

async function setConfig(guildId, key, value) {
  const sql = `
    INSERT INTO configs (guild_id, key, value)
    VALUES ($1, $2, $3)
    ON CONFLICT (guild_id, key)
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    RETURNING *
  `;
  const res = await query(sql, [guildId, key, String(value)]);
  return res.rows[0];
}

async function deleteConfig(guildId, key) {
  const sql = `DELETE FROM configs WHERE guild_id = $1 AND key = $2 RETURNING *`;
  const res = await query(sql, [guildId, key]);
  return res.rows[0] || null;
}

async function listConfigs(guildId) {
  const sql = `SELECT key, value, updated_at FROM configs WHERE guild_id = $1 ORDER BY key`;
  const res = await query(sql, [guildId]);
  return res.rows;
}

module.exports = { getConfig, setConfig, deleteConfig, listConfigs };
