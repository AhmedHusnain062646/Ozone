// ABOUTME: Proves the database itself enforces the stock, idempotency, split and ledger invariants.
// ABOUTME: Each case attempts a forbidden write and asserts Postgres rejects it (not app code).
import { beforeEach, afterAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { db, closeDb } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { makeSeller, makeUser, makeVariant, resetDb } from './helpers.ts';

const pgCode = (e: unknown) =>
  ((e as { cause?: { code?: string }; code?: string }).cause?.code ?? (e as { code?: string }).code);

async function expectPgError(p: Promise<unknown>, code: string) {
  const err = await p.then(
    () => null,
    (e) => e,
  );
  expect(err, 'expected the statement to be rejected').not.toBeNull();
  expect(pgCode(err)).toBe(code);
}

const CHECK_VIOLATION = '23514';
const UNIQUE_VIOLATION = '23505';
const RAISE_EXCEPTION = 'P0001';

describe('schema invariants', () => {
  beforeEach(resetDb);
  afterAll(closeDb);

  it('rejects reserved > stock', async () => {
    const { variant } = await makeVariant({ stock: 1 });
    await expectPgError(
      db.update(s.variants).set({ reserved: 2 }).where(eq(s.variants.id, variant.id)),
      CHECK_VIOLATION,
    );
  });

  it('rejects negative stock and negative reserved', async () => {
    const { variant } = await makeVariant({ stock: 1 });
    await expectPgError(
      db.update(s.variants).set({ stock: -1 }).where(eq(s.variants.id, variant.id)),
      CHECK_VIOLATION,
    );
    await expectPgError(
      db.update(s.variants).set({ reserved: -1 }).where(eq(s.variants.id, variant.id)),
      CHECK_VIOLATION,
    );
  });

  it('rejects a sub-order whose commission + net != subtotal', async () => {
    const buyer = await makeUser();
    const { seller } = await makeSeller();
    const [order] = await db
      .insert(s.orders)
      .values({
        code: 'OZ-T-1',
        buyerId: buyer.id,
        paymentMethod: 'cod',
        paymentStatus: 'PENDING_COD',
        totalCents: 1000,
        idempotencyKey: 'k1',
        shippingAddress: {},
      })
      .returning();
    await expectPgError(
      db.insert(s.subOrders).values({
        code: 'OZ-T-1-A',
        orderId: order.id,
        sellerId: seller.id,
        status: 'PLACED',
        subtotalCents: 1000,
        commissionBps: 1000,
        commissionCents: 100,
        netCents: 899,
      }),
      CHECK_VIOLATION,
    );
  });

  it('allows the same idempotency key for different buyers but not the same buyer', async () => {
    const [a, b] = [await makeUser(), await makeUser()];
    const base = {
      paymentMethod: 'cod' as const,
      paymentStatus: 'PENDING_COD' as const,
      totalCents: 1,
      idempotencyKey: 'same-key',
      shippingAddress: {},
    };
    await db.insert(s.orders).values({ ...base, code: 'A1', buyerId: a.id });
    await db.insert(s.orders).values({ ...base, code: 'B1', buyerId: b.id });
    await expectPgError(
      db.insert(s.orders).values({ ...base, code: 'A2', buyerId: a.id }),
      UNIQUE_VIOLATION,
    );
  });

  it('enforces one review per buyer per product', async () => {
    const buyer = await makeUser();
    const { product } = await makeVariant({ stock: 1 });
    const row = { productId: product.id, buyerId: buyer.id, rating: 5, title: 't', comment: 'c' };
    await db.insert(s.reviews).values(row);
    await expectPgError(db.insert(s.reviews).values(row), UNIQUE_VIOLATION);
  });

  describe('ledger is append-only', () => {
    async function insertEntry(status: 'pending' | 'settled' = 'pending') {
      const { seller } = await makeSeller();
      const [entry] = await db
        .insert(s.ledgerEntries)
        .values({
          sellerId: seller.id,
          type: 'sale_credit',
          grossCents: 1000,
          commissionCents: 100,
          netCents: 900,
          status,
        })
        .returning();
      return entry;
    }

    it('rejects gross != commission + net', async () => {
      const { seller } = await makeSeller();
      await expectPgError(
        db.insert(s.ledgerEntries).values({
          sellerId: seller.id,
          type: 'sale_credit',
          grossCents: 1000,
          commissionCents: 100,
          netCents: 1,
          status: 'settled',
        }),
        CHECK_VIOLATION,
      );
    });

    it('rejects DELETE', async () => {
      const e = await insertEntry();
      await expectPgError(
        db.delete(s.ledgerEntries).where(eq(s.ledgerEntries.id, e.id)),
        RAISE_EXCEPTION,
      );
    });

    it('rejects editing amounts', async () => {
      const e = await insertEntry();
      await expectPgError(
        db.update(s.ledgerEntries).set({ netCents: 1, commissionCents: 999 }).where(eq(s.ledgerEntries.id, e.id)),
        RAISE_EXCEPTION,
      );
    });

    it('rejects settled -> pending', async () => {
      const e = await insertEntry('settled');
      await expectPgError(
        db.update(s.ledgerEntries).set({ status: 'pending' }).where(eq(s.ledgerEntries.id, e.id)),
        RAISE_EXCEPTION,
      );
    });

    it('allows pending -> settled (COD delivery)', async () => {
      const e = await insertEntry();
      await db.update(s.ledgerEntries).set({ status: 'settled' }).where(eq(s.ledgerEntries.id, e.id));
      const [row] = await db.select().from(s.ledgerEntries).where(eq(s.ledgerEntries.id, e.id));
      expect(row.status).toBe('settled');
    });
  });

  it('database runs in UTC', async () => {
    const r = await db.execute(sql`show timezone`);
    expect(String(r.rows[0].TimeZone)).toMatch(/UTC/);
  });
});
