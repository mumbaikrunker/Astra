const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token } = require('./configs/config');
const { loadCommands, loadEvents, commandRegistry } = require('./utils/handler');

/**
 * Bot Entry Point - Production Ready
 *
 * Features:
 * - Centralized command registry initialization
 * - Safe startup with error recovery
 * - Clean shutdown handling
 */

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

/**
 * Main startup sequence
 */
(async () => {
  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🤖 [BOT] Starting Astra Discord Bot`);
    console.log(`${'='.repeat(80)}\n`);

    // Load commands using centralized registry
    console.log(`[BOT] Loading command system...\n`);
    const commandReport = await loadCommands(client);

    if (!commandReport.isValid) {
      console.warn(`\n⚠️  WARNING: Command loading completed with ${commandReport.totalErrors} error(s)`);
      console.warn(`   The bot will continue but some commands may not work\n`);
    }

    // Load events
    console.log(`[BOT] Loading event system...\n`);
    const eventReport = await loadEvents(client);

    if (!eventReport.isValid) {
      console.warn(`\n⚠️  WARNING: Event loading completed with ${eventReport.totalErrors} error(s)\n`);
    }

    // Lock registry after loading
    commandRegistry.lock();

    // Initialize client with registry reference
    client.registry = commandRegistry;

    // Attempt login
    console.log(`[BOT] Connecting to Discord...\n`);
    await client.login(token);

    // Setup graceful shutdown
    process.on('SIGINT', () => {
      console.log(`\n[BOT] Received shutdown signal, logging out...`);
      client.destroy();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log(`\n[BOT] Received termination signal, logging out...`);
      client.destroy();
      process.exit(0);
    });

  } catch (error) {
    console.error(`\n${'='.repeat(80)}`);
    console.error(`❌ [BOT] STARTUP FAILED`);
    console.error(`${'='.repeat(80)}\n`);
    console.error(`Error: ${error.message}\n`);

    if (error.message.includes('token')) {
      console.error(`🔧 Troubleshooting: Invalid or missing bot token`);
      console.error(`   • Check DISCORD_TOKEN in .env file`);
      console.error(`   • Verify token is valid and not revoked\n`);
    } else if (error.message.includes('ENOENT')) {
      console.error(`🔧 Troubleshooting: File system error`);
      console.error(`   • Check that command/event directories exist`);
      console.error(`   • Verify file permissions\n`);
    }

    console.error(`Stack: ${error.stack}\n`);
    process.exit(1);
  }
})();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[BOT] Uncaught Exception:', error);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('[BOT] Unhandled Promise Rejection:', error);
});
