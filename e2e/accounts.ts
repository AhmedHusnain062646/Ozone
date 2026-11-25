// ABOUTME: Seeded account emails and the shared e2e password (local test database only, never a real secret).
// ABOUTME: Mirrors server/db/seed.ts: one admin, buyers, and one user per atelier slug.
export const E2E_PASSWORD = 'e2e-seed-password-1';
export const ACCOUNTS = {
  admin: 'admin@ozone.test',
  buyer: 'julian.sterling@ozone.test',
  vane: 'vane@ozone.test',
  silt: 'silt@ozone.test',
  homage: 'homage@ozone.test',
  kurogane: 'kurogane@ozone.test',
} as const;
