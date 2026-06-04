const fs = require('fs').promises;
const path = require('path');
const { REST, Routes } = require('discord.js');
const { clientId } = require('./configs/config');

/**
 * Recursively collect all commands from the commands directory
 * Returns detailed command metadata for validation and comparison
 */
async function collectCommands(dirPath = path.join(__dirname, 'commands')) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const commands = [];
  const commandMetadata = [];
  const malformed = [];

  async function recursiveCollect(currentPath) {
    try {
      const dirEntries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of dirEntries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          await recursiveCollect(fullPath);
          continue;
        }

        if (!entry.name.endsWith('.js')) {
          continue;
        }

        try {
          // Clear require cache to ensure fresh load
          delete require.cache[require.resolve(fullPath)];
          const command = require(fullPath);

          // Validate command structure
          if (!command.data) {
            malformed.push({
              file: fullPath,
              reason: 'Missing "data" property (SlashCommandBuilder)'
            });
            continue;
          }

          if (!command.data.name || typeof command.data.name !== 'string') {
            malformed.push({
              file: fullPath,
              reason: `Invalid command name: ${command.data.name} (must be a non-empty string)`
            });
            continue;
          }

          if (!command.execute || typeof command.execute !== 'function') {
            malformed.push({
              file: fullPath,
              reason: 'Missing or invalid "execute" function'
            });
            continue;
          }

          if (!command.data.toJSON || typeof command.data.toJSON !== 'function') {
            malformed.push({
              file: fullPath,
              reason: 'Missing toJSON() method on command data'
            });
            continue;
          }

          // Normalize command name
          const commandName = command.data.name.toLowerCase().trim();

          // Collect command for deployment
          try {
            const jsonData = command.data.toJSON();
            commands.push(jsonData);

            commandMetadata.push({
              file: path.relative(path.join(__dirname, 'commands'), fullPath),
              name: commandName,
              description: command.data.description || 'No description',
              subcommands: jsonData.options?.filter(opt => opt.type === 1 || opt.type === 2) || [],
              options: jsonData.options?.filter(opt => opt.type !== 1 && opt.type !== 2) || []
            });
          } catch (toJsonError) {
            malformed.push({
              file: fullPath,
              reason: `toJSON() failed: ${toJsonError.message}`
            });
          }

        } catch (error) {
          malformed.push({
            file: fullPath,
            reason: `Load error: ${error.message}`
          });
        }
      }
    } catch (error) {
      console.error(`[Deploy] Error reading directory ${currentPath}:`, error);
    }
  }

  await recursiveCollect(dirPath);

  return { commands, commandMetadata, malformed };
}

/**
 * Compare deployed commands with collected commands
 * Detects new, removed, and mismatched commands
 */
function compareCommands(deployedCommands, collectedCommands) {
  const deployedNames = new Set(deployedCommands.map(cmd => cmd.name.toLowerCase()));
  const collectedNames = new Set(collectedCommands.map(cmd => cmd.name.toLowerCase()));

  const newCommands = collectedCommands.filter(cmd => !deployedNames.has(cmd.name.toLowerCase()));
  const removedCommands = deployedCommands.filter(cmd => !collectedNames.has(cmd.name.toLowerCase()));
  const commonCommands = collectedCommands.filter(cmd => deployedNames.has(cmd.name.toLowerCase()));

  return { newCommands, removedCommands, commonCommands };
}

/**
 * Main deployment function with comprehensive logging and validation
 */
(async () => {
  console.log('\n[Deploy] Starting Discord slash command deployment...\n');

  try {
    // Verify environment
    if (!process.env.DISCORD_TOKEN) {
      throw new Error('DISCORD_TOKEN environment variable is not set');
    }

    // Collect all commands
    console.log('[Deploy] Collecting commands from file system...');
    const { commands, commandMetadata, malformed } = await collectCommands();

    // Log collected commands
    console.log(`\n[Deploy] Collection Results:`);
    console.log(`  ✅ Valid: ${commands.length} commands`);

    if (commands.length > 0) {
      console.log(`\n[Deploy] Commands to Deploy:`);
      commandMetadata.forEach(cmd => {
        const options = cmd.options.length > 0 ? ` [${cmd.options.length} option${cmd.options.length > 1 ? 's' : ''}]` : '';
        const subcommands = cmd.subcommands.length > 0 ? ` [${cmd.subcommands.length} subcommand${cmd.subcommands.length > 1 ? 's' : ''}]` : '';
        console.log(`    • /${cmd.name}: ${cmd.description}${options}${subcommands}`);
      });
    }

    // Log malformed commands
    if (malformed.length > 0) {
      console.log(`\n[Deploy] ❌ Malformed (${malformed.length} commands skipped):`);
      malformed.forEach(cmd => {
        console.log(`    • ${cmd.file}`);
        console.log(`      Reason: ${cmd.reason}`);
      });
    }

    // Connect to Discord API
    console.log(`\n[Deploy] Connecting to Discord API...`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    // Fetch current deployed commands
    let currentDeployedCommands = [];
    const deploymentScope = process.env.GUILD_ID
      ? `Guild ${process.env.GUILD_ID}`
      : 'Global (all guilds)';

    console.log(`[Deploy] Fetching currently deployed commands (${deploymentScope})...`);
    try {
      if (process.env.GUILD_ID) {
        currentDeployedCommands = await rest.get(
          Routes.applicationGuildCommands(clientId, process.env.GUILD_ID)
        );
      } else {
        currentDeployedCommands = await rest.get(Routes.applicationCommands(clientId));
      }
      console.log(`[Deploy] Currently deployed: ${currentDeployedCommands.length} commands`);
    } catch (error) {
      console.warn(`[Deploy] Could not fetch current commands (may be first deployment): ${error.message}`);
    }

    // Compare and detect changes
    if (currentDeployedCommands.length > 0) {
      console.log(`\n[Deploy] Comparing deployed vs. collected commands...`);
      const { newCommands, removedCommands, commonCommands } = compareCommands(
        currentDeployedCommands,
        commandMetadata
      );

      if (newCommands.length > 0) {
        console.log(`  🆕 New Commands (${newCommands.length}):`);
        newCommands.forEach(cmd => {
          console.log(`     + /${cmd.name}`);
        });
      }

      if (removedCommands.length > 0) {
        console.log(`  🗑️  Removed Commands (${removedCommands.length}):`);
        removedCommands.forEach(cmd => {
          console.log(`     - /${cmd.name}`);
        });
      }

      if (commonCommands.length > 0 && newCommands.length === 0 && removedCommands.length === 0) {
        console.log(`  ✅ No Changes (${commonCommands.length} commands synced)`);
      } else if (commonCommands.length > 0) {
        console.log(`  ✅ Unchanged (${commonCommands.length} commands)`);
      }
    }

    // Deploy commands
    console.log(`\n[Deploy] Deploying ${commands.length} commands to Discord...`);
    if (process.env.GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(clientId, process.env.GUILD_ID), {
        body: commands
      });
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
    }

    console.log(`\n✅ [Deploy] SUCCESS! All ${commands.length} commands deployed.`);
    console.log(`[Deploy] Scope: ${deploymentScope}`);
    console.log(`[Deploy] Commands are now available in Discord.\n`);

    process.exit(0);

  } catch (error) {
    console.error(`\n❌ [Deploy] DEPLOYMENT FAILED`);
    console.error(`   Error: ${error.message}`);

    if (error.code === 'ENOENT') {
      console.error('   (File not found - check command directory paths)');
    } else if (error.status === 401) {
      console.error('   (Unauthorized - check DISCORD_TOKEN and CLIENT_ID)');
    } else if (error.status === 403) {
      console.error('   (Forbidden - bot may not have permission to register commands)');
    }

    console.error(`\n[Deploy] Debug Info:`);
    console.error(`   DISCORD_TOKEN set: ${!!process.env.DISCORD_TOKEN}`);
    console.error(`   CLIENT_ID: ${clientId}`);
    console.error(`   GUILD_ID: ${process.env.GUILD_ID || '(global)'}`);
    console.error(`   Stack: ${error.stack}\n`);

    process.exit(1);
  }
})();
