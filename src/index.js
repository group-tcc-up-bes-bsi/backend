import express from 'express';
import getLogger from './logger.js';
import getConfig from './config.js';

const logger = getLogger('APP');
const apiCfg = getConfig('api');
const app = express();

app.get('/', (req, res) => {
    logger.debug('Received request on /');
    res.send('Hello, World!');
});

app.listen(apiCfg.port, apiCfg.address, () => {
    logger.info(`Server is running on http://${apiCfg.address}:${apiCfg.port}`);
});
