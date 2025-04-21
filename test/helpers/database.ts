import { MySqlContainer, StartedMySqlContainer } from '@testcontainers/mysql';

let container: StartedMySqlContainer | undefined;

export const startTestDatabase = async () => {
  container = await new MySqlContainer('mysql:8')
    .withDatabase('test_db')
    .withUsername('test_user')
    .withUserPassword('test_pass')
    .withRootPassword('root_pass')
    .withExposedPorts(3306)
    .start();

  const mappedPort = container.getMappedPort(3306);

  process.env.DB_HOST = container.getHost();
  process.env.DB_PORT = mappedPort.toString();
  process.env.DB_USERNAME = container.getUsername();
  process.env.DB_PASSWORD = container.getUserPassword();
  process.env.DB_DATABASE = container.getDatabase();
};

export const stopTestDatabase = async () => {
  if (container) {
    await container.stop();
  }
};
