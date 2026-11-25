// ABOUTME: Single pg Pool and Drizzle instance shared by the API, seed and tests.
// ABOUTME: Pool errors are logged, never swallowed; `closeDb` lets scripts exit cleanly.
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../config.ts';
import * as schema from './schema.ts';

export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 20 });
pool.on('error', (err) => {
  console.error('pg pool error', err);
});

export const db = drizzle(pool, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export async function closeDb(): Promise<void> {
  await pool.end();
}
