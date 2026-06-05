const { query } = require('../../database/postgres');
const { ensureUser } = require('../ratings/userService');
const { removeByUserId } = require('../../utils/listStore');
const { updateQueueMessage } = require('../../utils/queueManager');

async function ensureUserExists(userId, username = null) {
  const fallbackUsername = username || `Unknown User (${userId})`;
  return ensureUser(userId, fallbackUsername);
}

async function createPunishment({ guildId, userId, username = null, moderatorId = null, type, reason = null, lengthSeconds = null }) {
  const expiresAt = lengthSeconds ? new Date(Date.now() + lengthSeconds * 1000) : null;
  const sql = `
    INSERT INTO punishments (guild_id, user_id, moderator_id, type, reason, length_seconds, expires_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *
  `;
  const values = [guildId, userId, moderatorId, type, reason, lengthSeconds, expiresAt];
  let row;

  try {
    await ensureUserExists(userId, username);
    const res = await query(sql, values);
    row = res.rows[0];
  } catch (error) {
    console.error('Failed to create punishment:', {
      guildId,
      userId,
      type,
      error: error.message,
    });
    throw error;
  }

  // enforcement: if queueban, remove user from live queue and update the live queue message
  if (type === 'queueban') {
    try {
      removeByUserId(guildId, userId);
      await updateQueueMessage(guildId);
    } catch (err) {
      console.error('Failed to enforce queue ban removal:', err);
    }
  }

  return row;
}

async function removePunishment(guildId, userId, type) {
  const sql = `DELETE FROM punishments WHERE guild_id = $1 AND user_id = $2 AND type = $3 RETURNING *`;
  const res = await query(sql, [guildId, userId, type]);
  return res.rows[0] || null;
}

async function getActivePunishment(guildId, userId, type) {
  const sql = `SELECT * FROM punishments WHERE guild_id=$1 AND user_id=$2 AND type=$3 ORDER BY created_at DESC LIMIT 1`;
  const res = await query(sql, [guildId, userId, type]);
  return res.rows[0] || null;
}

module.exports = { createPunishment, removePunishment, getActivePunishment, ensureUserExists };
