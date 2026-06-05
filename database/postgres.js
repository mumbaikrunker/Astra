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

const pool = {
  query: (...args) => getPool().query(...args),
  connect: (...args) => getPool().connect(...args),
  end: (...args) => (activePool ? activePool.end(...args) : Promise.resolve()),
};

module.exports = { pool, query, getPool };
