// ABOUTME: Vitest global setup: migrates the dedicated test database once before any test file runs.
// ABOUTME: Refuses to run unless the target database name ends in `_test` (guards the dev database).
import 'dotenv/config';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

export default async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is not set (see .env.example)');
  if (!new URL(url).pathname.endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL must point at a database whose name ends in _test');
  }
  const pool = new pg.Pool({ connectionString: url });
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: new URL('../db/migrations', import.meta.url).pathname,
    });
  } finally {
    await pool.end();
  }
}
