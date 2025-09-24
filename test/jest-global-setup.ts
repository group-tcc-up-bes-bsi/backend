import { startTestDatabase } from './helpers/mysql-container';
import { setEnvironmentVariables } from './helpers/test-env';

module.exports = async () => {
  await startTestDatabase();
  setEnvironmentVariables();
};
