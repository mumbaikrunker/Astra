const fs = require('fs').promises;
const path = require('path');

async function loadCommands(client, dirPath = path.join(__dirname, '../commands')) {
  const loadedCommands = [];
  const skippedCommands = [];
  const malformedCommands = [];

  async function recursiveLoad(currentPath) {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          await recursiveLoad(fullPath);
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
            malformedCommands.push({
              file: fullPath,
              reason: 'Missing "data" property (SlashCommandBuilder)'
            });
            continue;
          }

          if (!command.execute) {
            malformedCommands.push({
              file: fullPath,
              reason: 'Missing "execute" function'
            });
            continue;
          }

          // Validate data.name exists and is a string
          if (!command.data.name || typeof command.data.name !== 'string') {
            malformedCommands.push({
              file: fullPath,
              reason: `Invalid command name: ${command.data.name} (must be a non-empty string)`
            });
            continue;
          }

          // Normalize command name (lowercase, trim)
          const commandName = command.data.name.toLowerCase().trim();

          // Check for duplicates
          if (client.commands.has(commandName)) {
            skippedCommands.push({
              file: fullPath,
              reason: `Duplicate command: "${commandName}" already loaded`
            });
            continue;
          }

          // Validate execute is a function
          if (typeof command.execute !== 'function') {
            malformedCommands.push({
              file: fullPath,
              reason: `"execute" is not a function (type: ${typeof command.execute})`
            });
            continue;
          }

          // Successfully load command
          client.commands.set(commandName, command);
          loadedCommands.push({
            name: commandName,
            description: command.data.description || 'No description',
            file: path.relative(path.join(__dirname, '../commands'), fullPath)
          });

        } catch (error) {
          malformedCommands.push({
            file: fullPath,
            reason: `Load error: ${error.message}`
          });
        }
      }
    } catch (error) {
      console.error(`[Handler] Error reading directory ${currentPath}:`, error);
    }
  }

  try {
    await recursiveLoad(dirPath);

    // Log results
    console.log(`\n[Command Loader] Results:`);
    console.log(`  ✅ Loaded: ${loadedCommands.length} commands`);
    
    if (loadedCommands.length > 0) {
      loadedCommands.forEach(cmd => {
        console.log(`    - ${cmd.name}: ${cmd.description}`);
      });
    }

    if (malformedCommands.length > 0) {
      console.log(`\n  ❌ Malformed (${malformedCommands.length} commands skipped):`);
      malformedCommands.forEach(cmd => {
        console.log(`    - ${cmd.file}`);
        console.log(`      Reason: ${cmd.reason}`);
      });
    }

    if (skippedCommands.length > 0) {
      console.log(`\n  ⚠️  Skipped (${skippedCommands.length} commands):`);
      skippedCommands.forEach(cmd => {
        console.log(`    - ${cmd.file}`);
        console.log(`      Reason: ${cmd.reason}`);
      });
    }

    console.log(`\n  📊 Summary: ${loadedCommands.length} commands ready\n`);

  } catch (error) {
    console.error('[Command Loader] Fatal error:', error);
    throw error;
  }
}

async function loadEvents(client, dirPath = path.join(__dirname, '../events')) {
  const loadedEvents = [];
  const malformedEvents = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively load subdirectories
        await loadEvents(client, fullPath);
        continue;
      }

      if (!entry.name.endsWith('.js')) {
        continue;
      }

      try {
        // Clear require cache to ensure fresh load
        delete require.cache[require.resolve(fullPath)];
        const event = require(fullPath);

        // Validate event structure
        if (!event.name || typeof event.name !== 'string') {
          malformedEvents.push({
            file: fullPath,
            reason: `Invalid event name: ${event.name} (must be a non-empty string)`
          });
          continue;
        }

        if (!event.execute || typeof event.execute !== 'function') {
          malformedEvents.push({
            file: fullPath,
            reason: `Missing or invalid "execute" function`
          });
          continue;
        }

        // Register event listener
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args, client));
        } else {
          client.on(event.name, (...args) => event.execute(...args, client));
        }

        loadedEvents.push({
          name: event.name,
          file: path.relative(path.join(__dirname, '../events'), fullPath),
          once: event.once || false
        });

      } catch (error) {
        malformedEvents.push({
          file: fullPath,
          reason: `Load error: ${error.message}`
        });
      }
    }

    // Log results
    console.log(`\n[Event Loader] Results:`);
    console.log(`  ✅ Loaded: ${loadedEvents.length} events`);
    
    if (loadedEvents.length > 0) {
      loadedEvents.forEach(evt => {
        const type = evt.once ? '(once)' : '(on)';
        console.log(`    - ${evt.name} ${type}`);
      });
    }

    if (malformedEvents.length > 0) {
      console.log(`\n  ❌ Malformed (${malformedEvents.length} events skipped):`);
      malformedEvents.forEach(evt => {
        console.log(`    - ${evt.file}`);
        console.log(`      Reason: ${evt.reason}`);
      });
    }

    console.log(`\n  📊 Summary: ${loadedEvents.length} events ready\n`);

  } catch (error) {
    console.error('[Event Loader] Fatal error:', error);
    throw error;
  }
}

module.exports = { loadCommands, loadEvents };
