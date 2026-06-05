const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
const { getDatabaseConfig } = require('../configs/config');

async function main() {
  const { databaseUrl } = getDatabaseConfig();
  const pool = new Pool({ connectionString: databaseUrl });
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = await fs.readFile(schemaPath, 'utf8');

  try {
    console.log('Initializing Astra database schema...');
    await pool.query(schema);
    console.log('Database schema initialized successfully.');
  } catch (error) {
    console.error('Database schema initialization failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
