// ABOUTME: Admin console contract: seller approval/suspension/commission, default fee, categories, analytics, returns queue, concurrency lab.
// ABOUTME: Everything is admin-only; commission changes must never rewrite sub-orders that already snapshotted their rate.
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

const address = { fullName: 'Ada', street: '1 Way', city: 'London', state: 'LDN', postalCode: 'N1', country: 'UK' };
let n = 0;
async function buy(variantId: string, qty = 1) {
  const buyer = await signedInAgent(app);
  await buyer.agent.post('/api/cart/items').send({ variantId, quantity: qty });
  const res = await buyer.agent.post('/api/checkout').send({ idempotencyKey: `admin-test-key-${++n}-${Date.now()}`, paymentMethod: 'sandbox_card', shippingAddress: address });
  expect(res.status).toBe(201);
  return { buyer, order: res.body.data, sub: res.body.data.subOrders[0] };
}
async function loginAs(user: typeof s.users.$inferSelect) {
  await db.update(s.users).set({ passwordHash: await hashPassword(TEST_PASSWORD) }).where(eq(s.users.id, user.id));
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD });
  return agent;
}

describe('admin console', () => {
  beforeEach(resetDb);

  it('every admin endpoint requires an admin: anonymous 401, buyer and seller 403', async () => {
    const buyer = await signedInAgent(app);
    const seller = await makeSeller();
    const sellerAgent = await loginAs(seller.user);
    const calls: [string, string][] = [
      ['get', '/api/admin/analytics'], ['get', '/api/admin/sellers'], ['patch', `/api/admin/sellers/${seller.seller.id}`], ['get', '/api/admin/settings'],
      ['put', '/api/admin/settings/default-fee'], ['get', '/api/admin/categories'], ['post', '/api/admin/categories'], ['get', '/api/admin/returns'], ['post', '/api/admin/concurrency-lab'],
    ];
    for (const [method, path] of calls) {
      expect((await (request(app) as never as Record<string, (p: string) => request.Test>)[method](path)).status, `anon ${method} ${path}`).toBe(401);
      expect((await (buyer.agent as never as Record<string, (p: string) => request.Test>)[method](path)).status, `buyer ${method} ${path}`).toBe(403);
      expect((await (sellerAgent as never as Record<string, (p: string) => request.Test>)[method](path)).status, `seller ${method} ${path}`).toBe(403);
    }
  });

  describe('sellers', () => {
    it('lists ateliers with status, fee and owner email', async () => {
      const admin = await signedInAgent(app, 'admin');
      const a = await makeSeller(1000, 'pending_approval');
      const res = await admin.agent.get('/api/admin/sellers');
      expect(res.status).toBe(200);
      expect(res.body.data[0]).toMatchObject({ id: a.seller.id, status: 'pending_approval', commissionBps: 1000, email: a.user.email });
    });

    it('approval lets the atelier publish; suspension hides its products from the storefront and blocks publishing', async () => {
      const admin = await signedInAgent(app, 'admin');
      const { user, seller } = await makeSeller(1000, 'pending_approval');
      const sellerAgent = await loginAs(user);
      const { product } = await makeVariant({ stock: 3, sellerId: seller.id });
      await db.update(s.products).set({ isPublished: false }).where(eq(s.products.id, product.id));
      expect((await sellerAgent.patch(`/api/seller/products/${product.id}`).send({ isPublished: true })).status).toBe(403);

      expect((await admin.agent.patch(`/api/admin/sellers/${seller.id}`).send({ status: 'active' })).body.data.status).toBe('active');
      expect((await sellerAgent.patch(`/api/seller/products/${product.id}`).send({ isPublished: true })).status).toBe(200);
      expect((await request(app).get('/api/catalog/products')).body.data.items).toHaveLength(1);

      await admin.agent.patch(`/api/admin/sellers/${seller.id}`).send({ status: 'suspended' });
      expect((await request(app).get('/api/catalog/products')).body.data.items).toHaveLength(0);
      expect((await sellerAgent.patch(`/api/seller/products/${product.id}`).send({ isPublished: true })).status).toBe(403);
    });

    it('commission must be 1%-50%; unknown ids 404; unknown fields and statuses 400', async () => {
      const admin = await signedInAgent(app, 'admin');
      const { seller } = await makeSeller();
      const url = `/api/admin/sellers/${seller.id}`;
      for (const bad of [0, 99, 5001, 12.5, '10']) expect((await admin.agent.patch(url).send({ commissionBps: bad })).status, String(bad)).toBe(400);
      expect((await admin.agent.patch(url).send({ commissionBps: 100 })).status).toBe(200);
      expect((await admin.agent.patch(url).send({ commissionBps: 5000 })).status).toBe(200);
      expect((await admin.agent.patch(url).send({ status: 'banned' })).status).toBe(400);
      expect((await admin.agent.patch(url).send({ name: 'x' })).status).toBe(400);
      expect((await admin.agent.patch('/api/admin/sellers/00000000-0000-4000-8000-000000000000').send({ commissionBps: 900 })).status).toBe(404);
    });

    it('a commission change applies to NEW orders only; existing sub-orders keep their snapshot', async () => {
      const admin = await signedInAgent(app, 'admin');
      const { seller } = await makeSeller(1000);
      const v = await makeVariant({ stock: 5, sellerId: seller.id, basePriceCents: 10000 });
      const first = await buy(v.variant.id);
      await admin.agent.patch(`/api/admin/sellers/${seller.id}`).send({ commissionBps: 2500 });
      const second = await buy(v.variant.id);
      const rows = await db.select().from(s.subOrders);
      const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
      expect(byId[first.sub.id]).toMatchObject({ commissionBps: 1000, commissionCents: 1000, netCents: 9000 });
      expect(byId[second.sub.id]).toMatchObject({ commissionBps: 2500, commissionCents: 2500, netCents: 7500 });
    });
  });

  describe('platform fee', () => {
    it('reads and updates the default fee (range-checked); new applicants get the new default', async () => {
      const admin = await signedInAgent(app, 'admin');
      expect((await admin.agent.get('/api/admin/settings')).body.data.defaultCommissionBps).toBe(850);
      expect((await admin.agent.put('/api/admin/settings/default-fee').send({ commissionBps: 50 })).status).toBe(400);
      expect((await admin.agent.put('/api/admin/settings/default-fee').send({ commissionBps: 1200 })).body.data.defaultCommissionBps).toBe(1200);
      await request(app).post('/api/auth/apply-seller').send({ email: 'fee@example.com', password: 'a-long-enough-password', displayName: 'F', atelierName: 'Fee Studio' });
      expect((await db.select().from(s.sellers))[0].commissionBps).toBe(1200);
    });
  });

  describe('categories', () => {
    it('creates, renames, rejects duplicates, and refuses to delete a category that has products', async () => {
      const admin = await signedInAgent(app, 'admin');
      const created = await admin.agent.post('/api/admin/categories').send({ name: 'Ceramics', description: 'Fired clay' });
      expect(created.status).toBe(201);
      expect(created.body.data).toMatchObject({ name: 'Ceramics', slug: 'ceramics', productCount: 0 });
      expect((await admin.agent.post('/api/admin/categories').send({ name: 'Ceramics' })).status).toBe(409);
      expect((await admin.agent.patch(`/api/admin/categories/${created.body.data.id}`).send({ name: 'Pottery' })).body.data.name).toBe('Pottery');
      const { product } = await makeVariant({ stock: 1 });
      const inUse = await admin.agent.delete(`/api/admin/categories/${product.categoryId}`);
      expect(inUse.status).toBe(409);
      expect(inUse.body.error.code).toBe('CATEGORY_IN_USE');
      expect((await admin.agent.delete(`/api/admin/categories/${created.body.data.id}`)).status).toBe(204);
      expect((await admin.agent.delete(`/api/admin/categories/${created.body.data.id}`)).status).toBe(404);
      expect((await admin.agent.post('/api/admin/categories').send({ name: '' })).status).toBe(400);
    });
  });

  describe('analytics', () => {
    it('computes gross, commission and counts from the ledger/orders; cancelled parcels net to zero', async () => {
      const admin = await signedInAgent(app, 'admin');
      const a = await makeSeller(1000);
      const b = await makeSeller(2000);
      const va = await makeVariant({ stock: 5, sellerId: a.seller.id, basePriceCents: 10000 });
      const vb = await makeVariant({ stock: 5, sellerId: b.seller.id, basePriceCents: 20000 });
      await buy(va.variant.id);
      const kept = await buy(vb.variant.id);
      const cancelled = await buy(vb.variant.id);
      await cancelled.buyer.agent.post(`/api/sub-orders/${cancelled.sub.code}/transitions`).send({ to: 'CANCELLED' });
      const res = await admin.agent.get('/api/admin/analytics');
      expect(res.status).toBe(200);
      const d = res.body.data;
      expect(d).toMatchObject({ grossCents: 30000, commissionCents: 1000 + 4000, netToSellersCents: 9000 + 16000, orderCount: 3, sellersByStatus: { active: 2 } });
      expect(d.subOrdersByStatus).toMatchObject({ PAID: 2, CANCELLED: 1 });
      expect(d.topSellers[0]).toMatchObject({ sellerId: b.seller.id, grossCents: 20000 });
      expect(d.topSellers).toHaveLength(2);
      expect(d.daily.length).toBeGreaterThan(0);
      expect(kept.sub.id).toBeTruthy();
    });
  });

  describe('returns queue', () => {
    it('lists RETURN_REQUESTED parcels and drops them once decided', async () => {
      const admin = await signedInAgent(app, 'admin');
      const v = await makeVariant({ stock: 3, basePriceCents: 12000 });
      const { buyer, sub } = await buy(v.variant.id);
      await db.update(s.subOrders).set({ status: 'DELIVERED' }).where(eq(s.subOrders.id, sub.id));
      await buyer.agent.post(`/api/sub-orders/${sub.code}/transitions`).send({ to: 'RETURN_REQUESTED', reason: 'Wrong size' });
      const q = await admin.agent.get('/api/admin/returns');
      expect(q.body.data).toHaveLength(1);
      expect(q.body.data[0]).toMatchObject({ code: sub.code, returnReason: 'Wrong size', subtotalCents: 12000, netCents: 10800 });
      expect(q.body.data[0].items[0].quantity).toBe(1);
      await admin.agent.post(`/api/sub-orders/${sub.code}/return-decision`).send({ decision: 'approve' });
      expect((await admin.agent.get('/api/admin/returns')).body.data).toHaveLength(0);
    });
  });

  describe('concurrency lab', () => {
    it('20 parallel reservations on 1 available unit: exactly 1 wins, 19 conflict, nothing oversold, holds released afterwards', async () => {
      const admin = await signedInAgent(app, 'admin');
      const { variant } = await makeVariant({ stock: 1 });
      const res = await admin.agent.post('/api/admin/concurrency-lab').send({ variantId: variant.id, attempts: 20 });
      expect(res.status).toBe(200);
      const d = res.body.data;
      expect(d).toMatchObject({ attempts: 20, succeeded: 1, conflicts: 19, availableBefore: 1, oversold: false, released: 1 });
      expect(d.timingsMs).toHaveLength(20);
      expect(d.timingsMs.every((t: number) => t >= 0)).toBe(true);
      expect(d.totalMs).toBeGreaterThanOrEqual(0);
      const [row] = await db.select().from(s.variants).where(eq(s.variants.id, variant.id));
      expect(row).toMatchObject({ stock: 1, reserved: 0 });
    });

    it('lists only sellable variants with live availability', async () => {
      const admin = await signedInAgent(app, 'admin');
      const live = await makeVariant({ stock: 4 });
      const hidden = await makeVariant({ stock: 4 });
      await db.update(s.products).set({ isPublished: false }).where(eq(s.products.id, hidden.product.id));
      const res = await admin.agent.get('/api/admin/concurrency-lab/variants');
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({ id: live.variant.id, stock: 4, reserved: 0 });
    });

    it('never touches units held by real buyers, validates bounds, and 404s for unknown variants', async () => {
      const admin = await signedInAgent(app, 'admin');
      const { variant } = await makeVariant({ stock: 3 });
      const buyer = await signedInAgent(app);
      await buyer.agent.post('/api/cart/items').send({ variantId: variant.id, quantity: 2 });
      const res = await admin.agent.post('/api/admin/concurrency-lab').send({ variantId: variant.id, attempts: 10 });
      expect(res.body.data).toMatchObject({ availableBefore: 1, succeeded: 1, conflicts: 9, oversold: false });
      const [row] = await db.select().from(s.variants).where(eq(s.variants.id, variant.id));
      expect(row).toMatchObject({ stock: 3, reserved: 2 });
      expect((await admin.agent.post('/api/admin/concurrency-lab').send({ variantId: variant.id, attempts: 1 })).status).toBe(400);
      expect((await admin.agent.post('/api/admin/concurrency-lab').send({ variantId: variant.id, attempts: 101 })).status).toBe(400);
      expect((await admin.agent.post('/api/admin/concurrency-lab').send({ variantId: '00000000-0000-4000-8000-000000000000', attempts: 5 })).status).toBe(404);
    });
  });
});
