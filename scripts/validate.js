/**
 * Command and Event Validation Script
 * 
 * This script validates all commands and events without requiring Discord credentials.
 * It uses a mock client that provides the minimal interface needed for loading.
 * 
 * Usage: npm run validate
 */

const { loadCommands, loadEvents, commandRegistry } = require('../utils/handler');

/**
 * Minimal mock client for validation purposes
 * Provides only the interface needed by loadCommands and loadEvents
 * No Discord credentials required
 */
function createMockClient() {
  const eventListeners = new Map();
  
  return {
    // Commands collection (Map-like interface)
    commands: new Map(),
    
    // Event listener registration (mock implementation)
    on(event, listener) {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, []);
      }
      eventListeners.get(event).push(listener);
      return this;
    },
    
    once(event, listener) {
      // For validation, we just need to register the listener
      // The mock doesn't need to actually fire events
      return this.on(event, listener);
    }
  };
}

async function main() {
  const client = createMockClient();

  console.log('\n' + '='.repeat(80));
  console.log('[VALIDATE] Deployment Stability Check');
  console.log('='.repeat(80));
  console.log('[VALIDATE] Running without Discord credentials...\n');

  const commandReport = await loadCommands(client);
  const eventReport = await loadEvents(client);
  const serializationErrors = [];

  for (const [name, command] of commandRegistry.getAll()) {
    try {
      command.data.toJSON();
    } catch (error) {
      serializationErrors.push({
        name,
        message: error.message,
      });
    }
  }

  console.log(`Commands loaded: ${commandReport.totalLoaded}`);
  console.log(`Command load errors: ${commandReport.totalErrors}`);
  console.log(`Events loaded: ${eventReport.totalLoaded}`);
  console.log(`Event load errors: ${eventReport.totalErrors}`);
  console.log(`Serialization errors: ${serializationErrors.length}`);

  if (commandReport.errors.length) {
    console.log('\nCommand errors:');
    commandReport.errors.forEach((error) => {
      console.log(`- ${error.file}: ${error.reason}`);
    });
  }

  if (eventReport.errors.length) {
    console.log('\nEvent errors:');
    eventReport.errors.forEach((error) => {
      console.log(`- ${error.file}: ${error.reason}`);
    });
  }

  if (serializationErrors.length) {
    console.log('\nSerialization errors:');
    serializationErrors.forEach((error) => {
      console.log(`- /${error.name}: ${error.message}`);
    });
  }

  const isValid =
    commandReport.isValid && eventReport.isValid && serializationErrors.length === 0;

  if (!isValid) {
    console.log('\n[VALIDATE] FAILED');
    process.exit(1);
  }

  console.log('\n[VALIDATE] PASSED');
  process.exit(0);
}

main().catch((error) => {
  console.error('\n[VALIDATE] FAILED');
  console.error(error);
  process.exit(1);
});