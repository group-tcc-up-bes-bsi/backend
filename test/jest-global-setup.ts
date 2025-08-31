import { startTestDatabase } from './helpers/mysql-container';

module.exports = async () => {
  await startTestDatabase();
};
