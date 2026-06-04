/**
 * Global Error Handler System
 * Catches uncaught exceptions and unhandled rejections
 */

const DEBUG = process.env.DEBUG === 'true';

class ErrorHandler {
  static initialize() {
    process.on('uncaughtException', (error) => {
      console.error('\n' + '='.repeat(80));
      console.error('❌ [ERROR HANDLER] UNCAUGHT EXCEPTION');
      console.error('='.repeat(80) + '\n');
      console.error(`Error: ${error.message}`);
      console.error(`Type: ${error.name}`);
      console.error(`Stack:\n${error.stack}\n`);

      if (DEBUG) {
        console.error('DEBUG INFO:');
        console.error(`  Timestamp: ${new Date().toISOString()}`);
        console.error(`  Process: ${process.pid}`);
        console.error(`  Node: ${process.version}`);
      }

      console.error('='.repeat(80));
      console.error('⚠️  Bot may be in an unstable state. Manual restart recommended.\n');

      // Don't exit - attempt to keep bot running
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('\n' + '='.repeat(80));
      console.error('❌ [ERROR HANDLER] UNHANDLED PROMISE REJECTION');
      console.error('='.repeat(80) + '\n');

      if (reason instanceof Error) {
        console.error(`Error: ${reason.message}`);
        console.error(`Type: ${reason.name}`);
        console.error(`Stack:\n${reason.stack}\n`);
      } else {
        console.error(`Reason: ${JSON.stringify(reason, null, 2)}\n`);
      }

      if (DEBUG) {
        console.error('DEBUG INFO:');
        console.error(`  Promise: ${promise}`);
        console.error(`  Timestamp: ${new Date().toISOString()}`);
      }

      console.error('='.repeat(80) + '\n');

      // Don't exit - attempt to keep bot running
    });

    console.log('[ERROR HANDLER] Global error handlers initialized\n');
  }

  static async wrapAsync(fn, context = 'Unknown') {
    try {
      return await fn();
    } catch (error) {
      console.error(`\n[ERROR HANDLER] Error in ${context}:`);
      console.error(`  Message: ${error.message}`);
      if (DEBUG) {
        console.error(`  Stack: ${error.stack}`);
      }
      throw error;
    }
  }

  static logError(context, error, details = {}) {
    console.error(`\n[${context}] Error occurred:`);
    console.error(`  Message: ${error.message}`);

    if (DEBUG) {
      console.error(`  Details:`, details);
      console.error(`  Stack: ${error.stack}`);
    }
  }
}

module.exports = ErrorHandler;
