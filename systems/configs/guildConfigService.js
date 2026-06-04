const { query } = require('../../database/postgres');

async function createGuildConfig(guildId) {
  const sql = `
    INSERT INTO guild_configs (guild_id)
    VALUES ($1)
    ON CONFLICT (guild_id) DO NOTHING
  `;
  await query(sql, [guildId]);
  return getGuildConfig(guildId);
}

async function getGuildConfig(guildId) {
  const sql = `
    SELECT guild_id, queue_max_size, default_player_rating,
      match_lifetime_seconds, ready_timeout_seconds
    FROM guild_configs
    WHERE guild_id = $1
    LIMIT 1
  `;
  const res = await query(sql, [guildId]);
  if (res.rows[0]) {
    return res.rows[0];
  }
  return createGuildConfig(guildId);
}

async function updateGuildConfig(guildId, key, value) {
  const allowed = {
    queue_max_size: 'queue_max_size',
    default_player_rating: 'default_player_rating',
    match_lifetime_seconds: 'match_lifetime_seconds',
    ready_timeout_seconds: 'ready_timeout_seconds',
  };
  const column = allowed[key];
  if (!column) {
    throw new Error(`Unsupported guild config key: ${key}`);
  }

  const sql = `
    UPDATE guild_configs
    SET ${column} = $1
    WHERE guild_id = $2
    RETURNING guild_id, queue_max_size, default_player_rating, match_lifetime_seconds, ready_timeout_seconds
  `;

  const res = await query(sql, [value, guildId]);
  if (res.rows[0]) {
    return res.rows[0];
  }

  await createGuildConfig(guildId);
  return updateGuildConfig(guildId, key, value);
}

async function resetGuildConfig(guildId) {
  const sql = `
    UPDATE guild_configs
    SET queue_max_size = 10,
        default_player_rating = 1500,
        match_lifetime_seconds = 600,
        ready_timeout_seconds = 90
    WHERE guild_id = $1
    RETURNING guild_id, queue_max_size, default_player_rating, match_lifetime_seconds, ready_timeout_seconds
  `;

  const res = await query(sql, [guildId]);
  if (res.rows[0]) {
    return res.rows[0];
  }

  await createGuildConfig(guildId);
  return getGuildConfig(guildId);
}

module.exports = { getGuildConfig, createGuildConfig, updateGuildConfig, resetGuildConfig };