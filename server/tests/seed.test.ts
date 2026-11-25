// ABOUTME: Runs the real seed script against the test database and checks the data it leaves behind.
// ABOUTME: Covers the money identity, balances, guard against re-seeding, and the pending-seller rule.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { sql } from 'drizzle-orm';
import { db, closeDb } from '../db/client.ts';
import { resetDb } from './helpers.ts';

const runSeed = (...args: string[]) =>
  execFileSync(process.execPath, ['--import', 'tsx', 'server/db/seed.ts', ...args], {
    env: { ...process.env, NODE_ENV: 'test', SEED_USER_PASSWORD: 'seed-test-password' },
    encoding: 'utf8',
  });
const count = async (table: string) =>
  ((await db.execute(sql.raw(`select count(*)::int n from ${table}`))).rows[0] as { n: number }).n;

describe('seed script', () => {
  beforeAll(async () => {
    await resetDb();
    runSeed();
  });
  afterAll(closeDb);

  it('creates one admin, two buyers and one user per atelier', async () => {
    const rows = (await db.execute(sql`select role, count(*)::int n from users where email not like 'reviewer%' group by role`)).rows;
    expect(Object.fromEntries(rows.map((r) => [r.role, r.n]))).toEqual({ admin: 1, buyer: 2, seller: 6 });
  });

  it('seeds exactly one pending_approval seller (Kurogane Forge) with no products', async () => {
    const rows = (await db.execute(sql`
      select s.name, (select count(*)::int from products p where p.seller_id = s.id) products
      from sellers s where s.status = 'pending_approval'`)).rows;
    expect(rows).toEqual([{ name: 'Kurogane Forge', products: 0 }]);
  });

  it('keeps gross = commission + net on every sub-order and ledger row', async () => {
    const bad = (await db.execute(sql`
      select (select count(*)::int from sub_orders where subtotal_cents <> commission_cents + net_cents) a,
             (select count(*)::int from ledger_entries where gross_cents <> commission_cents + net_cents) b`)).rows[0];
    expect(bad).toEqual({ a: 0, b: 0 });
  });

  it('never leaves a seller with a negative available balance', async () => {
    const rows = (await db.execute(sql`
      select seller_id, sum(net_cents)::int bal from ledger_entries
      where status in ('settled','disbursed') group by seller_id`)).rows as { bal: number }[];
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.bal).toBeGreaterThanOrEqual(0);
  });

  it('does not store any plaintext password and hashes with argon2id', async () => {
    const rows = (await db.execute(sql`select password_hash from users`)).rows as { password_hash: string }[];
    for (const r of rows) expect(r.password_hash.startsWith('$argon2id$')).toBe(true);
  });

  it('refuses to reseed without --reset and leaves data untouched', async () => {
    const before = await count('users');
    const out = runSeed();
    expect(out).toContain('pass --reset');
    expect(await count('users')).toBe(before);
  });

  it('has a return-requested sub-order for the admin queue', async () => {
    expect(await count(`sub_orders where status = 'RETURN_REQUESTED'`)).toBe(1);
  });
});
