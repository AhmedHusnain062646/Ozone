// ABOUTME: Loads environment config once; picks the test database when NODE_ENV=test.
// ABOUTME: Fails fast with the name of any missing variable (never prints values).
import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name} (see .env.example)`);
  return value;
}

const isTest = process.env.NODE_ENV === 'test';

export const config = {
  isTest,
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: isTest ? required('TEST_DATABASE_URL') : required('DATABASE_URL'),
  sessionSecret: required('SESSION_SECRET'),
  reservationTtlMs: 10 * 60 * 1000,
} as const;
