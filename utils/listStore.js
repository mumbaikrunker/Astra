const { query } = require('../database/postgres');
const guildQueues = new Map();

function getQueue(guildId) {
  if (!guildQueues.has(guildId)) {
    guildQueues.set(guildId, []);
  }
  return guildQueues.get(guildId);
}

function findEntry(queue, userId, name) {
  return queue.find((entry) => entry.userId === userId || entry.name.toLowerCase() === name.toLowerCase());
}

async function enqueueItem(guildId, userId, name, rating, limit) {
  // check for active queue ban in DB
  try {
    const sql = `SELECT id, expires_at FROM punishments WHERE guild_id = $1 AND user_id = $2 AND type = 'queueban' ORDER BY created_at DESC LIMIT 1`;
    const res = await query(sql, [guildId, userId]);
    if (res.rows[0]) {
      const row = res.rows[0];
      const expiresAt = row.expires_at;
      if (!expiresAt || new Date(expiresAt) > new Date()) {
        return { success: false, reason: 'banned', expiresAt };
      }
    }
  } catch (err) {
    console.error('Failed to check punishments in enqueueItem:', err);
    // proceed — fail open
  }

  const queue = getQueue(guildId);
  if (findEntry(queue, userId, name)) {
    return { success: false, reason: 'duplicate' };
  }

  if (queue.length >= limit) {
    return { success: false, reason: 'full', limit };
  }

  queue.push({ userId, name, rating });
  return { success: true, currentSize: queue.length, limit };
}

function removeItem(guildId, name) {
  const queue = getQueue(guildId);
  const index = queue.findIndex((entry) => entry.name.toLowerCase() === name.toLowerCase());
  if (index === -1) {
    return false;
  }

  queue.splice(index, 1);
  return true;
}

function removeByUserId(guildId, userId) {
  const queue = getQueue(guildId);
  const index = queue.findIndex((entry) => entry.userId === userId);
  if (index === -1) return false;
  queue.splice(index, 1);
  return true;
}

function clearQueue(guildId) {
  guildQueues.set(guildId, []);
}

function setQueue(guildId, items) {
  // store a shallow copy to avoid external mutations
  guildQueues.set(guildId, Array.isArray(items) ? items.map((it) => ({ ...it })) : []);
}

module.exports = { getQueue, enqueueItem, removeItem, removeByUserId, clearQueue, setQueue };
