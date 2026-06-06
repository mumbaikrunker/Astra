const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { getRuntimeConfig } = require('./configs/config');
const { loadCommands, loadEvents, commandRegistry } = require('./utils/handler');
const ErrorHandler = require('./utils/errorHandler');

const DEBUG = process.env.DEBUG === 'true';

// Initialize global error handlers immediately
ErrorHandler.initialize();

if (DEBUG) {
  console.log('[DEBUG] Starting bot in DEBUG mode');
  console.log('[DEBUG] Node:', process.version);
  console.log('[DEBUG] Time:', new Date().toISOString());
  console.log('[DEBUG] Env:', {
    DISCORD_TOKEN: !!process.env.DISCORD_TOKEN,
    CLIENT_ID: !!process.env.CLIENT_ID,
    GUILD_ID: process.env.GUILD_ID || 'global'
  });
}

// Proper intents (fixes most "commands not working" issues)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();

/**
 * Graceful shutdown handler
 */
function shutdown(signal) {
  console.log(`\n[BOT] Received ${signal}, shutting down...`);
  try {
    client.destroy();
  } catch (err) {
    console.error('[BOT] Error during shutdown:', err.message);
  }
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

/**
 * Main bot startup
 */
(async () => {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🤖 Astra Bot Starting...');
    console.log('='.repeat(60) + '\n');

    // Load commands
    console.log('[BOT] Loading commands...');
    const commandReport = await loadCommands(client);

    if (!commandReport?.isValid) {
      console.warn('[WARN] Some commands failed to load.');
    }

    if (DEBUG) {
      console.log('[DEBUG] Commands loaded:', commandRegistry.getStats());
    }

    // Load events
    console.log('[BOT] Loading events...');
    const eventReport = await loadEvents(client);

    if (!eventReport?.isValid) {
      console.warn('[WARN] Some events failed to load.');
    }

    if (DEBUG) {
      console.log('[DEBUG] Events:', eventReport.events?.map(e => e.name));
    }

    // Lock registry AFTER loading
    commandRegistry.lock();
    client.registry = commandRegistry;

    console.log('[BOT] Connecting to Discord...');

    const { token } = getRuntimeConfig();

    if (!token) {
      throw new Error('Missing DISCORD_TOKEN in environment variables');
    }

    await client.login(token);

    console.log(`[BOT] Logged in as ${client.user.tag}`);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ BOT FAILED TO START');
    console.error('='.repeat(60));

    console.error('Error:', error.message);

    if (DEBUG) {
      console.error('Stack:', error.stack);
    }

    if (error.message.includes('token')) {
      console.error('\nFix: Check DISCORD_TOKEN in .env');
    }

    if (error.message.includes('Missing')) {
      console.error('\nFix: One or more environment variables are missing');
      console.error('Required: DISCORD_TOKEN, CLIENT_ID');
    }

    process.exit(1);
  }
})();