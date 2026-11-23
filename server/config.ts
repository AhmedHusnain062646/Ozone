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
  // Number of reverse-proxy hops to trust for X-Forwarded-* (0 = none). Set TRUST_PROXY=1 behind one proxy.
  trustProxy: Number(process.env.TRUST_PROXY ?? 0),
  reservationTtlMs: 10 * 60 * 1000,
  sweepIntervalMs: 30_000,
} as const;
