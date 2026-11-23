// ABOUTME: Applies pending Drizzle migrations to the configured database (dev, or test when NODE_ENV=test).
// ABOUTME: Idempotent: already-applied migrations are skipped.
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, closeDb } from './client.ts';

export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: new URL('./migrations', import.meta.url).pathname });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => console.log('migrations applied'))
    .catch((err) => {
      console.error('migration failed', err);
      process.exitCode = 1;
    })
    .finally(closeDb);
}
