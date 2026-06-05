require('dotenv').config();

function getMissing(keys) {
  return keys.filter((key) => !process.env[key]);
}

function requireEnv(keys, context = 'configuration') {
  const missing = getMissing(keys);
  if (missing.length) {
    throw new Error(`Missing ${context} environment variables: ${missing.join(', ')}`);
  }
}

function getDiscordConfig() {
  requireEnv(['DISCORD_TOKEN', 'CLIENT_ID'], 'Discord');
  return {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
  };
}

function getDatabaseConfig() {
  requireEnv(['DATABASE_URL'], 'database');
  return {
    databaseUrl: process.env.DATABASE_URL,
  };
}

function getRuntimeConfig() {
  requireEnv(['DISCORD_TOKEN', 'CLIENT_ID', 'DATABASE_URL'], 'runtime');
  return {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    databaseUrl: process.env.DATABASE_URL,
  };
}

module.exports = {
  getDiscordConfig,
  getDatabaseConfig,
  getRuntimeConfig,
  requireEnv,
};
