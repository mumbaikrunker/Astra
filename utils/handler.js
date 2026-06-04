const fs = require('fs').promises;
const path = require('path');

async function loadCommands(client, dirPath = path.join(__dirname, '../commands')) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await loadCommands(client, fullPath);
      continue;
    }

    if (!entry.name.endsWith('.js')) {
      continue;
    }

    const command = require(fullPath);
    if (!command.data || !command.execute) {
      continue;
    }

    client.commands.set(command.data.name, command);
  }
}

async function loadEvents(client, dirPath = path.join(__dirname, '../events')) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await loadEvents(client, fullPath);
      continue;
    }

    if (!entry.name.endsWith('.js')) {
      continue;
    }

    const event = require(fullPath);
    if (!event.name || !event.execute) {
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }
}

module.exports = { loadCommands, loadEvents };
