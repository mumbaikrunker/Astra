const fs = require('fs').promises;
const path = require('path');
const { REST, Routes } = require('discord.js');
const { clientId } = require('./configs/config');

async function collectCommands(dirPath = path.join(__dirname, 'commands')) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const commands = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      commands.push(...(await collectCommands(fullPath)));
      continue;
    }

    if (!entry.name.endsWith('.js')) {
      continue;
    }

    const command = require(fullPath);
    if (command.data && command.data.toJSON) {
      commands.push(command.data.toJSON());
    }
  }

  return commands;
}

(async () => {
  try {
    const commands = await collectCommands();
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    console.log(`Refreshing ${commands.length} application commands...`);

    if (process.env.GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(clientId, process.env.GUILD_ID), { body: commands });
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
    }

    console.log('Application commands deployed successfully.');
  } catch (error) {
    console.error('Failed to deploy application commands:', error);
    process.exit(1);
  }
})();
