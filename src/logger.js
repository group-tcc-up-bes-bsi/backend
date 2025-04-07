import log4js from 'log4js';
import getConfig from './config.js';

const loggerConfig = getConfig('logger');

if (!loggerConfig) {
    throw new Error('Logger configuration not found');
}

log4js.configure({
    appenders: {
        app: {
            type: loggerConfig.type,
            filename: loggerConfig.filename,
        },
    },
    categories: {
        default: {
            appenders: ['app'],
            level: loggerConfig.level,
        },
    },
});

/**
 * Retrieves a logger instance with an optional prefix.
 * @param {string} [prefix] - The prefix for the logger.
 * @returns {log4js.Logger} The logger instance.
 */
function getLogger(prefix) {
    // TODO - Add a singleton logic per prefix, avoiding multiple instances.
    return log4js.getLogger(prefix || 'APP');
}

export default getLogger;
