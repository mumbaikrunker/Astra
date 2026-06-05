const path = require('path');

/**
 * Centralized Command Registry System
 * Provides:
 * - Command validation and registration
 * - Duplicate detection
 * - Discord sync comparison
 * - Comprehensive error tracking
 * - Type-safe command access
 */
class CommandRegistry {
  constructor() {
    this.commands = new Map(); // name -> command object
    this.commandFiles = new Map(); // name -> file path
    this.loadErrors = [];
    this.validationWarnings = [];
    this.isLocked = false;
  }

  /**
   * Register a command with full validation
   * @param {string} filePath - Path to command file
   * @param {Object} command - Command object with data and execute
   * @returns {Object} Registration result { success, command?, error? }
   */
  register(filePath, command) {
    if (this.isLocked) {
      return {
        success: false,
        error: 'Registry is locked - cannot register new commands'
      };
    }

    // Validate command object structure
    const validation = this._validateCommand(command, filePath);
    if (!validation.valid) {
      this.loadErrors.push(validation.error);
      return {
        success: false,
        error: validation.error.reason,
        details: validation.error
      };
    }

    const commandName = validation.name;

    // Check for duplicates
    if (this.commands.has(commandName)) {
      const error = {
        file: filePath,
        reason: `Duplicate command name: /${commandName}`,
        existingFile: this.commandFiles.get(commandName),
        type: 'duplicate'
      };
      this.loadErrors.push(error);
      return {
        success: false,
        error: error.reason,
        details: error
      };
    }

    // Register the command
    this.commands.set(commandName, command);
    this.commandFiles.set(commandName, filePath);

    return {
      success: true,
      command: commandName,
      file: filePath
    };
  }

  /**
   * Internal command validation
   * @private
   */
  _validateCommand(command, filePath) {
    // Check data exists
    if (!command.data) {
      return {
        valid: false,
        error: {
          file: filePath,
          reason: 'Missing "data" property (SlashCommandBuilder)',
          type: 'missing_data'
        }
      };
    }

    // Check command name
    if (!command.data.name || typeof command.data.name !== 'string') {
      return {
        valid: false,
        error: {
          file: filePath,
          reason: `Invalid command name: ${command.data.name} (must be non-empty string)`,
          type: 'invalid_name'
        }
      };
    }

    const commandName = command.data.name.toLowerCase().trim();

    // Check execute function
    if (!command.execute || typeof command.execute !== 'function') {
      return {
        valid: false,
        error: {
          file: filePath,
          name: commandName,
          reason: 'Missing "execute" function',
          type: 'missing_execute'
        }
      };
    }

    // Verify toJSON method exists on data (for Discord API)
    if (typeof command.data.toJSON !== 'function') {
      return {
        valid: false,
        error: {
          file: filePath,
          name: commandName,
          reason: 'Command data missing toJSON() method (not a valid SlashCommandBuilder)',
          type: 'invalid_builder'
        }
      };
    }

    try {
      command.data.toJSON();
    } catch (error) {
      return {
        valid: false,
        error: {
          file: filePath,
          name: commandName,
          reason: `Command data failed serialization: ${error.message}`,
          type: 'invalid_builder'
        }
      };
    }

    return {
      valid: true,
      name: commandName,
      command
    };
  }

  /**
   * Get a command by name
   * @param {string} name - Command name (case-insensitive)
   * @returns {Object|null}
   */
  get(name) {
    if (!name || typeof name !== 'string') return null;
    return this.commands.get(name.toLowerCase().trim()) || null;
  }

  /**
   * Check if command exists
   * @param {string} name - Command name
   * @returns {boolean}
   */
  has(name) {
    if (!name || typeof name !== 'string') return false;
    return this.commands.has(name.toLowerCase().trim());
  }

  /**
   * Get all loaded commands
   * @returns {Map}
   */
  getAll() {
    return new Map(this.commands);
  }

  /**
   * Get all command names sorted
   * @returns {string[]}
   */
  getNames() {
    return Array.from(this.commands.keys()).sort();
  }

  /**
   * Get command count
   * @returns {number}
   */
  size() {
    return this.commands.size;
  }

  /**
   * Get all load errors
   * @returns {Array}
   */
  getErrors() {
    return [...this.loadErrors];
  }

  /**
   * Get detailed load report
   * @returns {Object}
   */
  getLoadReport() {
    const successCount = this.commands.size;
    const errorCount = this.loadErrors.length;

    return {
      timestamp: new Date().toISOString(),
      totalLoaded: successCount,
      totalErrors: errorCount,
      commands: this.getNames(),
      errors: this.getErrors(),
      isValid: errorCount === 0,
      summary: {
        valid: successCount,
        duplicates: this.loadErrors.filter(e => e.type === 'duplicate').length,
        malformed: this.loadErrors.filter(e => 
          ['missing_data', 'missing_execute', 'invalid_name', 'invalid_builder'].includes(e.type)
        ).length
      }
    };
  }

  /**
   * Compare with Discord deployed commands
   * @param {Array} discordCommands - Commands fetched from Discord API
   * @returns {Object}
   */
  compareWithDiscord(discordCommands) {
    const localNames = new Set(this.commands.keys());
    const discordNames = new Set(
      discordCommands.map(cmd => cmd.name.toLowerCase())
    );

    const synced = Array.from(localNames).filter(name => discordNames.has(name));
    const localOnly = Array.from(localNames).filter(name => !discordNames.has(name));
    const discordOnly = Array.from(discordNames).filter(name => !localNames.has(name));

    return {
      totalLocal: this.commands.size,
      totalDiscord: discordCommands.length,
      synced: synced.length,
      localOnly: localOnly.length,
      discordOnly: discordOnly.length,
      isInSync: localOnly.length === 0 && discordOnly.length === 0,
      details: {
        synced,
        localOnly,
        discordOnly
      }
    };
  }

  /**
   * Lock registry to prevent further registrations
   * Called after startup completes
   */
  lock() {
    this.isLocked = true;
  }

  /**
   * Unlock registry (for testing/reloading)
   */
  unlock() {
    this.isLocked = false;
  }

  /**
   * Clear all registered commands
   * Used for testing or complete reload
   */
  clear() {
    this.commands.clear();
    this.commandFiles.clear();
    this.loadErrors = [];
    this.validationWarnings = [];
  }

  /**
   * Get registry statistics
   * @returns {Object}
   */
  getStats() {
    return {
      totalCommands: this.commands.size,
      totalErrors: this.loadErrors.length,
      isLocked: this.isLocked,
      commands: this.getNames(),
      errorTypes: this._categorizeErrors()
    };
  }

  /**
   * Internal helper to categorize errors
   * @private
   */
  _categorizeErrors() {
    const categories = {
      duplicate: 0,
      missing_data: 0,
      missing_execute: 0,
      invalid_name: 0,
      invalid_builder: 0,
      other: 0
    };

    this.loadErrors.forEach(error => {
      const type = error.type || 'other';
      if (type in categories) {
        categories[type]++;
      } else {
        categories.other++;
      }
    });

    return categories;
  }
}

// Export singleton instance
module.exports = new CommandRegistry();
