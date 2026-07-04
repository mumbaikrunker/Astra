const { query } = require('../../database/postgres');

async function createMatch({ guildId, creatorId, matchName, teamA, teamB }) {
  const text = `
    INSERT INTO matches (guild_id, creator_id, match_name, team_a, team_b, status)
    VALUES ($1, $2, $3, $4, $5, 'active')
    RETURNING id, created_at
  `;
  const values = [guildId, creatorId, matchName, JSON.stringify(teamA), JSON.stringify(teamB)];
  const result = await query(text, values);
  return result.rows[0];
}

async function getMatch(matchId) {
  const result = await query('SELECT * FROM matches WHERE id = $1', [matchId]);
  return result.rows[0] || null;
}

async function updateMatchStatus(matchId, status, resultPayload = null, client = null) {
  const sql = `
    UPDATE matches
    SET status = $1,
        result = $2,
        ended_at = NOW()
    WHERE id = $3
    RETURNING *
  `;
  const values = [status, resultPayload ? JSON.stringify(resultPayload) : null, matchId];
  const runQuery = client ? client.query.bind(client) : query;
  const result = await runQuery(sql, values);
  return result.rows[0];
}

async function getActiveMatches(guildId) {
  const sql = `
    SELECT * FROM matches
    WHERE guild_id = $1 AND status = 'active'
    ORDER BY created_at DESC
  `;
  const result = await query(sql, [guildId]);
  return result.rows;
}

async function deleteMatch(matchId, client = null) {
  const runQuery = client ? client.query.bind(client) : query;
  const result = await runQuery('DELETE FROM matches WHERE id = $1 RETURNING *', [matchId]);
  return result.rows[0] || null;
}

module.exports = {
  createMatch,
  getMatch,
  updateMatchStatus,
  getActiveMatches,
  deleteMatch,
};
