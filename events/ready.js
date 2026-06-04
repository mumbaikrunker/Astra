const { setClient: setReadyClient } = require('../utils/readyManager');
const { setClient: setQueueClient } = require('../utils/queueManager');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`Logged in as ${client.user.tag}`);
    try {
      setReadyClient(client);
      setQueueClient(client);
    } catch (err) {
      console.error('Failed to initialize managers on ready:', err);
    }
  },
};
