const fs = require('fs').promises;
const path = require('path');
const commandRegistry = require('../systems/commandRegistry');

/**
 * Load all commands from the commands directory
 * Uses centralized command registry for validation and tracking
 * Synchronizes loaded commands to client.commands Collection
 *
 * @param {Client} client - Discord.js client
 * @param {string} dirPath - Directory to load commands from
 * @returns {Promise<Object>} Load report with statistics
 */
async function loadCommands(client, dirPath = path.join(__dirname, '../commands')) {
  const startTime = Date.now();
  const loadedCommands = [];

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

          // Register command with centralized registry
          const result = commandRegistry.register(fullPath, command);

          if (result.success) {
            // Sync to client.commands Collection for backward compatibility
            client.commands.set(result.command, command);
            loadedCommands.push({
              name: result.command,
              description: command.data.description || 'No description',
              file: path.relative(path.join(__dirname, '../commands'), fullPath)
            });
          }
          // Errors are automatically tracked in registry
        } catch (error) {
          console.error(`[Command Loader] Failed to load file ${fullPath}:`, error.message);
        }
      }
    } catch (error) {
      console.error(`[Command Loader] Error reading directory ${currentPath}:`, error);
    }
  }

  try {
    await recursiveLoad(dirPath);
    const loadTime = Date.now() - startTime;

    // Get comprehensive report from registry
    const report = commandRegistry.getLoadReport();

    // Log detailed results
    console.log(`\n${'='.repeat(80)}`);
    console.log(`[COMMAND LOADER] Load Complete (${loadTime}ms)`);
    console.log(`${'='.repeat(80)}\n`);

    // Success summary
    console.log(`✅ Successfully Loaded: ${report.totalLoaded} commands`);
    if (loadedCommands.length > 0) {
      loadedCommands.forEach((cmd, idx) => {
        console.log(`   ${String(idx + 1).padStart(2, ' ')}. /${cmd.name}: ${cmd.description}`);
      });
    }
    console.log();

    // Error summary
    if (report.totalErrors > 0) {
      console.log(`❌ Errors Found: ${report.totalErrors} issues\n`);

      report.errors.forEach((error, idx) => {
        console.log(`   Error ${idx + 1}: ${error.reason}`);
        console.log(`   File: ${path.relative(process.cwd(), error.file)}`);
        if (error.existingFile) {
          console.log(`   Existing: ${path.relative(process.cwd(), error.existingFile)}`);
        }
        console.log();
      });
    }

    // Final summary
    const { valid, duplicates, malformed } = report.summary;
    console.log(`📊 Summary:`);
    console.log(`   • Total Loaded: ${report.totalLoaded}`);
    console.log(`   • Duplicates: ${duplicates}`);
    console.log(`   • Malformed: ${malformed}`);
    console.log(`   • Status: ${report.isValid ? '✅ VALID' : '❌ HAS ISSUES'}`);
    console.log();

    return report;
  } catch (error) {
    console.error('[Command Loader] Fatal error:', error);
    throw error;
  }
}

/**
 * Load all events from the events directory
 * Events are registered with the client (once or on)
 *
 * @param {Client} client - Discord.js client
 * @param {string} dirPath - Directory to load events from
 * @returns {Promise<Object>} Load report with statistics
 */
async function loadEvents(client, dirPath = path.join(__dirname, '../events')) {
  const startTime = Date.now();
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
            reason: `Invalid event name: ${event.name} (must be a non-empty string)`,
            type: 'invalid_name'
          });
          continue;
        }

        if (!event.execute || typeof event.execute !== 'function') {
          malformedEvents.push({
            file: fullPath,
            reason: `Missing or invalid "execute" function`,
            type: 'missing_execute'
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
          reason: `Load error: ${error.message}`,
          type: 'load_error'
        });
      }
    }

    const loadTime = Date.now() - startTime;

    // Log results
    console.log(`\n${'='.repeat(80)}`);
    console.log(`[EVENT LOADER] Load Complete (${loadTime}ms)`);
    console.log(`${'='.repeat(80)}\n`);

    console.log(`✅ Successfully Loaded: ${loadedEvents.length} events`);
    if (loadedEvents.length > 0) {
      loadedEvents.forEach((evt, idx) => {
        const type = evt.once ? '(once)' : '(on)';
        console.log(`   ${String(idx + 1).padStart(2, ' ')}. ${evt.name} ${type}`);
      });
    }
    console.log();

    if (malformedEvents.length > 0) {
      console.log(`❌ Errors Found: ${malformedEvents.length} issues\n`);
      malformedEvents.forEach((evt, idx) => {
        console.log(`   Error ${idx + 1}: ${evt.reason}`);
        console.log(`   File: ${path.relative(process.cwd(), evt.file)}`);
        console.log();
      });
    }

    console.log(`📊 Summary:`);
    console.log(`   • Total Loaded: ${loadedEvents.length}`);
    console.log(`   • Errors: ${malformedEvents.length}`);
    console.log(`   • Status: ${malformedEvents.length === 0 ? '✅ VALID' : '❌ HAS ISSUES'}`);
    console.log();

    return {
      totalLoaded: loadedEvents.length,
      totalErrors: malformedEvents.length,
      events: loadedEvents,
      errors: malformedEvents,
      isValid: malformedEvents.length === 0
    };
  } catch (error) {
    console.error('[Event Loader] Fatal error:', error);
    throw error;
  }
}

module.exports = { loadCommands, loadEvents, commandRegistry };
