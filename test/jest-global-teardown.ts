import { stopTestDatabase } from './helpers/database';

module.exports = async () => {
  await stopTestDatabase();
};
