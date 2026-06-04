const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token } = require('./configs/config');
const { loadCommands, loadEvents } = require('./utils/handler');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

(async () => {
  try {
    await loadCommands(client);
    await loadEvents(client);
    await client.login(token);
  } catch (error) {
    console.error('Bot startup failed:', error);
    process.exit(1);
  }
})();
