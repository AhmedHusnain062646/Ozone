// ABOUTME: Resets the _test database to the seeded state before the e2e run (migrate, then seed --reset).
// ABOUTME: Seed accounts get a fixed e2e password (see e2e/accounts.ts); only the _test database is ever touched.
import { execFileSync } from 'node:child_process';
import { E2E_PASSWORD } from './accounts.ts';

export default function globalSetup() {
  const env = { ...process.env, NODE_ENV: 'test', SEED_USER_PASSWORD: E2E_PASSWORD };
  const run = (...args: string[]) => execFileSync(process.execPath, ['--import', 'tsx', ...args], { env, stdio: 'inherit' });
  run('server/db/migrate.ts');
  run('server/db/seed.ts', '--reset');
}
