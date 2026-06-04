const { setClient: setReadyClient } = require('../utils/readyManager');
const { setClient: setQueueClient } = require('../utils/queueManager');
const { Routes } = require('discord.js');

const DEBUG = process.env.DEBUG === 'true';

/**
 * Production-Ready Startup Dashboard
 *
 * Displays comprehensive system status using registry data
 * Integrated validation, deployment checks, and initialization
 */
module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    const startupTime = Date.now();

    if (DEBUG) {
      console.log(`[DEBUG] Ready event triggered`);
      console.log(`[DEBUG] Bot tag: ${client.user.tag}`);
      console.log(`[DEBUG] Bot ID: ${client.user.id}`);
      console.log(`[DEBUG] Timestamp: ${new Date().toISOString()}`);
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ [READY] Bot Connected: ${client.user.tag}`);
    console.log(`${'='.repeat(80)}\n`);

    try {
      // Get registry data
      const registry = client.registry;
      const registryStats = registry.getStats();
      const commandNames = registry.getNames();

      if (DEBUG) {
        console.log(`[DEBUG] Registry stats:`, registryStats);
      }

      // ===== COMMAND STATUS DASHBOARD =====
      console.log(`[COMMANDS] Registry Status:\n`);

      const statusIcon = registryStats.totalErrors === 0 ? '✅' : '⚠️';
      console.log(`  ${statusIcon} Loaded: ${registryStats.totalCommands} commands`);

      if (registryStats.totalCommands > 0) {
        console.log(`\n  📋 Command List:`);
        commandNames.forEach((cmd, idx) => {
          const num = String(idx + 1).padStart(2, ' ');
          console.log(`     ${num}. /${cmd}`);
        });
      }

      // Display validation results
      if (registryStats.totalErrors > 0) {
        console.log(`\n  ⚠️  Validation Issues Found:\n`);
        const errors = registry.getErrors();
        errors.slice(0, 5).forEach((error, idx) => {
          console.log(`     ${idx + 1}. ${error.reason}`);
          console.log(`        File: ${error.file}\n`);
        });

        if (errors.length > 5) {
          console.log(`     ... and ${errors.length - 5} more issues\n`);
        }

        if (DEBUG) {
          console.log(`[DEBUG] Full error list:`, errors);
        }
      }
      console.log();

      // ===== DISCORD SYNC CHECK =====
      console.log(`[DISCORD] Deployment Status:\n`);

      let discordCommands = [];
      let deploymentScope = 'Unknown';

      try {
        const clientId = client.user.id;
        const guildId = process.env.GUILD_ID;

        if (DEBUG) {
          console.log(`[DEBUG] Fetching Discord commands...`);
          console.log(`[DEBUG] Client ID: ${clientId}`);
          console.log(`[DEBUG] Guild ID: ${guildId || 'not set (global)'}`);
        }

        if (guildId) {
          discordCommands = await client.rest.get(
            Routes.applicationGuildCommands(clientId, guildId)
          );
          deploymentScope = `Guild (${guildId})`;
        } else {
          discordCommands = await client.rest.get(Routes.applicationCommands(clientId));
          deploymentScope = `Global (all guilds)`;
        }

        console.log(`  📡 Scope: ${deploymentScope}`);
        console.log(`  ✅ Deployed: ${discordCommands.length} commands\n`);

        if (DEBUG) {
          console.log(`[DEBUG] Discord commands fetched:`, discordCommands.map(c => ({ name: c.name })));
        }

        // Compare with registry
        const syncResult = registry.compareWithDiscord(discordCommands);

        if (DEBUG) {
          console.log(`[DEBUG] Sync result:`, syncResult);
        }

        console.log(`  [SYNC CHECK]:`);
        console.log(`     • Local: ${syncResult.totalLocal}`);
        console.log(`     • Discord: ${syncResult.totalDiscord}`);
        console.log(`     • Synced: ${syncResult.synced}`);

        if (syncResult.isInSync) {
          console.log(`     • Status: ✅ PERFECT SYNC\n`);
        } else {
          console.log(`     • Status: ⚠️  OUT OF SYNC\n`);

          if (syncResult.localOnly.length > 0) {
            console.log(`  🆕 New Locally (${syncResult.localOnly.length}):`);
            syncResult.details.localOnly.slice(0, 3).forEach(cmd => {
              console.log(`     + /${cmd}`);
            });
            if (syncResult.localOnly.length > 3) {
              console.log(`     ... and ${syncResult.localOnly.length - 3} more`);
            }
            console.log(`     💡 Run: node deploy-commands.js\n`);
          }

          if (syncResult.discordOnly.length > 0) {
            console.log(`  🗑️  Only on Discord (${syncResult.discordOnly.length}):`);
            syncResult.details.discordOnly.slice(0, 3).forEach(cmd => {
              console.log(`     - /${cmd}`);
            });
            if (syncResult.discordOnly.length > 3) {
              console.log(`     ... and ${syncResult.discordOnly.length - 3} more`);
            }
            console.log(`     💡 Run: node deploy-commands.js\n`);
          }
        }
      } catch (error) {
        console.log(`  ℹ️  Could not check Discord: ${error.message}`);
        console.log(`     (First deployment? Run: node deploy-commands.js)\n`);
      }

      // ===== INITIALIZE SYSTEMS =====
      console.log(`[STARTUP] Initializing Systems...\n`);
      try {
        setReadyClient(client);
        console.log(`  ✅ Ready Manager initialized`);

        setQueueClient(client);
        console.log(`  ✅ Queue Manager initialized\n`);
      } catch (err) {
        console.error(`  ❌ Manager initialization error: ${err.message}\n`);
      }

      // ===== FINAL SUMMARY =====
      const readyTime = Date.now() - startupTime;

      console.log(`${'='.repeat(80)}`);
      console.log(`✅ [READY] BOT ONLINE AND READY`);
      console.log(`${'='.repeat(80)}\n`);

      console.log(`📊 Startup Summary:`);
      console.log(`   • Commands Loaded: ${registryStats.totalCommands}`);
      console.log(`   • Validation: ${registryStats.totalErrors === 0 ? '✅ PASS' : `⚠️  ${registryStats.totalErrors} ISSUES`}`);
      console.log(`   • Discord Deployed: ${discordCommands.length}`);
      console.log(`   • Bot Account: ${client.user.tag}`);
      console.log(`   • Startup Time: ${readyTime}ms`);
      console.log(`   • Ready Time: ${new Date().toLocaleTimeString()}\n`);

      if (discordCommands.length === 0) {
        console.log(`⚠️  NOTE: No commands deployed to Discord yet.`);
        console.log(`   Next: Run \`node deploy-commands.js\` to deploy commands\n`);
      } else {
        console.log(`✅ All systems ready! Use /help in Discord to see commands\n`);
      }

      console.log(`💡 Tips:`);
      console.log(`   • Check bot status: client.user.tag`);
      console.log(`   • View commands: client.commands or /help`);
      console.log(`   • Resync commands: node deploy-commands.js\n`);
    } catch (error) {
      console.error(`\n❌ [READY] Startup dashboard error:`, error.message);
      console.error(`   (Bot is online but dashboard failed)\n`);
    }
  }
};
