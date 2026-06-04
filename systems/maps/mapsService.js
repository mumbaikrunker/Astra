const { query } = require('../../database/postgres');

async function createMap(guildId, name, pool = 'default', createdBy = null) {
  const sql = `
    INSERT INTO maps (guild_id, name, pool, created_by)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const result = await query(sql, [guildId, name, pool, createdBy]);
  return result.rows[0];
}

async function deleteMap(guildId, mapId) {
  const sql = `DELETE FROM maps WHERE guild_id = $1 AND id = $2 RETURNING *`;
  const result = await query(sql, [guildId, mapId]);
  return result.rows[0] || null;
}

async function listMaps(guildId, pool = null) {
  let sql = `SELECT id, name, pool, enabled, created_by, created_at FROM maps WHERE guild_id = $1`;
  const params = [guildId];
  if (pool) {
    sql += ` AND pool = $2`;
    params.push(pool);
  }
  sql += ` ORDER BY name ASC`;
  const result = await query(sql, params);
  return result.rows;
}

async function getMap(mapId) {
  const result = await query('SELECT * FROM maps WHERE id = $1', [mapId]);
  return result.rows[0] || null;
}

module.exports = { createMap, deleteMap, listMaps, getMap };
