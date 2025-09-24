import * as os from 'os';
import * as path from 'path';

/**
 * Sets environment variables for e2e tests.
 */
export function setEnvironmentVariables() {
  // Database environment variables are set on mysql-container.ts

  process.env.HOST = 'localhost';
  process.env.PORT = '3000';
  process.env.PUBLIC_ADDR = 'localhost';

  process.env.JWT_SECRET = 'doc_dash_e2e_tests';
  process.env.JWT_EXPIRE = '1h';

  process.env.ADMINPASS = 'doc_dash';
  // Definindo FILE_SAVE_PATH automaticamente, usando a pasta temporária do sistema
  process.env.FILE_SAVE_PATH = path.join(os.tmpdir(), 'doc_dash_files');
}
