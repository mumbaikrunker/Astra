const { createGuildConfig } = require('../systems/configs/guildConfigService');

module.exports = {
  name: 'guildCreate',
  once: false,
  async execute(guild) {
    try {
      await createGuildConfig(guild.id);
      console.log(`Created default guild config for ${guild.id}`);
    } catch (error) {
      console.error('Failed to create guild config on guild join:', error);
    }
  },
};