const path = require('path');
const { REST, Routes } = require('discord.js');
const { clientId } = require('./configs/config');
const commandRegistry = require('./systems/commandRegistry');
const { loadCommands } = require('./utils/handler');
const { Collection } = require('discord.js');

/**
 * Safe Command Deployment System
 *
 * Features:
 * - Centralized registry-based validation
 * - Comprehensive pre-deployment checks
 * - Detailed sync comparison with Discord
 * - Safety guardrails before pushing to production
 * - Clear reporting of changes and status
 */

/**
 * Deploy commands to Discord with comprehensive validation
 */
async function deployCommandsToDiscord() {
  const startTime = Date.now();

  console.log(`\n${'='.repeat(80)}`);
  console.log(`[DEPLOY SYSTEM] Starting Deployment Process`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    // ===== ENVIRONMENT VALIDATION =====
    console.log(`[DEPLOY] Step 1: Validating Environment...`);
    if (!process.env.DISCORD_TOKEN) {
      throw new Error('DISCORD_TOKEN environment variable is not set');
    }
    if (!clientId) {
      throw new Error('CLIENT_ID is not configured');
    }
    console.log(`  ✅ Environment valid`);
    console.log(`  ✅ CLIENT_ID: ${clientId}`);
    console.log();

    // ===== LOAD & VALIDATE COMMANDS =====
    console.log(`[DEPLOY] Step 2: Loading & Validating Commands...`);
    const dummyClient = new (require('discord.js')).Client({
      intents: [require('discord.js').GatewayIntentBits.Guilds]
    });
    dummyClient.commands = new Collection();

    // Use the same loader as the bot
    const loadReport = await loadCommands(dummyClient);

    // Check load status
    if (!loadReport.isValid) {
      console.error(`\n❌ DEPLOYMENT BLOCKED: Command loading has errors`);
      console.error(`   Cannot deploy with ${loadReport.totalErrors} malformed command(s)\n`);
      process.exit(1);
    }
    console.log(`  ✅ All commands valid for deployment\n`);

    // ===== PREPARE DEPLOYMENT DATA =====
    console.log(`[DEPLOY] Step 3: Preparing Deployment Payload...`);
    const commands = Array.from(commandRegistry.getAll().values())
      .map(cmd => cmd.data.toJSON())
      .sort((a, b) => a.name.localeCompare(b.name));

    console.log(`  ✅ Payload prepared: ${commands.length} commands`);
    console.log();

    // ===== CONNECT TO DISCORD API =====
    console.log(`[DEPLOY] Step 4: Connecting to Discord API...`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    console.log(`  ✅ Connected\n`);

    // ===== FETCH CURRENT STATE =====
    console.log(`[DEPLOY] Step 5: Fetching Current Deployment State...`);
    let currentDeployed = [];
    const deploymentScope = process.env.GUILD_ID
      ? `Guild ${process.env.GUILD_ID}`
      : 'Global (all guilds)';

    try {
      if (process.env.GUILD_ID) {
        currentDeployed = await rest.get(
          Routes.applicationGuildCommands(clientId, process.env.GUILD_ID)
        );
      } else {
        currentDeployed = await rest.get(Routes.applicationCommands(clientId));
      }
      console.log(`  ✅ Currently deployed: ${currentDeployed.length} commands`);
      console.log(`  📡 Scope: ${deploymentScope}`);
    } catch (error) {
      console.log(`  ℹ️  No current deployment found (first deployment): ${error.message}`);
      currentDeployed = [];
    }
    console.log();

    // ===== SYNC COMPARISON =====
    console.log(`[DEPLOY] Step 6: Comparing Local vs. Discord...`);
    const syncResult = commandRegistry.compareWithDiscord(currentDeployed);

    console.log(`  📊 Sync Status:`);
    console.log(`     • Local Commands: ${syncResult.totalLocal}`);
    console.log(`     • Discord Commands: ${syncResult.totalDiscord}`);
    console.log(`     • Synced: ${syncResult.synced}`);

    if (syncResult.localOnly.length > 0) {
      console.log(`     • 🆕 Local Only (${syncResult.localOnly.length}):`);
      syncResult.details.localOnly.forEach(cmd => {
        console.log(`        + /${cmd}`);
      });
    }

    if (syncResult.discordOnly.length > 0) {
      console.log(`     • 🗑️  Discord Only (${syncResult.discordOnly.length}):`);
      syncResult.details.discordOnly.forEach(cmd => {
        console.log(`        - /${cmd}`);
      });
    }

    if (syncResult.isInSync) {
      console.log(`     • ✅ Perfect Sync: No changes needed`);
    } else {
      console.log(`     • ⚠️  Out of Sync: Changes detected`);
    }
    console.log();

    // ===== DEPLOYMENT CONFIRMATION =====
    console.log(`[DEPLOY] Step 7: Pre-Deployment Checks...`);

    // Check for malformed commands
    const registryStats = commandRegistry.getStats();
    if (registryStats.totalErrors > 0) {
      console.error(`\n❌ DEPLOYMENT BLOCKED: Registry has errors`);
      console.error(`   Cannot deploy with active validation errors\n`);
      process.exit(1);
    }

    // Check for critical mismatches
    if (syncResult.localOnly.length > 20 && syncResult.discordOnly.length > 0) {
      console.warn(`\n⚠️  WARNING: Major sync mismatch detected`);
      console.warn(`   Adding ${syncResult.localOnly.length} commands while removing ${syncResult.discordOnly.length}`);
      console.warn(`   This suggests a significant structural change\n`);
    }

    console.log(`  ✅ All checks passed - ready to deploy\n`);

    // ===== EXECUTE DEPLOYMENT =====
    console.log(`[DEPLOY] Step 8: Deploying to Discord...`);
    console.log(`  🚀 Pushing ${commands.length} commands...`);

    if (process.env.GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(clientId, process.env.GUILD_ID),
        { body: commands }
      );
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
    }

    console.log(`  ✅ Deployment successful!\n`);

    // ===== FINAL SUMMARY =====
    const deploymentTime = Date.now() - startTime;
    console.log(`${'='.repeat(80)}`);
    console.log(`✅ [DEPLOY] DEPLOYMENT COMPLETE`);
    console.log(`${'='.repeat(80)}\n`);

    console.log(`📊 Final Status:`);
    console.log(`   • Commands Deployed: ${commands.length}`);
    console.log(`   • Scope: ${deploymentScope}`);
    console.log(`   • Sync Status: ${syncResult.isInSync ? '✅ In Sync' : '⚠️  Out of Sync (will be corrected)'}`);
    console.log(`   • Deployment Time: ${deploymentTime}ms`);
    console.log();

    if (!syncResult.isInSync) {
      console.log(`📋 Changes Made:`);
      if (syncResult.localOnly.length > 0) {
        console.log(`   • Added: ${syncResult.localOnly.length} command(s)`);
      }
      if (syncResult.discordOnly.length > 0) {
        console.log(`   • Removed: ${syncResult.discordOnly.length} command(s)`);
      }
      console.log();
    }

    console.log(`ℹ️  Next: Start the bot with \`node index.js\` to verify deployment\n`);

    process.exit(0);
  } catch (error) {
    // ===== ERROR HANDLING =====
    console.error(`\n${'='.repeat(80)}`);
    console.error(`❌ [DEPLOY] DEPLOYMENT FAILED`);
    console.error(`${'='.repeat(80)}\n`);

    console.error(`❌ Error: ${error.message}\n`);

    // Provide specific help
    if (error.code === 'ENOENT') {
      console.error(`🔧 Troubleshooting:`);
      console.error(`   • Command directory not found`);
      console.error(`   • Check that "commands" directory exists\n`);
    } else if (error.status === 401) {
      console.error(`🔧 Troubleshooting:`);
      console.error(`   • Invalid or expired DISCORD_TOKEN`);
      console.error(`   • Verify DISCORD_TOKEN in .env file\n`);
    } else if (error.status === 403) {
      console.error(`🔧 Troubleshooting:`);
      console.error(`   • Bot lacks permission to register commands`);
      console.error(`   • Verify bot has "applications.commands" scope\n`);
    } else if (error.message.includes('malformed')) {
      console.error(`🔧 Troubleshooting:`);
      console.error(`   • One or more commands are malformed`);
      console.error(`   • Check command files for missing data or execute\n`);
    }

    console.error(`📋 Debug Information:`);
    console.error(`   • DISCORD_TOKEN: ${process.env.DISCORD_TOKEN ? '✅ Set' : '❌ Missing'}`);
    console.error(`   • CLIENT_ID: ${clientId || '❌ Missing'}`);
    console.error(`   • GUILD_ID: ${process.env.GUILD_ID || 'Not set (global scope)'}`);
    console.error(`   • Stack: ${error.stack}\n`);

    process.exit(1);
  }
}

// Run deployment
deployCommandsToDiscord();

