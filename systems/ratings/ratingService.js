const { query, withTransaction } = require('../../database/postgres');
const { getUser, ensureUser, updateRating, updateRecord } = require('./userService');
const { updateMatchStatus } = require('../matchmaking/matchService');
const { calculateElo } = require('./elo');

async function applyMatchRatings(matchId, teamA, teamB, outcome, client = null) {
  const teamARatings = await Promise.all(teamA.map((player) => getOrCreatePlayer(player, client)));
  const teamBRatings = await Promise.all(teamB.map((player) => getOrCreatePlayer(player, client)));

  const avgA = average(teamARatings.map((player) => player.rating));
  const avgB = average(teamBRatings.map((player) => player.rating));

  const actualA = outcome === 'A' ? 1 : outcome === 'TIE' ? 0.5 : 0;
  const actualB = outcome === 'B' ? 1 : outcome === 'TIE' ? 0.5 : 0;

  const results = [];

  for (const player of teamARatings) {
    const { newA, deltaA } = calculateElo(player.rating, avgB, actualA, actualB);
    await updateRating(player.discord_id, newA, client);
    await recordRatingChange(player.discord_id, matchId, player.rating, newA, deltaA, `Team A ${outcome === 'A' ? 'win' : outcome === 'TIE' ? 'tie' : 'loss'}`, client);
    await updateRecord(player.discord_id, outcome === 'A' ? 'win' : outcome === 'TIE' ? 'draw' : 'loss', client);
    results.push({ userId: player.discord_id, name: player.username, oldRating: player.rating, newRating: newA, delta: deltaA });
  }

  for (const player of teamBRatings) {
    const { newB, deltaB } = calculateElo(player.rating, avgA, actualB, actualA);
    await updateRating(player.discord_id, newB, client);
    await recordRatingChange(player.discord_id, matchId, player.rating, newB, deltaB, `Team B ${outcome === 'B' ? 'win' : outcome === 'TIE' ? 'tie' : 'loss'}`, client);
    await updateRecord(player.discord_id, outcome === 'B' ? 'win' : outcome === 'TIE' ? 'draw' : 'loss', client);
    results.push({ userId: player.discord_id, name: player.username, oldRating: player.rating, newRating: newB, delta: deltaB });
  }

  return results;
}

async function getOrCreatePlayer(player, client = null) {
  const existing = await getUser(player.userId, client);
  if (existing) {
    return existing;
  }
  return ensureUser(player.userId, player.name, client, player.rating || 1500);
}

function average(values) {
  if (!values.length) return 1500;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

async function recordRatingChange(userId, matchId, oldRating, newRating, delta, note, client = null) {
  const sql = `
    INSERT INTO ratings (user_id, match_id, old_rating, new_rating, delta, note)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  const runQuery = client ? client.query.bind(client) : query;
  await runQuery(sql, [userId, matchId, oldRating, newRating, delta, note]);
}

async function finalizeMatchResult({ matchId, teamA, teamB, outcome, resultPayload }) {
  return withTransaction(async (client) => {
    const ratingChanges = await applyMatchRatings(matchId, teamA, teamB, outcome, client);
    const updatedMatch = await updateMatchStatus(matchId, 'complete', resultPayload, client);
    return { ratingChanges, updatedMatch };
  });
}

module.exports = { applyMatchRatings, finalizeMatchResult };
