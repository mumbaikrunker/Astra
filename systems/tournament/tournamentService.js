const { query, withTransaction } = require('../../database/postgres');

async function createTournament({ guildId, name, format, bestOf, organizerId, channelId }) {
  const sql = `
    INSERT INTO tournaments (
      guild_id,
      name,
      format,
      best_of,
      organizer_id,
      channel_id,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'draft')
    RETURNING *
  `;

  const result = await query(sql, [guildId, name, format, bestOf, organizerId, channelId]);
  return result.rows[0];
}

async function getTournament(id) {
  const result = await query('SELECT * FROM tournaments WHERE id = $1 LIMIT 1', [id]);
  return result.rows[0] || null;
}

async function listTournaments(guildId) {
  const result = await query('SELECT * FROM tournaments WHERE guild_id = $1 ORDER BY created_at DESC', [guildId]);
  return result.rows;
}

async function updateTournament(id, updates) {
  const fields = [];
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = $${index++}`);
    values.push(value);
  }

  if (!fields.length) return null;

  values.push(id);
  const sql = `UPDATE tournaments SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`;
  const result = await query(sql, values);
  return result.rows[0] || null;
}

async function deleteTournament(id) {
  const result = await query('DELETE FROM tournaments WHERE id = $1 RETURNING *', [id]);
  return result.rows[0] || null;
}

async function createTournamentTeam({ tournamentId, captainId, name, members }) {
  const sql = `
    INSERT INTO tournament_teams (
      tournament_id,
      captain_id,
      name,
      members,
      status
    )
    VALUES ($1, $2, $3, $4, 'registered')
    RETURNING *
  `;

  const result = await query(sql, [tournamentId, captainId, name, JSON.stringify(members)]);
  return result.rows[0];
}

async function getTournamentTeams(tournamentId) {
  const result = await query('SELECT * FROM tournament_teams WHERE tournament_id = $1 ORDER BY id ASC', [tournamentId]);
  return result.rows;
}

async function createTournamentMatch({ tournamentId, roundNumber, matchNumber, teamAId, teamBId, bestOf, status = 'pending' }) {
  const sql = `
    INSERT INTO tournament_matches (
      tournament_id,
      round_number,
      match_number,
      team_a_id,
      team_b_id,
      best_of,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const result = await query(sql, [tournamentId, roundNumber, matchNumber, teamAId, teamBId, bestOf, status]);
  return result.rows[0];
}

async function listTournamentMatches(tournamentId) {
  const result = await query('SELECT * FROM tournament_matches WHERE tournament_id = $1 ORDER BY round_number ASC, match_number ASC', [tournamentId]);
  return result.rows;
}

async function updateTournamentMatch(id, updates) {
  const fields = [];
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = $${index++}`);
    values.push(value);
  }

  if (!fields.length) return null;

  values.push(id);
  const sql = `UPDATE tournament_matches SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`;
  const result = await query(sql, values);
  return result.rows[0] || null;
}

module.exports = {
  createTournament,
  getTournament,
  listTournaments,
  updateTournament,
  deleteTournament,
  createTournamentTeam,
  getTournamentTeams,
  createTournamentMatch,
  listTournamentMatches,
  updateTournamentMatch,
};
