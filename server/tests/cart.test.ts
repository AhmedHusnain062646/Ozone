// ABOUTME: Cart + stock reservation rules: atomic conditional reserve, 10-minute holds, lazy and swept release, concurrency.
// ABOUTME: Includes the acceptance test: 20 parallel reservations on stock 1 -> exactly 1 success, 19 INVENTORY_CONFLICT.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq, sql } from 'drizzle-orm';
import { createApp } from '../app.ts';
import { closeDb, db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { releaseExpiredHolds, startReservationSweeper } from '../services/reservations.ts';
import { makeSeller, makeVariant, resetDb, signedInAgent } from './helpers.ts';

const app = createApp();
afterAll(closeDb);

const variantRow = async (id: string) => (await db.select().from(s.variants).where(eq(s.variants.id, id)))[0];
const lines = (userId: string) => db.select().from(s.cartItems).where(eq(s.cartItems.userId, userId));
const expireAll = () => db.update(s.cartItems).set({ expiresAt: new Date(Date.now() - 1000) });

describe('cart', () => {
  beforeEach(resetDb);

  it('requires sign-in', async () => {
    expect((await request(app).get('/api/cart')).status).toBe(401);
    expect((await request(app).post('/api/cart/items').send({ variantId: '00000000-0000-4000-8000-000000000000', quantity: 1 })).status).toBe(401);
  });

  it('adding reserves stock and creates a 10-minute hold', async () => {
    const { variant } = await makeVariant({ stock: 3 });
    const { agent, user } = await signedInAgent(app);
    const before = Date.now();
    const res = await agent.post('/api/cart/items').send({ variantId: variant.id, quantity: 2 });
    expect(res.status).toBe(201);
    expect((await variantRow(variant.id)).reserved).toBe(2);
    const [line] = await lines(user.id);
    expect(line.quantity).toBe(2);
    const ttl = line.expiresAt.getTime() - before;
    expect(ttl).toBeGreaterThan(9.9 * 60_000);
    expect(ttl).toBeLessThan(10.1 * 60_000);
  });

  it('409 INVENTORY_CONFLICT when stock - reserved < quantity; nothing is changed', async () => {
    const { variant } = await makeVariant({ stock: 1 });
    const a = await signedInAgent(app);
    const b = await signedInAgent(app);
    expect((await a.agent.post('/api/cart/items').send({ variantId: variant.id, quantity: 1 })).status).toBe(201);
    const res = await b.agent.post('/api/cart/items').send({ variantId: variant.id, quantity: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVENTORY_CONFLICT');
    expect((await variantRow(variant.id)).reserved).toBe(1);
    expect(await lines(b.user.id)).toHaveLength(0);
  });

  it('accumulates repeat adds, and PATCH/DELETE release exactly the difference', async () => {
    const { variant } = await makeVariant({ stock: 5 });
    const { agent, user } = await signedInAgent(app);
    await agent.post('/api/cart/items').send({ variantId: variant.id, quantity: 1 });
    await agent.post('/api/cart/items').send({ variantId: variant.id, quantity: 2 });
    expect((await lines(user.id))[0].quantity).toBe(3);
    expect((await variantRow(variant.id)).reserved).toBe(3);

    expect((await agent.patch(`/api/cart/items/${variant.id}`).send({ quantity: 1 })).status).toBe(200);
    expect((await variantRow(variant.id)).reserved).toBe(1);
    expect((await agent.patch(`/api/cart/items/${variant.id}`).send({ quantity: 5 })).status).toBe(200);
    expect((await variantRow(variant.id)).reserved).toBe(5);
    const over = await agent.patch(`/api/cart/items/${variant.id}`).send({ quantity: 6 });
    expect(over.status).toBe(409);
    expect((await variantRow(variant.id)).reserved).toBe(5);
    expect((await lines(user.id))[0].quantity).toBe(5);

    expect((await agent.delete(`/api/cart/items/${variant.id}`)).status).toBe(204);
    expect((await variantRow(variant.id)).reserved).toBe(0);
    expect(await lines(user.id)).toHaveLength(0);
    expect((await agent.delete(`/api/cart/items/${variant.id}`)).status).toBe(204); // idempotent
  });

  it('DELETE /cart releases every hold', async () => {
    const v1 = await makeVariant({ stock: 2 });
    const v2 = await makeVariant({ stock: 2 });
    const { agent } = await signedInAgent(app);
    await agent.post('/api/cart/items').send({ variantId: v1.variant.id, quantity: 2 });
    await agent.post('/api/cart/items').send({ variantId: v2.variant.id, quantity: 1 });
    expect((await agent.delete('/api/cart')).status).toBe(204);
    expect((await variantRow(v1.variant.id)).reserved).toBe(0);
    expect((await variantRow(v2.variant.id)).reserved).toBe(0);
    expect((await agent.get('/api/cart')).body.data.lines).toEqual([]);
  });

  it('validates input and rejects unknown, unpublished and pending-seller variants', async () => {
    const { agent } = await signedInAgent(app);
    const { variant, product } = await makeVariant({ stock: 2 });
    expect((await agent.post('/api/cart/items').send({ variantId: variant.id, quantity: 0 })).status).toBe(400);
    expect((await agent.post('/api/cart/items').send({ variantId: variant.id, quantity: 1000 })).status).toBe(400);
    expect((await agent.post('/api/cart/items').send({ variantId: 'nope', quantity: 1 })).status).toBe(400);
    expect((await agent.post('/api/cart/items').send({ variantId: variant.id, quantity: 1, userId: 'x' })).status).toBe(400);
    expect((await agent.post('/api/cart/items').send({ variantId: '00000000-0000-4000-8000-000000000000', quantity: 1 })).status).toBe(404);

    await db.update(s.products).set({ isPublished: false }).where(eq(s.products.id, product.id));
    expect((await agent.post('/api/cart/items').send({ variantId: variant.id, quantity: 1 })).status).toBe(404);

    const pending = await makeSeller(1000, 'pending_approval');
    const p = await makeVariant({ stock: 2, sellerId: pending.seller.id });
    expect((await agent.post('/api/cart/items').send({ variantId: p.variant.id, quantity: 1 })).status).toBe(404);
    expect((await variantRow(variant.id)).reserved).toBe(0);
  });

  it('carts are per user', async () => {
    const { variant } = await makeVariant({ stock: 4 });
    const a = await signedInAgent(app);
    const b = await signedInAgent(app);
    await a.agent.post('/api/cart/items').send({ variantId: variant.id, quantity: 1 });
    expect((await b.agent.get('/api/cart')).body.data.lines).toEqual([]);
    expect((await a.agent.get('/api/cart')).body.data.lines).toHaveLength(1);
  });

  it('GET /cart prices lines server-side and reports totals, expiry and server time', async () => {
    const { variant } = await makeVariant({ stock: 4, basePriceCents: 12000 });
    await db.update(s.variants).set({ priceDeltaCents: 500 }).where(eq(s.variants.id, variant.id));
    const { agent } = await signedInAgent(app);
    await agent.post('/api/cart/items').send({ variantId: variant.id, quantity: 2 });
    const { data } = (await agent.get('/api/cart')).body;
    expect(data.lines[0]).toMatchObject({ variantId: variant.id, unitPriceCents: 12500, quantity: 2, lineTotalCents: 25000 });
    expect(data.subtotalCents).toBe(25000);
    expect(new Date(data.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(Math.abs(new Date(data.serverTime).getTime() - Date.now())).toBeLessThan(5000);
  });

  describe('expiry', () => {
    it('GET /cart lazily drops expired holds and gives the stock back', async () => {
      const { variant } = await makeVariant({ stock: 2 });
      const { agent } = await signedInAgent(app);
      await agent.post('/api/cart/items').send({ variantId: variant.id, quantity: 2 });
      await expireAll();
      expect((await agent.get('/api/cart')).body.data.lines).toEqual([]);
      expect((await variantRow(variant.id)).reserved).toBe(0);
    });

    it('availability reads release expired holds first (catalog detail shows restored stock)', async () => {
      const { variant, product } = await makeVariant({ stock: 2 });
      const { agent } = await signedInAgent(app);
      await agent.post('/api/cart/items').send({ variantId: variant.id, quantity: 2 });
      expect((await request(app).get(`/api/catalog/products/${product.slug}`)).body.data.variants[0].available).toBe(0);
      await expireAll();
      expect((await request(app).get(`/api/catalog/products/${product.slug}`)).body.data.variants[0].available).toBe(2);
    });

    it('an expired hold no longer blocks someone else from reserving', async () => {
      const { variant } = await makeVariant({ stock: 1 });
      const a = await signedInAgent(app);
      const b = await signedInAgent(app);
      await a.agent.post('/api/cart/items').send({ variantId: variant.id, quantity: 1 });
      await expireAll();
      expect((await b.agent.post('/api/cart/items').send({ variantId: variant.id, quantity: 1 })).status).toBe(201);
      expect((await variantRow(variant.id)).reserved).toBe(1);
    });

    it('releaseExpiredHolds is idempotent and never double-releases under concurrent runs', async () => {
      const { variant } = await makeVariant({ stock: 3 });
      const users = await Promise.all([signedInAgent(app), signedInAgent(app), signedInAgent(app)]);
      for (const u of users) await u.agent.post('/api/cart/items').send({ variantId: variant.id, quantity: 1 });
      expect((await variantRow(variant.id)).reserved).toBe(3);
      await expireAll();
      const counts = await Promise.all(Array.from({ length: 8 }, () => releaseExpiredHolds()));
      expect(counts.reduce((a, b) => a + b, 0)).toBe(3);
      expect((await variantRow(variant.id)).reserved).toBe(0);
      expect(await releaseExpiredHolds()).toBe(0);
    });

    it('the sweeper releases expired holds on its own and can be stopped', async () => {
      const { variant } = await makeVariant({ stock: 1 });
      const { agent } = await signedInAgent(app);
      await agent.post('/api/cart/items').send({ variantId: variant.id, quantity: 1 });
      await expireAll();
      const stop = startReservationSweeper(25);
      await new Promise((r) => setTimeout(r, 300));
      stop();
      expect((await variantRow(variant.id)).reserved).toBe(0);
      expect((await db.select().from(s.cartItems))).toHaveLength(0);
    });
  });

  describe('concurrency', () => {
    it('20 parallel reservations for a variant with stock 1: exactly 1 success, 19 INVENTORY_CONFLICT', async () => {
      const { variant } = await makeVariant({ stock: 1 });
      const buyers = [];
      for (let i = 0; i < 20; i++) buyers.push(await signedInAgent(app));
      const results = await Promise.all(buyers.map((b) => b.agent.post('/api/cart/items').send({ variantId: variant.id, quantity: 1 })));
      const ok = results.filter((r) => r.status === 201);
      const conflicts = results.filter((r) => r.status === 409 && r.body.error.code === 'INVENTORY_CONFLICT');
      expect(ok).toHaveLength(1);
      expect(conflicts).toHaveLength(19);
      const row = await variantRow(variant.id);
      expect(row.stock).toBe(1);
      expect(row.reserved).toBe(1);
      expect(await db.select().from(s.cartItems)).toHaveLength(1);
    });

    it('parallel adds by the same user never over-reserve (stock 3, 10 attempts of 1)', async () => {
      const { variant } = await makeVariant({ stock: 3 });
      const { agent, user } = await signedInAgent(app);
      const results = await Promise.all(Array.from({ length: 10 }, () => agent.post('/api/cart/items').send({ variantId: variant.id, quantity: 1 })));
      expect(results.filter((r) => r.status === 201)).toHaveLength(3);
      expect(results.filter((r) => r.status === 409)).toHaveLength(7);
      expect((await variantRow(variant.id)).reserved).toBe(3);
      expect((await lines(user.id))[0].quantity).toBe(3);
    });

    it('invariant: reserved always equals the sum of live cart lines after a mixed storm', async () => {
      const { variant } = await makeVariant({ stock: 6 });
      const buyers = [];
      for (let i = 0; i < 6; i++) buyers.push(await signedInAgent(app));
      await Promise.all(buyers.flatMap((b, i) => [
        b.agent.post('/api/cart/items').send({ variantId: variant.id, quantity: 2 }),
        b.agent.post('/api/cart/items').send({ variantId: variant.id, quantity: 1 }),
        i % 2 === 0 ? b.agent.delete(`/api/cart/items/${variant.id}`) : b.agent.get('/api/cart'),
      ]));
      const row = await variantRow(variant.id);
      const sum = ((await db.execute(sql`select coalesce(sum(quantity),0)::int n from cart_items where variant_id = ${variant.id}`)).rows[0] as { n: number }).n;
      expect(row.reserved).toBe(sum);
      expect(row.reserved).toBeLessThanOrEqual(row.stock);
      expect(row.reserved).toBeGreaterThanOrEqual(0);
    });
  });
});
