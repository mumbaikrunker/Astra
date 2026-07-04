const { Pool } = require('pg');
const { getDatabaseConfig } = require('../configs/config');

let activePool = null;

function getPool() {
  if (!activePool) {
    const { databaseUrl } = getDatabaseConfig();
    activePool = new Pool({
      connectionString: databaseUrl,
    });

    activePool.on('error', (error) => {
      console.error('Unexpected PostgreSQL error:', error);
    });
  }

  return activePool;
}

async function query(text, params) {
  const result = await getPool().query(text, params);
  return result;
}

async function withTransaction(callback) {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Failed to rollback PostgreSQL transaction:', rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

const pool = {
  query: (...args) => getPool().query(...args),
  connect: (...args) => getPool().connect(...args),
  end: (...args) => (activePool ? activePool.end(...args) : Promise.resolve()),
};

module.exports = { pool, query, getPool, withTransaction };
