const { Pool } = require('pg');
const { databaseUrl } = require('../configs/config');

const pool = new Pool({
  connectionString: databaseUrl,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL error:', error);
});

async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

module.exports = { pool, query };
