// ABOUTME: Checkout contract: one transaction, server-side pricing, per-seller split with commission snapshot, ledger, idempotency.
// ABOUTME: Includes the acceptance tests: same key twice (and concurrently) -> exactly one order; buyer cannot read another buyer's order.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Test } from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../app.ts';
import { closeDb, db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { makeSeller, makeVariant, resetDb, signedInAgent } from './helpers.ts';

const app = createApp();
afterAll(closeDb);

const address = { fullName: 'Ada Lovelace', street: '1 Analytical Way', city: 'London', state: 'LDN', postalCode: 'N1 9GU', country: 'United Kingdom' };
const body = (extra: Record<string, unknown> = {}) => ({ idempotencyKey: `key-${Math.random().toString(36).slice(2)}-${Date.now()}`, paymentMethod: 'sandbox_card', shippingAddress: address, ...extra });
type Agent = Awaited<ReturnType<typeof signedInAgent>>['agent'];
const addToCart = (agent: Agent, variantId: string, quantity = 1): Test => agent.post('/api/cart/items').send({ variantId, quantity });
const variantRow = async (id: string) => (await db.select().from(s.variants).where(eq(s.variants.id, id)))[0];
const count = async (table: Parameters<typeof db.select>[0] extends never ? never : any) => (await db.select().from(table)).length;

describe('checkout', () => {
  beforeEach(resetDb);

  it('requires sign-in and a non-empty cart', async () => {
    const anon = await import('supertest').then((m) => m.default(app).post('/api/checkout').send(body()));
    expect(anon.status).toBe(401);
    const { agent } = await signedInAgent(app);
    const empty = await agent.post('/api/checkout').send(body());
    expect(empty.status).toBe(409);
    expect(empty.body.error.code).toBe('CART_EMPTY');
  });

  it('creates a paid order: stock decremented, holds released, cart cleared, ledger written, history actor from session', async () => {
    const { seller } = await makeSeller(1000);
    const { variant } = await makeVariant({ stock: 3, sellerId: seller.id, basePriceCents: 25000 });
    const { agent, user } = await signedInAgent(app);
    await addToCart(agent, variant.id, 2);

    const res = await agent.post('/api/checkout').send(body());
    expect(res.status).toBe(201);
    const order = res.body.data;
    expect(order).toMatchObject({ paymentMethod: 'sandbox_card', paymentStatus: 'PAID', totalCents: 50000 });
    expect(order.subOrders).toHaveLength(1);
    expect(order.subOrders[0]).toMatchObject({ status: 'PAID', subtotalCents: 50000 });
    expect(order.subOrders[0].history.map((h: { status: string }) => h.status)).toEqual(['PLACED', 'PAID']);
    expect(order.subOrders[0].history[0]).toMatchObject({ actorRole: 'buyer' });

    const v = await variantRow(variant.id);
    expect(v).toMatchObject({ stock: 1, reserved: 0 });
    expect(await db.select().from(s.cartItems).where(eq(s.cartItems.userId, user.id))).toHaveLength(0);

    const ledger = await db.select().from(s.ledgerEntries);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ type: 'sale_credit', status: 'settled', grossCents: 50000, commissionCents: 5000, netCents: 45000, sellerId: seller.id });
    expect(await db.select().from(s.paymentIntents)).toHaveLength(1);
    const [stored] = await db.select().from(s.statusEvents).where(eq(s.statusEvents.status, 'PLACED'));
    expect(stored.actorUserId).toBe(user.id);
  });

  it('splits a two-atelier cart into one parent order with two sub-orders, each snapshotting its own commission rate', async () => {
    const a = await makeSeller(1000);
    const b = await makeSeller(850);
    const va = await makeVariant({ stock: 2, sellerId: a.seller.id, basePriceCents: 10000 });
    const vb = await makeVariant({ stock: 2, sellerId: b.seller.id, basePriceCents: 33300 });
    const { agent } = await signedInAgent(app);
    await addToCart(agent, va.variant.id);
    await addToCart(agent, vb.variant.id);

    const res = await agent.post('/api/checkout').send(body());
    expect(res.status).toBe(201);
    const { subOrders, totalCents } = res.body.data;
    expect(subOrders).toHaveLength(2);
    expect(totalCents).toBe(43300);
    const rows = await db.select().from(s.subOrders);
    const byRate = Object.fromEntries(rows.map((so) => [so.sellerId, so.commissionBps]));
    expect(byRate[a.seller.id]).toBe(1000);
    expect(byRate[b.seller.id]).toBe(850);
    expect(await count(s.orders)).toBe(1);
    expect(await count(s.subOrders)).toBe(2);

    // gross = commission + net on every sub-order and ledger row; sub-order totals sum to the order total
    const subs = await db.select().from(s.subOrders);
    for (const so of subs) expect(so.subtotalCents).toBe(so.commissionCents + so.netCents);
    for (const l of await db.select().from(s.ledgerEntries)) expect(l.grossCents).toBe(l.commissionCents + l.netCents);
    expect(subs.reduce((n, x) => n + x.subtotalCents, 0)).toBe(totalCents);
    const bSub = subs.find((x) => x.sellerId === b.seller.id)!;
    expect(bSub).toMatchObject({ commissionCents: 2831, netCents: 30469 }); // 33300 * 8.5% = 2830.5 -> 2831
  });

  it("later changes to a seller's rate do not touch existing sub-orders (snapshot)", async () => {
    const { seller } = await makeSeller(1000);
    const { variant } = await makeVariant({ stock: 1, sellerId: seller.id, basePriceCents: 10000 });
    const { agent } = await signedInAgent(app);
    await addToCart(agent, variant.id);
    const res = await agent.post('/api/checkout').send(body());
    await db.update(s.sellers).set({ commissionBps: 4000 }).where(eq(s.sellers.id, seller.id));
    const so = (await db.select().from(s.subOrders))[0];
    expect(so.commissionBps).toBe(1000);
    expect(so.commissionCents).toBe(1000);
    expect(res.body.data.subOrders[0].commissionBps).toBeUndefined(); // buyers do not see platform economics
  });

  it('prices every line on the server at checkout time and rejects client-supplied prices', async () => {
    const { variant, product } = await makeVariant({ stock: 2, basePriceCents: 10000 });
    const { agent } = await signedInAgent(app);
    await addToCart(agent, variant.id);
    await db.update(s.products).set({ basePriceCents: 12000 }).where(eq(s.products.id, product.id));
    const forged = await agent.post('/api/checkout').send(body({ totalCents: 1, subOrders: [] }));
    expect(forged.status).toBe(400);
    const res = await agent.post('/api/checkout').send(body());
    expect(res.body.data.totalCents).toBe(12000);
  });

  it('cash on delivery: sub-order stays PLACED, payment PENDING_COD, ledger entry pending, stock still moves', async () => {
    const { variant } = await makeVariant({ stock: 2, basePriceCents: 10000 });
    const { agent } = await signedInAgent(app);
    await addToCart(agent, variant.id);
    const res = await agent.post('/api/checkout').send(body({ paymentMethod: 'cod' }));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ paymentStatus: 'PENDING_COD' });
    expect(res.body.data.subOrders[0]).toMatchObject({ status: 'PLACED' });
    expect((await db.select().from(s.ledgerEntries))[0].status).toBe('pending');
    expect(await variantRow(variant.id)).toMatchObject({ stock: 1, reserved: 0 });
  });

  it('a declined sandbox payment changes nothing: no order, cart and hold intact', async () => {
    const { variant } = await makeVariant({ stock: 2 });
    const { agent } = await signedInAgent(app);
    await addToCart(agent, variant.id);
    const res = await agent.post('/api/checkout').send(body({ sandboxOutcome: 'decline' }));
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe('PAYMENT_DECLINED');
    expect(await count(s.orders)).toBe(0);
    expect(await count(s.ledgerEntries)).toBe(0);
    expect(await variantRow(variant.id)).toMatchObject({ stock: 2, reserved: 1 });
    expect((await agent.get('/api/cart')).body.data.lines).toHaveLength(1);
    // and the buyer can retry successfully with the same cart
    expect((await agent.post('/api/checkout').send(body())).status).toBe(201);
  });

  it('fails with HOLD_EXPIRED when a hold lapsed; nothing is written', async () => {
    const { variant } = await makeVariant({ stock: 1 });
    const { agent } = await signedInAgent(app);
    await addToCart(agent, variant.id);
    await db.update(s.cartItems).set({ expiresAt: new Date(Date.now() - 1000) });
    const res = await agent.post('/api/checkout').send(body());
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('HOLD_EXPIRED');
    expect(await count(s.orders)).toBe(0);
    expect((await variantRow(variant.id)).stock).toBe(1);
  });

  it('fails with ITEM_UNAVAILABLE when the product was unpublished after reserving', async () => {
    const { variant, product } = await makeVariant({ stock: 1 });
    const { agent } = await signedInAgent(app);
    await addToCart(agent, variant.id);
    await db.update(s.products).set({ isPublished: false }).where(eq(s.products.id, product.id));
    const res = await agent.post('/api/checkout').send(body());
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ITEM_UNAVAILABLE');
    expect(await count(s.orders)).toBe(0);
  });

  it('validates the address, payment method and idempotency key', async () => {
    const { variant } = await makeVariant({ stock: 1 });
    const { agent } = await signedInAgent(app);
    await addToCart(agent, variant.id);
    expect((await agent.post('/api/checkout').send(body({ shippingAddress: { ...address, postalCode: '' } }))).status).toBe(400);
    expect((await agent.post('/api/checkout').send(body({ paymentMethod: 'bitcoin' }))).status).toBe(400);
    expect((await agent.post('/api/checkout').send(body({ idempotencyKey: 'x' }))).status).toBe(400);
    expect((await agent.post('/api/checkout').send(body({ cardNumber: '4242424242424242' }))).status).toBe(400); // no card data accepted, ever
  });

  describe('idempotency', () => {
    it('the same key twice returns the original order and creates nothing new', async () => {
      const { variant } = await makeVariant({ stock: 3, basePriceCents: 10000 });
      const { agent } = await signedInAgent(app);
      await addToCart(agent, variant.id, 1);
      const payload = body();
      const first = await agent.post('/api/checkout').send(payload);
      const second = await agent.post('/api/checkout').send(payload);
      expect(first.status).toBe(201);
      expect(second.status).toBe(200);
      expect(second.headers['idempotent-replay']).toBe('true');
      expect(second.body.data.id).toBe(first.body.data.id);
      expect(second.body.data.code).toBe(first.body.data.code);
      expect(await count(s.orders)).toBe(1);
      expect(await count(s.ledgerEntries)).toBe(1);
      expect(await variantRow(variant.id)).toMatchObject({ stock: 2, reserved: 0 });
    });

    it('replays win even if the cart was refilled meanwhile (no second order, cart untouched)', async () => {
      const { variant } = await makeVariant({ stock: 3 });
      const { agent } = await signedInAgent(app);
      await addToCart(agent, variant.id);
      const payload = body();
      await agent.post('/api/checkout').send(payload);
      await addToCart(agent, variant.id);
      const replay = await agent.post('/api/checkout').send(payload);
      expect(replay.status).toBe(200);
      expect(await count(s.orders)).toBe(1);
      expect((await agent.get('/api/cart')).body.data.lines).toHaveLength(1);
    });

    it('8 concurrent submissions of the same key produce exactly one order', async () => {
      const { variant } = await makeVariant({ stock: 5, basePriceCents: 10000 });
      const { agent } = await signedInAgent(app);
      await addToCart(agent, variant.id, 2);
      const payload = body();
      const results = await Promise.all(Array.from({ length: 8 }, () => agent.post('/api/checkout').send(payload)));
      expect(results.filter((r) => r.status === 201)).toHaveLength(1);
      expect(results.filter((r) => r.status === 200)).toHaveLength(7);
      expect(new Set(results.map((r) => r.body.data.code)).size).toBe(1);
      expect(await count(s.orders)).toBe(1);
      expect(await count(s.subOrders)).toBe(1);
      expect(await count(s.ledgerEntries)).toBe(1);
      expect(await variantRow(variant.id)).toMatchObject({ stock: 3, reserved: 0 });
    });

    it('reusing a key with a different payment method or address is rejected (422)', async () => {
      const { variant } = await makeVariant({ stock: 3 });
      const { agent } = await signedInAgent(app);
      await addToCart(agent, variant.id);
      const payload = body();
      await agent.post('/api/checkout').send(payload);
      const other = await agent.post('/api/checkout').send({ ...payload, paymentMethod: 'cod' });
      expect(other.status).toBe(422);
      expect(other.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
      expect(await count(s.orders)).toBe(1);
    });

    it('keys are scoped per user: another buyer may use the same key string', async () => {
      const v1 = await makeVariant({ stock: 1 });
      const v2 = await makeVariant({ stock: 1 });
      const a = await signedInAgent(app);
      const b = await signedInAgent(app);
      await addToCart(a.agent, v1.variant.id);
      await addToCart(b.agent, v2.variant.id);
      const payload = body({ idempotencyKey: 'shared-key-123456' });
      expect((await a.agent.post('/api/checkout').send(payload)).status).toBe(201);
      expect((await b.agent.post('/api/checkout').send(payload)).status).toBe(201);
      expect(await count(s.orders)).toBe(2);
    });
  });

  describe('reading orders', () => {
    it("a buyer cannot read another buyer's order (403) but can read their own; admin can read any; anonymous 401; unknown 404", async () => {
      const { variant } = await makeVariant({ stock: 2 });
      const owner = await signedInAgent(app);
      const other = await signedInAgent(app);
      const admin = await signedInAgent(app, 'admin');
      await addToCart(owner.agent, variant.id);
      const code = (await owner.agent.post('/api/checkout').send(body())).body.data.code;

      expect((await owner.agent.get(`/api/orders/${code}`)).status).toBe(200);
      const denied = await other.agent.get(`/api/orders/${code}`);
      expect(denied.status).toBe(403);
      expect(denied.body.error.code).toBe('FORBIDDEN');
      const asAdmin = await admin.agent.get(`/api/orders/${code}`);
      expect(asAdmin.status).toBe(200);
      expect(asAdmin.body.data.subOrders[0].commissionBps).toBeTypeOf('number'); // admin sees financials
      expect((await (await import('supertest')).default(app).get(`/api/orders/${code}`)).status).toBe(401);
      expect((await owner.agent.get('/api/orders/OZ-NOPE')).status).toBe(404);
    });

    it('lists only my orders, newest first', async () => {
      const v1 = await makeVariant({ stock: 2 });
      const a = await signedInAgent(app);
      const b = await signedInAgent(app);
      await addToCart(a.agent, v1.variant.id);
      const first = (await a.agent.post('/api/checkout').send(body())).body.data.code;
      await addToCart(a.agent, v1.variant.id);
      const second = (await a.agent.post('/api/checkout').send(body())).body.data.code;
      expect((await a.agent.get('/api/orders')).body.data.map((o: { code: string }) => o.code)).toEqual([second, first]);
      expect((await b.agent.get('/api/orders')).body.data).toEqual([]);
    });
  });
});
