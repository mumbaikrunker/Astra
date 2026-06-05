const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

/**
 * Dynamic Help Command
 * 
 * Automatically generates help output from the command registry.
 * All registered commands will appear without manual updates.
 * 
 * Features:
 * - Dynamically lists all registered slash commands
 * - Shows command name and description
 * - Groups commands by category (if available)
 * - Handles empty or malformed command metadata safely
 * - Uses embeds for clean presentation
 */

/**
 * Extract category from command file path
 * Commands in subdirectories like commands/queue/add.js get category "queue"
 * @param {string} filePath - Path to command file
 * @returns {string|null}
 */
function extractCategory(filePath) {
  if (!filePath || typeof filePath !== 'string') return null;
  
  // Normalize path separators
  const normalized = filePath.replace(/\\/g, '/');
  
  // Extract the directory containing the file
  const parts = normalized.split('/');
  
  // Look for 'commands' in the path and get the next directory
  const commandsIndex = parts.findIndex(p => p === 'commands');
  if (commandsIndex !== -1 && commandsIndex < parts.length - 2) {
    const category = parts[commandsIndex + 1];
    // Skip if it's a direct child of commands (no subdirectory)
    if (category && !category.endsWith('.js')) {
      return category.toLowerCase();
    }
  }
  
  return null;
}

/**
 * Safely get command description
 * @param {Object} command - Command object
 * @returns {string}
 */
function getDescription(command) {
  try {
    if (command.data && command.data.description) {
      return command.data.description;
    }
  } catch {
    // Fall through to default
  }
  return 'No description available.';
}

/**
 * Group commands by category
 * @param {Map} commands - Map of command name to command object
 * @param {Map} commandFiles - Map of command name to file path
 * @returns {Object} Grouped commands
 */
function groupByCategory(commands, commandFiles) {
  const groups = {
    uncategorized: []
  };
  
  for (const [name, command] of commands) {
    const filePath = commandFiles.get(name);
    const category = extractCategory(filePath);
    
    const entry = {
      name,
      description: getDescription(command)
    };
    
    if (category) {
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(entry);
    } else {
      groups.uncategorized.push(entry);
    }
  }
  
  return groups;
}

/**
 * Format category name for display
 * @param {string} category - Category key
 * @returns {string}
 */
function formatCategoryName(category) {
  if (category === 'uncategorized') {
    return 'General Commands';
  }
  return category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands and their descriptions'),
  
  async execute(interaction, client) {
    try {
      // Get commands from registry (preferred) or fall back to client.commands
      let commands;
      let commandFiles = new Map();
      
      if (client.registry && typeof client.registry.getAll === 'function') {
        commands = client.registry.getAll();
      } else if (client.commands) {
        commands = client.commands;
      } else {
        // Fallback: empty map
        commands = new Map();
      }
      
      // Get file paths from registry if available
      if (client.registry && client.registry.commandFiles) {
        commandFiles = client.registry.commandFiles;
      }
      
      // Filter out the help command itself to avoid recursion
      const allCommands = new Map(commands);
      allCommands.delete('help');
      
      // Group commands by category
      const groups = groupByCategory(allCommands, commandFiles);
      
      // Build embed fields
      const fields = [];
      const maxFields = 25; // Discord limit
      
      // Process each category
      for (const [category, cmds] of Object.entries(groups)) {
        if (cmds.length === 0) continue;
        
        // Sort commands alphabetically within category
        cmds.sort((a, b) => a.name.localeCompare(b.name));
        
        const categoryName = formatCategoryName(category);
        
        // Build command list for this category
        const commandList = cmds.map(cmd => {
          // Truncate description if too long
          let desc = cmd.description || 'No description available.';
          if (desc.length > 100) {
            desc = desc.substring(0, 97) + '...';
          }
          return `**/${cmd.name}** - ${desc}`;
        }).join('\n');
        
        // Split into multiple fields if content is too long (Discord field value limit: 1024 chars)
        if (commandList.length > 1024) {
          // Split commands into chunks
          let currentChunk = '';
          let chunkIndex = 0;
          
          for (const cmd of cmds) {
            let desc = cmd.description || 'No description available.';
            if (desc.length > 100) {
              desc = desc.substring(0, 97) + '...';
            }
            const line = `**/${cmd.name}** - ${desc}\n`;
            
            if (currentChunk.length + line.length > 1000) {
              const fieldName = chunkIndex === 0 
                ? categoryName 
                : `${categoryName} (cont. ${chunkIndex})`;
              
              fields.push({
                name: fieldName,
                value: currentChunk.trim(),
                inline: false
              });
              
              currentChunk = line;
              chunkIndex++;
            } else {
              currentChunk += line;
            }
          }
          
          if (currentChunk) {
            const fieldName = chunkIndex === 0 
              ? categoryName 
              : `${categoryName} (cont. ${chunkIndex})`;
            
            fields.push({
              name: fieldName,
              value: currentChunk.trim(),
              inline: false
            });
          }
        } else {
          fields.push({
            name: categoryName,
            value: commandList,
            inline: false
          });
        }
        
        // Respect Discord's 25 field limit
        if (fields.length >= maxFields) break;
      }
      
      // If no commands found, show a message
      if (fields.length === 0) {
        fields.push({
          name: 'No Commands Available',
          value: 'The bot has no commands registered. Please contact the administrator.',
          inline: false
        });
      }
      
      const embed = new EmbedBuilder()
        .setTitle('Astra Bot - Command Help')
        .setDescription(
          `Use these commands to interact with the bot.\n` +
          `**Total Commands:** ${allCommands.size + 1}` // +1 for help itself
        )
        .setColor('Purple')
        .addFields(fields.slice(0, maxFields))
        .setTimestamp();
      
      // Add footer with bot info
      embed.setFooter({
        text: `Astra Bot | Use /command-name to execute`,
      });
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('[Help Command] Error generating help:', error);
      
      // Send a basic error response
      await interaction.reply({
        content: '❌ An error occurred while generating the help message.',
        ephemeral: true
      });
    }
  }
};