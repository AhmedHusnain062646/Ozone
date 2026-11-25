// ABOUTME: Order persistence: idempotency lookup, graph loading (order -> sub-orders -> items -> history), and listing.
// ABOUTME: Inserts used by checkout live here too so the service never builds table writes by hand.
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import * as s from '../db/schema.ts';
import type { Executor } from './inventory.ts';

export type OrderRow = typeof s.orders.$inferSelect;

export async function findByIdempotency(ex: Executor, buyerId: string, key: string): Promise<OrderRow | undefined> {
  const [row] = await ex.select().from(s.orders).where(and(eq(s.orders.buyerId, buyerId), eq(s.orders.idempotencyKey, key)));
  return row;
}

export async function findByCode(ex: Executor, code: string): Promise<OrderRow | undefined> {
  const [row] = await ex.select().from(s.orders).where(eq(s.orders.code, code));
  return row;
}

export async function listIdsForBuyer(ex: Executor, buyerId: string): Promise<string[]> {
  const rows = await ex.select({ id: s.orders.id }).from(s.orders).where(eq(s.orders.buyerId, buyerId)).orderBy(desc(s.orders.createdAt), desc(s.orders.id));
  return rows.map((r) => r.id);
}

export async function loadOrders(ex: Executor, ids: string[]) {
  if (ids.length === 0) return [];
  const orders = await ex.select().from(s.orders).where(inArray(s.orders.id, ids));
  const subs = await ex
    .select({ so: s.subOrders, sellerName: s.sellers.name })
    .from(s.subOrders)
    .innerJoin(s.sellers, eq(s.sellers.id, s.subOrders.sellerId))
    .where(inArray(s.subOrders.orderId, ids))
    .orderBy(asc(s.subOrders.code));
  const subIds = subs.map((r) => r.so.id);
  const items = subIds.length ? await ex.select().from(s.orderItems).where(inArray(s.orderItems.subOrderId, subIds)).orderBy(asc(s.orderItems.productTitle), asc(s.orderItems.id)) : [];
  const events = subIds.length ? await ex.select().from(s.statusEvents).where(inArray(s.statusEvents.subOrderId, subIds)).orderBy(asc(s.statusEvents.createdAt), asc(s.statusEvents.id)) : [];
  return ids.flatMap((id) => {
    const order = orders.find((o) => o.id === id);
    if (!order) return [];
    return [{
      order,
      subOrders: subs.filter((r) => r.so.orderId === id).map((r) => ({
        ...r.so,
        sellerName: r.sellerName,
        items: items.filter((i) => i.subOrderId === r.so.id),
        events: events.filter((e) => e.subOrderId === r.so.id),
      })),
    }];
  });
}

export type OrderGraph = Awaited<ReturnType<typeof loadOrders>>[number];

export async function insertOrder(ex: Executor, v: typeof s.orders.$inferInsert) {
  return (await ex.insert(s.orders).values(v).returning())[0];
}
export async function insertSubOrder(ex: Executor, v: typeof s.subOrders.$inferInsert) {
  return (await ex.insert(s.subOrders).values(v).returning())[0];
}
export const insertItems = (ex: Executor, v: (typeof s.orderItems.$inferInsert)[]) => ex.insert(s.orderItems).values(v);
export const insertEvents = (ex: Executor, v: (typeof s.statusEvents.$inferInsert)[]) => ex.insert(s.statusEvents).values(v);
export const insertLedger = (ex: Executor, v: typeof s.ledgerEntries.$inferInsert) => ex.insert(s.ledgerEntries).values(v);
export const insertPaymentIntent = (ex: Executor, v: typeof s.paymentIntents.$inferInsert) => ex.insert(s.paymentIntents).values(v);
