// ABOUTME: Persistence for order lifecycle changes: row-locked sub-order load, status writes, restock, ledger reversal.
// ABOUTME: Everything takes an executor so the service runs each transition inside one transaction.
import { and, eq, ne, sql } from 'drizzle-orm';
import * as s from '../db/schema.ts';
import type { Tx } from '../db/client.ts';

export async function lockSubOrderByCode(tx: Tx, code: string) {
  const r = await tx.execute(sql`select id from sub_orders where code = ${code} for update`);
  const id = (r.rows[0] as { id: string } | undefined)?.id;
  if (!id) return undefined;
  const [row] = await tx
    .select({ so: s.subOrders, buyerId: s.orders.buyerId, paymentMethod: s.orders.paymentMethod })
    .from(s.subOrders)
    .innerJoin(s.orders, eq(s.orders.id, s.subOrders.orderId))
    .where(eq(s.subOrders.id, id));
  return row;
}

export const updateSubOrder = (tx: Tx, id: string, set: Partial<typeof s.subOrders.$inferInsert>) =>
  tx.update(s.subOrders).set(set).where(eq(s.subOrders.id, id));

export const addEvent = (tx: Tx, v: typeof s.statusEvents.$inferInsert) => tx.insert(s.statusEvents).values(v);

/** Gives sold units back to stock. Variants are updated in id order to keep lock order stable. */
export async function restock(tx: Tx, subOrderId: string) {
  const items = await tx.select().from(s.orderItems).where(eq(s.orderItems.subOrderId, subOrderId));
  for (const i of [...items].sort((a, b) => a.variantId.localeCompare(b.variantId))) {
    await tx.execute(sql`update variants set stock = stock + ${i.quantity} where id = ${i.variantId}`);
  }
}

/** Appends the exact negation of the sub-order's sale credit; the original entry is never modified. */
export async function reverseSale(tx: Tx, subOrderId: string) {
  const [credit] = await tx.select().from(s.ledgerEntries).where(and(eq(s.ledgerEntries.subOrderId, subOrderId), eq(s.ledgerEntries.type, 'sale_credit')));
  if (!credit) return;
  await tx.insert(s.ledgerEntries).values({
    sellerId: credit.sellerId, orderId: credit.orderId, subOrderId,
    type: 'refund_debit', grossCents: -credit.grossCents, commissionCents: -credit.commissionCents, netCents: -credit.netCents,
    status: credit.status === 'settled' ? 'settled' : 'pending',
  });
}

/** COD money counts as the seller's only once delivered: pending -> settled is the one update the ledger trigger allows. */
export const settleSale = (tx: Tx, subOrderId: string) =>
  tx.update(s.ledgerEntries).set({ status: 'settled' })
    .where(and(eq(s.ledgerEntries.subOrderId, subOrderId), eq(s.ledgerEntries.type, 'sale_credit'), eq(s.ledgerEntries.status, 'pending')));

/** Keeps the parent's payment status honest after a child changes. */
export async function syncParentPayment(tx: Tx, orderId: string) {
  const subs = await tx.select({ status: s.subOrders.status }).from(s.subOrders).where(eq(s.subOrders.orderId, orderId));
  const statuses = subs.map((x) => x.status);
  if (statuses.every((x) => x === 'CANCELLED' || x === 'REFUNDED')) {
    await tx.update(s.orders).set({ paymentStatus: 'REFUNDED' }).where(eq(s.orders.id, orderId));
    return;
  }
  const open = statuses.filter((x) => ['PLACED', 'PAID', 'PACKED', 'SHIPPED'].includes(x));
  const [order] = await tx.select().from(s.orders).where(eq(s.orders.id, orderId));
  if (order.paymentMethod === 'cod' && order.paymentStatus === 'PENDING_COD' && open.length === 0) {
    await tx.update(s.orders).set({ paymentStatus: 'PAID' }).where(and(eq(s.orders.id, orderId), ne(s.orders.paymentStatus, 'REFUNDED')));
  }
}

