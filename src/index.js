/* eslint-disable consistent-return */
import express from 'express';
import getLogger from './logger.js';
import getConfig from './config.js';
import dbConnection from './data/dbConnection.js';

const logger = getLogger('APP');
const apiCfg = getConfig('api');
const app = express();

app.get('/', (req, res) => {
    logger.debug('Received request on /');
    res.send('Hello, World!');
});

// esse codigo e apenas uma strutura exemplo de conexão com o mysql
app.get('/users', (req, res) => {
    const query = 'SELECT * FROM users';

    dbConnection.query(query, (err, results) => {
        if (err) {
            logger.error('Erro ao consultar usuários:', err);
            return res.status(500).json({ error: 'Erro ao consultar usuários' });
        }
        res.json(results);
    });
});

app.listen(apiCfg.port, apiCfg.address, () => {
    logger.info(`Server is running on http://${apiCfg.address}:${apiCfg.port}`);
});
