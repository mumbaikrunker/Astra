const { handleButton: handleReadyButton } = require('../utils/readyManager');

const DEBUG = process.env.DEBUG === 'true';

async function handleReadyInteraction(interaction, client) {
    if (DEBUG) {
        console.log(`[DEBUG] Ready interaction received: ${interaction.customId}`);
    }

    if (interaction.isButton()) {
        if (interaction.customId.startsWith('ready_')) {
            return await handleReadyButton(interaction);
        }
    }

    return false; // Indicate that this handler did not process the interaction
}

module.exports = { handleReadyInteraction };