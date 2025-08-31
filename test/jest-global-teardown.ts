import { stopTestDatabase } from './helpers/mysql-container';

module.exports = async () => {
  await stopTestDatabase();
};
