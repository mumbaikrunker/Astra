const { query } = require('../../database/postgres');

async function ensureUser(discordId, username, client = null) {
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

  const runQuery = client ? client.query.bind(client) : query;
  const result = await runQuery(sql, [discordId, username]);
  return result.rows[0];
}

async function getUser(discordId, client = null) {
  const runQuery = client ? client.query.bind(client) : query;
  const result = await runQuery(
    `
    SELECT *
    FROM users
    WHERE discord_id = $1
    `,
    [discordId]
  );

  return result.rows[0] || null;
}

async function updateRating(discordId, rating, client = null) {
  const runQuery = client ? client.query.bind(client) : query;
  const result = await runQuery(
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

async function updateRecord(discordId, resultType, client = null) {
  const runQuery = client ? client.query.bind(client) : query;

  if (resultType === 'win') {
    await runQuery(
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
    await runQuery(
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