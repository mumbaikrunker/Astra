const { setClient: setReadyClient } = require('../utils/readyManager');
const { setClient: setQueueClient } = require('../utils/queueManager');
const { Routes } = require('discord.js');

/**
 * Comprehensive startup diagnostics and initialization
 */
module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ BOT CONNECTED: Logged in as ${client.user.tag}`);
    console.log(`${'='.repeat(80)}\n`);

    // ===== COMMAND DIAGNOSTICS =====
    console.log(`[STARTUP] Loading Command Diagnostics...\n`);

    const localCommands = client.commands;
    const commandNames = Array.from(localCommands.keys()).sort();
    const totalCommands = localCommands.size;

    console.log(`[COMMANDS] Local Commands Summary:`);
    console.log(`  📊 Total Loaded: ${totalCommands}\n`);

    if (totalCommands > 0) {
      console.log(`[COMMANDS] Loaded Command Names:`);
      commandNames.forEach((cmd, index) => {
        console.log(`  ${String(index + 1).padStart(2, ' ')}. /${cmd}`);
      });
      console.log();
    } else {
      console.warn(`  ⚠️  WARNING: No commands loaded! Check handler.js for errors.\n`);
    }

    // ===== DETECT DUPLICATES =====
    const uniqueNames = new Set(commandNames);
    if (commandNames.length !== uniqueNames.size) {
      console.warn(`[COMMANDS] ⚠️  DUPLICATE COMMANDS DETECTED:`);
      const counted = new Map();
      commandNames.forEach(name => {
        counted.set(name, (counted.get(name) || 0) + 1);
      });
      counted.forEach((count, name) => {
        if (count > 1) {
          console.warn(`  • /${name} (loaded ${count} times)`);
        }
      });
      console.log();
    }

    // ===== VALIDATE COMMAND STRUCTURE =====
    console.log(`[COMMANDS] Validating Command Structure...`);
    let validCount = 0;
    const invalid = [];

    localCommands.forEach((command, name) => {
      try {
        if (!command.data) {
          invalid.push({ name, reason: 'missing data' });
          return;
        }
        if (!command.execute || typeof command.execute !== 'function') {
          invalid.push({ name, reason: 'missing execute function' });
          return;
        }
        validCount++;
      } catch (error) {
        invalid.push({ name, reason: error.message });
      }
    });

    console.log(`  ✅ Valid: ${validCount}/${totalCommands}`);

    if (invalid.length > 0) {
      console.log(`  ❌ Invalid (${invalid.length}):`);
      invalid.forEach(cmd => {
        console.log(`     • /${cmd.name}: ${cmd.reason}`);
      });
    }
    console.log();

    // ===== FETCH DISCORD DEPLOYED COMMANDS =====
    console.log(`[DISCORD] Checking Deployed Commands...`);
    let discordCommands = [];

    try {
      const clientId = client.user.id;
      const guildId = process.env.GUILD_ID;

      if (guildId) {
        discordCommands = await client.rest.get(
          Routes.applicationGuildCommands(clientId, guildId)
        );
        console.log(`  📡 Scope: Guild (${guildId})`);
      } else {
        discordCommands = await client.rest.get(Routes.applicationCommands(clientId));
        console.log(`  📡 Scope: Global (all guilds)`);
      }

      console.log(`  ✅ Deployed: ${discordCommands.length} commands`);
    } catch (error) {
      console.warn(`  ⚠️  Could not fetch Discord commands: ${error.message}`);
      console.log(`     (This is normal on first startup before deployment)`);
    }
    console.log();

    // ===== COMPARE LOCAL vs DISCORD =====
    if (discordCommands.length > 0) {
      console.log(`[SYNC] Comparing Local vs. Discord Commands...`);

      const localNames = new Set(commandNames);
      const discordNames = new Set(discordCommands.map(cmd => cmd.name.toLowerCase()));

      const localOnly = commandNames.filter(name => !discordNames.has(name));
      const discordOnly = discordCommands
        .map(cmd => cmd.name.toLowerCase())
        .filter(name => !localNames.has(name));
      const synced = commandNames.filter(name => discordNames.has(name));

      if (localOnly.length === 0 && discordOnly.length === 0) {
        console.log(`  ✅ Perfect Sync: All ${synced.length} commands match`);
      } else {
        if (synced.length > 0) {
          console.log(`  ✅ Synced: ${synced.length} commands`);
        }

        if (localOnly.length > 0) {
          console.log(`  🆕 Local Only (${localOnly.length}) - Need Deployment:`);
          localOnly.forEach(cmd => {
            console.log(`     + /${cmd}`);
          });
        }

        if (discordOnly.length > 0) {
          console.log(`  🗑️  Discord Only (${discordOnly.length}) - Removed Locally:`);
          discordOnly.forEach(cmd => {
            console.log(`     - /${cmd}`);
          });
          console.log(`     💡 Run \`node deploy-commands.js\` to sync`);
        }
      }
      console.log();
    }

    // ===== INITIALIZE MANAGERS =====
    console.log(`[STARTUP] Initializing Managers...`);
    try {
      setReadyClient(client);
      setQueueClient(client);
      console.log(`  ✅ Ready Manager initialized`);
      console.log(`  ✅ Queue Manager initialized`);
    } catch (err) {
      console.error(`  ❌ Failed to initialize managers:`, err.message);
    }
    console.log();

    // ===== STARTUP SUMMARY =====
    console.log(`${'='.repeat(80)}`);
    console.log(`✅ STARTUP COMPLETE`);
    console.log(`${'='.repeat(80)}`);
    console.log(`
📊 Summary:
   • Commands Loaded: ${validCount}/${totalCommands}
   • Discord Deployed: ${discordCommands.length}
   • Bot: ${client.user.tag}
   • Guild ID: ${process.env.GUILD_ID || 'Global (all guilds)'}
   • Ready to serve!
    `);
    console.log(`Type /help in Discord to see all commands\n`);
  },
};
