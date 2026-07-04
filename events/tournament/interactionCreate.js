const { handleTournamentInteraction } = require('../../systems/tournament/tournamentHandlers');

module.exports = {
  name: 'tournamentInteractionCreate',
  once: false,
  async execute(interaction, client) {
    if (interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu()) {
      return handleTournamentInteraction(interaction, client);
    }
    return false;
  },
};
