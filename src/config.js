import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Get the current file's directory.
const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/////////////////////////////////////////////////////////////////////////
// Private Classes
/////////////////////////////////////////////////////////////////////////

/**
 * Singleton class to manage application configuration.
 */
class Config {
    /**
     * Initializes the Config instance by loading the configuration file.
     * @throws {Error} If the configuration file cannot be read or parsed.
     */
    constructor() {
        const configPath = path.resolve(dirname, '../config/config.json');
        const configData = fs.readFileSync(configPath, 'utf-8');
        this.config = JSON.parse(configData);
    }

    /**
     * Retrieves the singleton instance of the Config class.
     * @returns {Config} The singleton instance of the Config class.
     */
    static getInstance() {
        if (!Config.instance) {
            Config.instance = new Config();
        }
        return Config.instance;
    }

    /**
     * Retrieves a configuration value by key.
     * @param {string} key - The key of the configuration value to retrieve.
     * @returns {*} - The value associated with the specified key.
     */
    get(key) {
        return this.config[key];
    }
}

const appConfig = new Config();
Object.freeze(appConfig);

/////////////////////////////////////////////////////////////////////////
// Public interfaces
/////////////////////////////////////////////////////////////////////////

/**
 * Get app configuration.
 * @param {string} section - Section of the config to get.
 * @returns {object} - The configuration object or {} if not found.
 */
function getConfig(section) {
    return appConfig.get(section);
}

export default getConfig;
