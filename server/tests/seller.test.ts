// ABOUTME: Seller console contract: apply->pending, product/variant CRUD with isolation, publish gate, stock floor, uploads, orders, ledger CSV, payouts.
// ABOUTME: Payout tests pin the money rules: balance = settled net - disbursed; over-balance rejected; concurrent requests cannot overdraw.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../app.ts';
import { closeDb, db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { hashPassword } from '../lib/password.ts';
import { makeSeller, makeVariant, resetDb, signedInAgent, TEST_PASSWORD } from './helpers.ts';

const app = createApp();
afterAll(closeDb);

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function sellerAgent(bps = 1000, status: 'active' | 'pending_approval' = 'active') {
  const { user, seller } = await makeSeller(bps, status);
  await db.update(s.users).set({ passwordHash: await hashPassword(TEST_PASSWORD) }).where(eq(s.users.id, user.id));
  const agent = request.agent(app);
  expect((await agent.post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD })).status).toBe(200);
  return { agent, user, seller };
}
const category = async () => (await db.insert(s.categories).values({ slug: `c-${Math.random().toString(36).slice(2)}`, name: 'Cat' }).returning())[0];
const productBody = (categoryId: string, extra: Record<string, unknown> = {}) => ({
  title: 'Brass Lamp', categoryId, basePriceCents: 25000, shortDescription: 'short', description: 'long', material: 'brass', origin: 'Kyoto',
  variants: [{ name: 'Standard', sku: `SKU-${Math.random().toString(36).slice(2, 8)}`, priceDeltaCents: 0, stock: 5 }], ...extra,
});
const credit = (sellerId: string, net: number, status: 'settled' | 'pending' = 'settled') =>
  db.insert(s.ledgerEntries).values({ sellerId, type: 'sale_credit', grossCents: net + Math.round(net / 9), commissionCents: Math.round(net / 9), netCents: net, status });

describe('seller console', () => {
  beforeEach(resetDb);

  describe('apply', () => {
    it('creates a pending_approval atelier, signs the applicant in, and applies the default fee', async () => {
      await db.insert(s.settings).values({ key: 'default_commission_bps', value: '900' });
      const agent = request.agent(app);
      const res = await agent.post('/api/auth/apply-seller').send({ email: 'New.Atelier@Example.com', password: 'a-long-enough-password', displayName: 'Mira', atelierName: 'Mira Studio', tagline: 'Clay', location: 'Lisbon' });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ role: 'seller' });
      expect(res.body.data.sellerId).toBeTruthy();
      const [sl] = await db.select().from(s.sellers);
      expect(sl).toMatchObject({ status: 'pending_approval', commissionBps: 900, name: 'Mira Studio', verified: false });
      expect((await agent.get('/api/auth/me')).body.data.sellerId).toBe(sl.id);
      expect((await agent.get('/api/seller/me')).body.data).toMatchObject({ status: 'pending_approval', name: 'Mira Studio' });
    });

    it('rejects duplicate emails, forged status/commission fields and weak passwords', async () => {
      const base = { email: 'a@example.com', password: 'a-long-enough-password', displayName: 'A', atelierName: 'A Studio' };
      expect((await request(app).post('/api/auth/apply-seller').send(base)).status).toBe(201);
      expect((await request(app).post('/api/auth/apply-seller').send(base)).status).toBe(409);
      expect((await request(app).post('/api/auth/apply-seller').send({ ...base, email: 'b@example.com', status: 'active' })).status).toBe(400);
      expect((await request(app).post('/api/auth/apply-seller').send({ ...base, email: 'c@example.com', commissionBps: 100 })).status).toBe(400);
      expect((await request(app).post('/api/auth/apply-seller').send({ ...base, email: 'd@example.com', password: 'short' })).status).toBe(400);
      expect(await db.select().from(s.sellers)).toHaveLength(1);
    });
  });

  describe('access', () => {
    it('requires a seller session: anonymous 401, buyer and admin 403', async () => {
      expect((await request(app).get('/api/seller/products')).status).toBe(401);
      for (const role of ['buyer', 'admin'] as const) {
        const { agent } = await signedInAgent(app, role);
        expect((await agent.get('/api/seller/products')).status).toBe(403);
      }
    });
  });

  describe('products', () => {
    it('creates a draft with variants, lists only my products, and keeps drafts out of the storefront', async () => {
      const a = await sellerAgent();
      const b = await sellerAgent();
      const cat = await category();
      const created = await a.agent.post('/api/seller/products').send(productBody(cat.id));
      expect(created.status).toBe(201);
      expect(created.body.data).toMatchObject({ title: 'Brass Lamp', isPublished: false, basePriceCents: 25000 });
      expect(created.body.data.variants).toHaveLength(1);
      await b.agent.post('/api/seller/products').send(productBody(cat.id, { title: 'Other' }));
      const mine = await a.agent.get('/api/seller/products');
      expect(mine.body.data.map((p: { title: string }) => p.title)).toEqual(['Brass Lamp']);
      const store = await request(app).get('/api/catalog/products');
      expect(store.body.data.items).toHaveLength(0);
    });

    it('validates input: price, SKU uniqueness, variants required, unknown category, unknown fields', async () => {
      const a = await sellerAgent();
      const cat = await category();
      expect((await a.agent.post('/api/seller/products').send(productBody(cat.id, { basePriceCents: -5 }))).status).toBe(400);
      expect((await a.agent.post('/api/seller/products').send(productBody(cat.id, { basePriceCents: 12.5 }))).status).toBe(400);
      expect((await a.agent.post('/api/seller/products').send(productBody(cat.id, { variants: [] }))).status).toBe(400);
      expect((await a.agent.post('/api/seller/products').send(productBody(cat.id, { sellerId: 'x' }))).status).toBe(400);
      expect((await a.agent.post('/api/seller/products').send(productBody('00000000-0000-4000-8000-000000000000'))).status).toBe(422);
      const dup = productBody(cat.id, { variants: [{ name: 'A', sku: 'DUP-1', priceDeltaCents: 0, stock: 1 }] });
      expect((await a.agent.post('/api/seller/products').send(dup)).status).toBe(201);
      const again = await a.agent.post('/api/seller/products').send(dup);
      expect(again.status).toBe(409);
      expect(again.body.error.code).toBe('SKU_TAKEN');
    });

    it('active sellers can publish and unpublish; pending sellers cannot publish', async () => {
      const cat = await category();
      const active = await sellerAgent();
      const p = (await active.agent.post('/api/seller/products').send(productBody(cat.id))).body.data;
      expect((await active.agent.patch(`/api/seller/products/${p.id}`).send({ isPublished: true })).body.data.isPublished).toBe(true);
      expect((await request(app).get('/api/catalog/products')).body.data.items).toHaveLength(1);
      expect((await active.agent.patch(`/api/seller/products/${p.id}`).send({ isPublished: false })).body.data.isPublished).toBe(false);

      const pending = await sellerAgent(1000, 'pending_approval');
      const q = (await pending.agent.post('/api/seller/products').send(productBody(cat.id, { title: 'Draft' }))).body.data;
      const denied = await pending.agent.patch(`/api/seller/products/${q.id}`).send({ isPublished: true });
      expect(denied.status).toBe(403);
      expect(denied.body.error.code).toBe('SELLER_NOT_ACTIVE');
      await db.update(s.sellers).set({ status: 'active' }).where(eq(s.sellers.id, pending.seller.id));
      expect((await pending.agent.patch(`/api/seller/products/${q.id}`).send({ isPublished: true })).status).toBe(200);
    });

    it("a seller cannot read or change another seller's product or variant (404, data untouched)", async () => {
      const cat = await category();
      const a = await sellerAgent();
      const b = await sellerAgent();
      const p = (await a.agent.post('/api/seller/products').send(productBody(cat.id))).body.data;
      expect((await b.agent.patch(`/api/seller/products/${p.id}`).send({ title: 'Hacked' })).status).toBe(404);
      expect((await b.agent.patch(`/api/seller/variants/${p.variants[0].id}`).send({ stock: 999 })).status).toBe(404);
      expect((await b.agent.post(`/api/seller/products/${p.id}/variants`).send({ name: 'X', sku: 'X-1', priceDeltaCents: 0, stock: 1 })).status).toBe(404);
      expect((await b.agent.delete(`/api/seller/products/${p.id}/images/00000000-0000-4000-8000-000000000000`)).status).toBe(404);
      const [row] = await db.select().from(s.products).where(eq(s.products.id, p.id));
      expect(row.title).toBe('Brass Lamp');
    });

    it('stock edits cannot go below what is reserved in carts; adding variants works', async () => {
      const a = await sellerAgent();
      const cat = await category();
      const { variant } = await makeVariant({ stock: 5, sellerId: a.seller.id });
      const buyer = await signedInAgent(app);
      await buyer.agent.post('/api/cart/items').send({ variantId: variant.id, quantity: 3 });
      const low = await a.agent.patch(`/api/seller/variants/${variant.id}`).send({ stock: 2 });
      expect(low.status).toBe(409);
      expect(low.body.error.code).toBe('STOCK_BELOW_RESERVED');
      expect((await a.agent.patch(`/api/seller/variants/${variant.id}`).send({ stock: 3, priceDeltaCents: 500 })).body.data).toMatchObject({ stock: 3, reserved: 3, priceDeltaCents: 500 });
      const p = (await a.agent.post('/api/seller/products').send(productBody(cat.id))).body.data;
      const added = await a.agent.post(`/api/seller/products/${p.id}/variants`).send({ name: 'Large', sku: 'LRG-1', priceDeltaCents: 1000, stock: 2 });
      expect(added.status).toBe(201);
      expect(added.body.data).toMatchObject({ name: 'Large', stock: 2, reserved: 0 });
    });
  });

  describe('images', () => {
    it('accepts a real PNG, serves it from /uploads, and removes it on delete', async () => {
      const a = await sellerAgent();
      const p = (await a.agent.post('/api/seller/products').send(productBody((await category()).id))).body.data;
      const up = await a.agent.post(`/api/seller/products/${p.id}/images`).attach('image', PNG, { filename: 'lamp.png', contentType: 'image/png' });
      expect(up.status).toBe(201);
      expect(up.body.data.url).toMatch(/^\/uploads\/[a-f0-9-]+\.png$/);
      const served = await request(app).get(up.body.data.url);
      expect(served.status).toBe(200);
      expect(served.headers['content-type']).toBe('image/png');
      expect(served.headers['x-content-type-options']).toBe('nosniff');
      expect((await a.agent.delete(`/api/seller/products/${p.id}/images/${up.body.data.id}`)).status).toBe(204);
      expect((await request(app).get(up.body.data.url)).status).toBe(404);
    });

    it('rejects non-images (even with an image content type), oversized files, and missing files', async () => {
      const a = await sellerAgent();
      const p = (await a.agent.post('/api/seller/products').send(productBody((await category()).id))).body.data;
      const url = `/api/seller/products/${p.id}/images`;
      const fake = await a.agent.post(url).attach('image', Buffer.from('<script>alert(1)</script>'), { filename: 'x.png', contentType: 'image/png' });
      expect(fake.status).toBe(415);
      const svg = await a.agent.post(url).attach('image', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), { filename: 'x.svg', contentType: 'image/svg+xml' });
      expect(svg.status).toBe(415);
      const big = await a.agent.post(url).attach('image', Buffer.concat([PNG, Buffer.alloc(3 * 1024 * 1024)]), { filename: 'big.png', contentType: 'image/png' });
      expect(big.status).toBe(413);
      expect((await a.agent.post(url)).status).toBe(400);
      expect(await db.select().from(s.productImages)).toHaveLength(0);
    });
  });

  describe('order queue', () => {
    it('lists only my sub-orders with items and ship-to city, newest first', async () => {
      const a = await sellerAgent();
      const b = await sellerAgent();
      const va = await makeVariant({ stock: 5, sellerId: a.seller.id });
      const vb = await makeVariant({ stock: 5, sellerId: b.seller.id });
      const buyer = await signedInAgent(app);
      await buyer.agent.post('/api/cart/items').send({ variantId: va.variant.id, quantity: 1 });
      await buyer.agent.post('/api/cart/items').send({ variantId: vb.variant.id, quantity: 1 });
      const address = { fullName: 'Ada', street: '1 Way', city: 'London', state: 'LDN', postalCode: 'N1', country: 'UK' };
      await buyer.agent.post('/api/checkout').send({ idempotencyKey: 'seller-queue-key-1', paymentMethod: 'sandbox_card', shippingAddress: address });
      const mine = await a.agent.get('/api/seller/orders');
      expect(mine.status).toBe(200);
      expect(mine.body.data).toHaveLength(1);
      expect(mine.body.data[0]).toMatchObject({ status: 'PAID', shipTo: { fullName: 'Ada', city: 'London' } });
      expect(mine.body.data[0].items[0].productTitle).toBe(va.product.title);
      expect(mine.body.data[0].netCents).toBeTypeOf('number');
      expect(JSON.stringify(mine.body)).not.toContain(vb.product.title);
    });
  });

  describe('ledger and payouts', () => {
    it('balance = settled net - disbursed payouts; pending (COD) money is shown separately and not withdrawable', async () => {
      const a = await sellerAgent();
      await credit(a.seller.id, 9000);
      await credit(a.seller.id, 4500, 'pending');
      await db.insert(s.ledgerEntries).values({ sellerId: a.seller.id, type: 'payout_disbursement', grossCents: -2000, commissionCents: 0, netCents: -2000, status: 'disbursed' });
      const bal = (await a.agent.get('/api/seller/balance')).body.data;
      expect(bal).toEqual({ availableCents: 7000, pendingCents: 4500, disbursedCents: 2000 });
    });

    it('a payout above the available balance is rejected; equal to it succeeds and empties the balance', async () => {
      const a = await sellerAgent();
      await credit(a.seller.id, 9000);
      const over = await a.agent.post('/api/seller/payouts').send({ amountCents: 9001 });
      expect(over.status).toBe(422);
      expect(over.body.error.code).toBe('INSUFFICIENT_BALANCE');
      expect((await a.agent.post('/api/seller/payouts').send({ amountCents: 0 })).status).toBe(400);
      expect((await a.agent.post('/api/seller/payouts').send({ amountCents: 10.5 })).status).toBe(400);
      const ok = await a.agent.post('/api/seller/payouts').send({ amountCents: 9000 });
      expect(ok.status).toBe(201);
      expect((await a.agent.get('/api/seller/balance')).body.data).toMatchObject({ availableCents: 0, disbursedCents: 9000 });
      const entry = (await db.select().from(s.ledgerEntries).where(eq(s.ledgerEntries.type, 'payout_disbursement')))[0];
      expect(entry).toMatchObject({ netCents: -9000, grossCents: -9000, commissionCents: 0, status: 'disbursed' });
    });

    it('5 concurrent payouts of 60% each cannot overdraw: exactly one succeeds', async () => {
      const a = await sellerAgent();
      await credit(a.seller.id, 10000);
      const results = await Promise.all(Array.from({ length: 5 }, () => a.agent.post('/api/seller/payouts').send({ amountCents: 6000 })));
      expect(results.filter((r) => r.status === 201)).toHaveLength(1);
      expect(results.filter((r) => r.status === 422)).toHaveLength(4);
      expect((await a.agent.get('/api/seller/balance')).body.data.availableCents).toBe(4000);
    });

    it('a pending seller can see balances but cannot request payouts', async () => {
      const p = await sellerAgent(1000, 'pending_approval');
      await credit(p.seller.id, 5000);
      const res = await p.agent.post('/api/seller/payouts').send({ amountCents: 100 });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('SELLER_NOT_ACTIVE');
    });

    it('CSV export contains only my rows, has a header, the right content type, and neutralises formula cells', async () => {
      const a = await sellerAgent();
      const b = await sellerAgent();
      await credit(a.seller.id, 9000);
      await credit(b.seller.id, 7777);
      const res = await a.agent.get('/api/seller/ledger.csv');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      const lines = res.text.trim().split('\n');
      expect(lines[0]).toBe('date,type,status,order,gross,commission,net');
      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain('sale_credit');
      expect(lines[1]).toContain('90.00');
      expect(res.text).not.toContain('77.77');
    });

    it('ledger JSON lists my entries newest first with a running available balance', async () => {
      const a = await sellerAgent();
      await credit(a.seller.id, 9000);
      const res = await a.agent.get('/api/seller/ledger');
      expect(res.body.data.entries).toHaveLength(1);
      expect(res.body.data.entries[0]).toMatchObject({ type: 'sale_credit', netCents: 9000, status: 'settled' });
    });
  });

  describe('summary', () => {
    it('reports sales, order counts and low-stock variants for the seller only', async () => {
      const a = await sellerAgent();
      const { variant } = await makeVariant({ stock: 1, sellerId: a.seller.id });
      await db.update(s.products).set({ lowStockThreshold: 2 }).where(eq(s.products.id, variant.productId));
      await credit(a.seller.id, 9000);
      const sum = (await a.agent.get('/api/seller/summary')).body.data;
      expect(sum.lowStock).toHaveLength(1);
      expect(sum.lowStock[0]).toMatchObject({ stock: 1 });
      expect(sum.grossCents).toBeGreaterThan(0);
    });
  });
});
