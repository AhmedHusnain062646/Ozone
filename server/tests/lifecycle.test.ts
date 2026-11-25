// ABOUTME: Order lifecycle over HTTP: every illegal transition is 409, ownership and role rules, cancel/return/refund effects.
// ABOUTME: Refund must reverse the sale exactly in the ledger; cancel restores stock exactly once, even under concurrency.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../app.ts';
import { closeDb, db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { ALLOWED_TRANSITIONS, ORDER_STATUSES } from '../domain/order-state.ts';
import { hashPassword } from '../lib/password.ts';
import { makeSeller, makeVariant, resetDb, signedInAgent, TEST_PASSWORD } from './helpers.ts';

const app = createApp();
afterAll(closeDb);

const address = { fullName: 'Ada', street: '1 Way', city: 'London', state: 'LDN', postalCode: 'N1', country: 'UK' };

async function agentFor(user: typeof s.users.$inferSelect) {
  await db.update(s.users).set({ passwordHash: await hashPassword(TEST_PASSWORD) }).where(eq(s.users.id, user.id));
  const agent = request.agent(app);
  expect((await agent.post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD })).status).toBe(200);
  return agent;
}

/** A buyer purchases `qty` x one variant from a fresh seller through the real checkout. */
async function place(opts: { method?: 'sandbox_card' | 'cod'; qty?: number; bps?: number; price?: number } = {}) {
  const { user: sellerUser, seller } = await makeSeller(opts.bps ?? 1000);
  const { variant, product } = await makeVariant({ stock: 10, sellerId: seller.id, basePriceCents: opts.price ?? 20000 });
  const buyer = await signedInAgent(app);
  await buyer.agent.post('/api/cart/items').send({ variantId: variant.id, quantity: opts.qty ?? 1 });
  const res = await buyer.agent.post('/api/checkout').send({ idempotencyKey: `k-${Math.random().toString(36).slice(2)}-${Date.now()}`, paymentMethod: opts.method ?? 'sandbox_card', shippingAddress: address });
  expect(res.status).toBe(201);
  const sub = res.body.data.subOrders[0];
  return { buyer, seller, sellerUser, sellerAgent: await agentFor(sellerUser), variant, product, orderCode: res.body.data.code, code: sub.code as string, subId: sub.id as string };
}

const setStatus = (subId: string, status: (typeof s.subOrders.$inferInsert)['status']) => db.update(s.subOrders).set({ status }).where(eq(s.subOrders.id, subId));
const stockOf = async (id: string) => (await db.select().from(s.variants).where(eq(s.variants.id, id)))[0];
const ledgerFor = (subId: string) => db.select().from(s.ledgerEntries).where(eq(s.ledgerEntries.subOrderId, subId));
const sum = (rows: { grossCents: number; commissionCents: number; netCents: number }[]) => ({
  gross: rows.reduce((n, r) => n + r.grossCents, 0), commission: rows.reduce((n, r) => n + r.commissionCents, 0), net: rows.reduce((n, r) => n + r.netCents, 0),
});
const go = (agent: request.Agent, code: string, body: Record<string, unknown>) => agent.post(`/api/sub-orders/${code}/transitions`).send(body);

describe('lifecycle', () => {
  beforeEach(resetDb);

  it('EVERY illegal (from, to) pair returns 409 ILLEGAL_TRANSITION and changes nothing', async () => {
    const o = await place();
    let checked = 0;
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUSES) {
        if (ALLOWED_TRANSITIONS[from].includes(to)) continue;
        await setStatus(o.subId, from);
        const res = await go(o.sellerAgent, o.code, { to, trackingNumber: 'T-1', reason: 'because' });
        expect(res.status, `${from} -> ${to}`).toBe(409);
        expect(res.body.error.code, `${from} -> ${to}`).toBe('ILLEGAL_TRANSITION');
        expect((await db.select().from(s.subOrders).where(eq(s.subOrders.id, o.subId)))[0].status).toBe(from);
        checked++;
      }
    }
    expect(checked).toBe(81 - Object.values(ALLOWED_TRANSITIONS).flat().length);
    expect(await db.select().from(s.statusEvents).where(eq(s.statusEvents.status, 'PACKED'))).toHaveLength(0);
  });

  describe('seller actions', () => {
    it('packs, ships (tracking required) and delivers; every event records the seller from the session', async () => {
      const o = await place();
      const packed = await go(o.sellerAgent, o.code, { to: 'PACKED' });
      expect(packed.status).toBe(200);
      const noTracking = await go(o.sellerAgent, o.code, { to: 'SHIPPED' });
      expect(noTracking.status).toBe(400);
      expect(noTracking.body.error.code).toBe('TRACKING_REQUIRED');
      expect((await go(o.sellerAgent, o.code, { to: 'SHIPPED', trackingNumber: '  1Z999  ' })).body.data.trackingNumber).toBe('1Z999');
      expect((await go(o.sellerAgent, o.code, { to: 'DELIVERED' })).body.data.status).toBe('DELIVERED');
      const events = await db.select().from(s.statusEvents).where(eq(s.statusEvents.subOrderId, o.subId));
      const seller = events.filter((e) => ['PACKED', 'SHIPPED', 'DELIVERED'].includes(e.status));
      expect(seller).toHaveLength(3);
      for (const e of seller) expect(e).toMatchObject({ actorUserId: o.sellerUser.id, actorRole: 'seller' });
    });

    it("a seller cannot touch another seller's sub-order (403) and the state is unchanged", async () => {
      const a = await place();
      const b = await place();
      const res = await go(b.sellerAgent, a.code, { to: 'PACKED' });
      expect(res.status).toBe(403);
      expect((await db.select().from(s.subOrders).where(eq(s.subOrders.id, a.subId)))[0].status).toBe('PAID');
    });

    it('role rules: buyers cannot pack, sellers cannot cancel or request returns, admins cannot force-ship', async () => {
      const o = await place();
      expect((await go(o.buyer.agent, o.code, { to: 'PACKED' })).status).toBe(403);
      expect((await go(o.sellerAgent, o.code, { to: 'CANCELLED' })).status).toBe(403);
      const admin = await signedInAgent(app, 'admin');
      expect((await go(admin.agent, o.code, { to: 'PACKED' })).status).toBe(403);
      await setStatus(o.subId, 'DELIVERED');
      expect((await go(o.sellerAgent, o.code, { to: 'RETURN_REQUESTED', reason: 'x' })).status).toBe(403);
    });

    it('requires sign-in and validates the body', async () => {
      const o = await place();
      expect((await request(app).post(`/api/sub-orders/${o.code}/transitions`).send({ to: 'PACKED' })).status).toBe(401);
      expect((await go(o.sellerAgent, o.code, { to: 'TELEPORTED' })).status).toBe(400);
      expect((await go(o.sellerAgent, o.code, { to: 'PACKED', status: 'x' })).status).toBe(400);
      expect((await go(o.sellerAgent, 'OZ-NOPE-A', { to: 'PACKED' })).status).toBe(404);
    });
  });

  describe('cancel (buyer)', () => {
    it('cancelling a PAID sub-order restores stock and reverses the ledger entry exactly', async () => {
      const o = await place({ qty: 2, price: 33300, bps: 850 });
      expect((await stockOf(o.variant.id)).stock).toBe(8);
      const res = await go(o.buyer.agent, o.code, { to: 'CANCELLED', reason: 'changed my mind' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');
      expect((await stockOf(o.variant.id))).toMatchObject({ stock: 10, reserved: 0 });
      const ledger = await ledgerFor(o.subId);
      expect(ledger.map((l) => l.type).sort()).toEqual(['refund_debit', 'sale_credit']);
      expect(sum(ledger)).toEqual({ gross: 0, commission: 0, net: 0 });
      const parent = (await db.select().from(s.orders).where(eq(s.orders.code, o.orderCode)))[0];
      expect(parent.paymentStatus).toBe('REFUNDED');
    });

    it("cannot cancel someone else's order (403) or after packing (409)", async () => {
      const o = await place();
      const other = await signedInAgent(app);
      expect((await go(other.agent, o.code, { to: 'CANCELLED' })).status).toBe(403);
      await go(o.sellerAgent, o.code, { to: 'PACKED' });
      expect((await go(o.buyer.agent, o.code, { to: 'CANCELLED' })).status).toBe(409);
      expect((await stockOf(o.variant.id)).stock).toBe(9);
    });

    it('5 concurrent cancels: exactly one succeeds, stock is restored once, one reversal entry', async () => {
      const o = await place({ qty: 3 });
      const results = await Promise.all(Array.from({ length: 5 }, () => go(o.buyer.agent, o.code, { to: 'CANCELLED' })));
      expect(results.filter((r) => r.status === 200)).toHaveLength(1);
      expect(results.filter((r) => r.status === 409)).toHaveLength(4);
      expect((await stockOf(o.variant.id)).stock).toBe(10);
      expect((await ledgerFor(o.subId)).filter((l) => l.type === 'refund_debit')).toHaveLength(1);
    });
  });

  describe('cash on delivery', () => {
    it('seller confirms payment PLACED -> PAID; ledger stays pending until DELIVERED, then settles', async () => {
      const o = await place({ method: 'cod' });
      expect((await ledgerFor(o.subId))[0].status).toBe('pending');
      expect((await go(o.sellerAgent, o.code, { to: 'PAID' })).status).toBe(200);
      expect((await ledgerFor(o.subId))[0].status).toBe('pending');
      await go(o.sellerAgent, o.code, { to: 'PACKED' });
      await go(o.sellerAgent, o.code, { to: 'SHIPPED', trackingNumber: 'COD-1' });
      await go(o.sellerAgent, o.code, { to: 'DELIVERED' });
      expect((await ledgerFor(o.subId))[0].status).toBe('settled');
      expect((await db.select().from(s.orders).where(eq(s.orders.code, o.orderCode)))[0].paymentStatus).toBe('PAID');
    });

    it('cancelling a COD order that never settled nets to zero and never counts as settled money', async () => {
      const o = await place({ method: 'cod' });
      expect((await go(o.buyer.agent, o.code, { to: 'CANCELLED' })).status).toBe(200);
      const ledger = await ledgerFor(o.subId);
      expect(sum(ledger)).toEqual({ gross: 0, commission: 0, net: 0 });
      expect(ledger.every((l) => l.status === 'pending')).toBe(true);
      expect((await stockOf(o.variant.id)).stock).toBe(10);
    });
  });

  describe('returns and refunds', () => {
    async function delivered(opts: Parameters<typeof place>[0] = {}) {
      const o = await place(opts);
      await setStatus(o.subId, 'DELIVERED');
      return o;
    }

    it('return request needs a reason, only the buyer, only from DELIVERED', async () => {
      const o = await delivered();
      expect((await go(o.buyer.agent, o.code, { to: 'RETURN_REQUESTED' })).status).toBe(400);
      const other = await signedInAgent(app);
      expect((await go(other.agent, o.code, { to: 'RETURN_REQUESTED', reason: 'x' })).status).toBe(403);
      const ok = await go(o.buyer.agent, o.code, { to: 'RETURN_REQUESTED', reason: 'Wrong size' });
      expect(ok.status).toBe(200);
      expect(ok.body.data).toMatchObject({ status: 'RETURN_REQUESTED', returnReason: 'Wrong size' });
    });

    it('admin approval runs RETURN_REQUESTED -> RETURNED -> REFUNDED, restocks, and reverses the sale exactly', async () => {
      const o = await delivered({ qty: 2, price: 33300, bps: 850 });
      await go(o.buyer.agent, o.code, { to: 'RETURN_REQUESTED', reason: 'Wrong size' });
      const before = await stockOf(o.variant.id);
      const admin = await signedInAgent(app, 'admin');
      const res = await admin.agent.post(`/api/sub-orders/${o.code}/return-decision`).send({ decision: 'approve' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('REFUNDED');
      expect((await stockOf(o.variant.id)).stock).toBe(before.stock + 2);

      const events = (await db.select().from(s.statusEvents).where(eq(s.statusEvents.subOrderId, o.subId))).map((e) => e.status);
      expect(events).toEqual(expect.arrayContaining(['RETURN_REQUESTED', 'RETURNED', 'REFUNDED']));
      const adminEvents = await db.select().from(s.statusEvents).where(eq(s.statusEvents.actorUserId, admin.user.id));
      expect(adminEvents.map((e) => e.status).sort()).toEqual(['REFUNDED', 'RETURNED']);

      const ledger = await ledgerFor(o.subId);
      const debit = ledger.find((l) => l.type === 'refund_debit')!;
      const credit = ledger.find((l) => l.type === 'sale_credit')!;
      expect(debit).toMatchObject({ grossCents: -credit.grossCents, commissionCents: -credit.commissionCents, netCents: -credit.netCents, status: 'settled' });
      expect(sum(ledger)).toEqual({ gross: 0, commission: 0, net: 0 });
      expect((await db.select().from(s.orders).where(eq(s.orders.code, o.orderCode)))[0].paymentStatus).toBe('REFUNDED');
    });

    it('admin rejection returns the sub-order to DELIVERED with no ledger or stock change', async () => {
      const o = await delivered();
      await go(o.buyer.agent, o.code, { to: 'RETURN_REQUESTED', reason: 'meh' });
      const stock = (await stockOf(o.variant.id)).stock;
      const admin = await signedInAgent(app, 'admin');
      const res = await admin.agent.post(`/api/sub-orders/${o.code}/return-decision`).send({ decision: 'reject', note: 'Used item' });
      expect(res.body.data.status).toBe('DELIVERED');
      expect((await stockOf(o.variant.id)).stock).toBe(stock);
      expect(await ledgerFor(o.subId)).toHaveLength(1);
    });

    it('return decisions are admin-only and only valid from RETURN_REQUESTED (409 otherwise)', async () => {
      const o = await delivered();
      const admin = await signedInAgent(app, 'admin');
      expect((await admin.agent.post(`/api/sub-orders/${o.code}/return-decision`).send({ decision: 'approve' })).status).toBe(409);
      await go(o.buyer.agent, o.code, { to: 'RETURN_REQUESTED', reason: 'x' });
      expect((await o.buyer.agent.post(`/api/sub-orders/${o.code}/return-decision`).send({ decision: 'approve' })).status).toBe(403);
      expect((await o.sellerAgent.post(`/api/sub-orders/${o.code}/return-decision`).send({ decision: 'approve' })).status).toBe(403);
      expect((await admin.agent.post(`/api/sub-orders/${o.code}/return-decision`).send({ decision: 'maybe' })).status).toBe(400);
      expect((await admin.agent.post(`/api/sub-orders/${o.code}/return-decision`).send({ decision: 'approve' })).status).toBe(200);
      expect((await admin.agent.post(`/api/sub-orders/${o.code}/return-decision`).send({ decision: 'approve' })).status).toBe(409); // not twice
      expect((await ledgerFor(o.subId)).filter((l) => l.type === 'refund_debit')).toHaveLength(1);
    });

    it('a refund in a two-seller order leaves the other sub-order and the parent untouched', async () => {
      const a = await makeSeller(1000);
      const b = await makeSeller(1000);
      const va = await makeVariant({ stock: 5, sellerId: a.seller.id });
      const vb = await makeVariant({ stock: 5, sellerId: b.seller.id });
      const buyer = await signedInAgent(app);
      await buyer.agent.post('/api/cart/items').send({ variantId: va.variant.id, quantity: 1 });
      await buyer.agent.post('/api/cart/items').send({ variantId: vb.variant.id, quantity: 1 });
      const order = (await buyer.agent.post('/api/checkout').send({ idempotencyKey: 'two-seller-key-1', paymentMethod: 'sandbox_card', shippingAddress: address })).body.data;
      const forA = order.subOrders.find((x: { seller: { id: string } }) => x.seller.id === a.seller.id);
      await setStatus(forA.id, 'DELIVERED');
      await go(buyer.agent, forA.code, { to: 'RETURN_REQUESTED', reason: 'x' });
      const admin = await signedInAgent(app, 'admin');
      await admin.agent.post(`/api/sub-orders/${forA.code}/return-decision`).send({ decision: 'approve' });
      const parent = (await db.select().from(s.orders).where(eq(s.orders.code, order.code)))[0];
      expect(parent.paymentStatus).toBe('PAID'); // the other parcel is still live
      const rows = await db.select().from(s.subOrders).where(eq(s.subOrders.orderId, parent.id));
      expect(rows.map((r) => r.status).sort()).toEqual(['PAID', 'REFUNDED']);
    });
  });
});
