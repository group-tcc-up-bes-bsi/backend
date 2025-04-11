import mysql from 'mysql2';
import getConfig from '../config.js';
import getLogger from '../logger.js';

const logger = getLogger('DB');
const connection = mysql.createConnection(getConfig('database'));

connection.connect((err) => {
    if (err) {
        throw err;
    }
    logger.info('Connected to database');
});

export default connection;
