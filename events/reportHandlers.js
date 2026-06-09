const { handleReportButton } = require('../utils/reportManager');
const { handleMatchInfoButton } = require('../utils/matchInfoManager');

const DEBUG = process.env.DEBUG === 'true';

async function handleReportInteraction(interaction, client) {
    if (DEBUG) {
        console.log(`[DEBUG] Report interaction received: ${interaction.customId}`);
    }

    if (interaction.isButton()) {
        if (interaction.customId.startsWith('report_')) {
            return await handleReportButton(interaction);
        }
        if (interaction.customId.startsWith('matchinfo_')) {
            return await handleMatchInfoButton(interaction);
        }
    }
    return false; // Indicate that this handler did not process the interaction
}

module.exports = { handleReportInteraction };