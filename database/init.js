const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
const { getDatabaseConfig } = require('../configs/config');

async function initializeDatabase() {
  const { databaseUrl } = getDatabaseConfig();
  const pool = new Pool({ connectionString: databaseUrl });
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = await fs.readFile(schemaPath, 'utf8');

  try {
    console.log('Initializing Astra database schema...');
    await pool.query(schema);

    const migrations = [
      `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS report_timeout_seconds INTEGER NOT NULL DEFAULT 1800`,
      `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS prefix TEXT NOT NULL DEFAULT '!'`,
      `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS queue_type TEXT NOT NULL DEFAULT '2v2'`,
      `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS ready_method TEXT NOT NULL DEFAULT 'button'`,
      `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS match_counter INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS two_v_two_channel_id TEXT`,
      `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS three_v_three_channel_id TEXT`,
      `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS four_v_four_channel_id TEXT`,
      `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS custom_queue_channel_id TEXT`,
      `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS results_channel_id TEXT`,
      `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS changable_results_for_admins BOOLEAN NOT NULL DEFAULT FALSE`,
      `ALTER TABLE guild_configs ADD COLUMN IF NOT EXISTS admin_results_channel_id TEXT`
    ];

    for (const statement of migrations) {
      await pool.query(statement);
    }

    console.log('Database schema initialized successfully.');
  } catch (error) {
    console.error('Database schema initialization failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  initializeDatabase().catch((error) => {
    process.exit(1);
  });
}

module.exports = { initializeDatabase };
