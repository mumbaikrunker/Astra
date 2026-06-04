require('dotenv').config();

const requiredEnv = ['DISCORD_TOKEN', 'CLIENT_ID', 'DATABASE_URL'];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing environment variables: ${missing.join(', ')}`);
}

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  databaseUrl: process.env.DATABASE_URL,
};
