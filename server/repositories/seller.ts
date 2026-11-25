// ABOUTME: Seller-scoped persistence: own products/variants/images, order queue, ledger and balance queries.
// ABOUTME: Every query takes the seller id; ownership is part of the WHERE, so another seller's rows are simply not found.
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import * as s from '../db/schema.ts';
import type { Executor } from './inventory.ts';

export async function loadProducts(ex: Executor, sellerId: string, productId?: string) {
  const products = await ex.select().from(s.products)
    .where(productId ? and(eq(s.products.sellerId, sellerId), eq(s.products.id, productId)) : eq(s.products.sellerId, sellerId))
    .orderBy(desc(s.products.createdAt), asc(s.products.id));
  if (products.length === 0) return [];
  const ids = products.map((p) => p.id);
  const [variants, images] = await Promise.all([
    ex.select().from(s.variants).where(inArray(s.variants.productId, ids)).orderBy(asc(s.variants.priceDeltaCents), asc(s.variants.name)),
    ex.select().from(s.productImages).where(inArray(s.productImages.productId, ids)).orderBy(asc(s.productImages.position)),
  ]);
  return products.map((p) => ({ ...p, variants: variants.filter((v) => v.productId === p.id), images: images.filter((i) => i.productId === p.id) }));
}

export async function findOwnedVariant(ex: Executor, sellerId: string, variantId: string) {
  const [row] = await ex.select({ v: s.variants }).from(s.variants)
    .innerJoin(s.products, eq(s.products.id, s.variants.productId))
    .where(and(eq(s.variants.id, variantId), eq(s.products.sellerId, sellerId)));
  return row?.v;
}

export async function categoryExists(ex: Executor, id: string) {
  const [row] = await ex.select({ id: s.categories.id }).from(s.categories).where(eq(s.categories.id, id));
  return Boolean(row);
}

export async function listOrderRows(ex: Executor, sellerId: string) {
  const subs = await ex
    .select({ so: s.subOrders, orderCode: s.orders.code, createdAt: s.orders.createdAt, paymentMethod: s.orders.paymentMethod, shippingAddress: s.orders.shippingAddress })
    .from(s.subOrders).innerJoin(s.orders, eq(s.orders.id, s.subOrders.orderId))
    .where(eq(s.subOrders.sellerId, sellerId)).orderBy(desc(s.orders.createdAt), desc(s.subOrders.code));
  const ids = subs.map((r) => r.so.id);
  const items = ids.length ? await ex.select().from(s.orderItems).where(inArray(s.orderItems.subOrderId, ids)) : [];
  return subs.map((r) => ({ ...r, items: items.filter((i) => i.subOrderId === r.so.id) }));
}

export async function balance(ex: Executor, sellerId: string) {
  const r = await ex.execute(sql`
    select
      coalesce(sum(net_cents) filter (where status = 'settled'), 0)::int as settled,
      coalesce(sum(net_cents) filter (where status = 'pending'), 0)::int as pending,
      coalesce(-sum(net_cents) filter (where type = 'payout_disbursement'), 0)::int as disbursed
    from ledger_entries where seller_id = ${sellerId}`);
  const row = r.rows[0] as { settled: number; pending: number; disbursed: number };
  // payout rows carry status 'disbursed', so `settled` is money still owed to the seller before payouts are subtracted
  return { availableCents: row.settled + (-row.disbursed), pendingCents: row.pending, disbursedCents: row.disbursed };
}

export async function lockSeller(ex: Executor, sellerId: string) {
  await ex.execute(sql`select id from sellers where id = ${sellerId} for update`);
}

export async function ledgerRows(ex: Executor, sellerId: string, limit = 1000) {
  return ex
    .select({ e: s.ledgerEntries, orderCode: s.orders.code })
    .from(s.ledgerEntries).leftJoin(s.orders, eq(s.orders.id, s.ledgerEntries.orderId))
    .where(eq(s.ledgerEntries.sellerId, sellerId)).orderBy(desc(s.ledgerEntries.createdAt), desc(s.ledgerEntries.id)).limit(limit);
}

export async function salesTotals(ex: Executor, sellerId: string) {
  const r = await ex.execute(sql`
    select coalesce(sum(gross_cents),0)::int as gross, coalesce(sum(net_cents),0)::int as net
    from ledger_entries where seller_id = ${sellerId} and type in ('sale_credit','refund_debit')`);
  const o = await ex.execute(sql`
    select count(*) filter (where status not in ('CANCELLED','REFUNDED'))::int as active,
           count(*) filter (where status in ('PLACED','PAID','PACKED'))::int as to_fulfil
    from sub_orders where seller_id = ${sellerId}`);
  const a = r.rows[0] as { gross: number; net: number };
  const b = o.rows[0] as { active: number; to_fulfil: number };
  return { grossCents: a.gross, netCents: a.net, orderCount: b.active, toFulfilCount: b.to_fulfil };
}

export async function lowStock(ex: Executor, sellerId: string) {
  const r = await ex.execute(sql`
    select v.id as "variantId", p.title as "productTitle", v.name as "variantName", v.stock, v.reserved
    from variants v join products p on p.id = v.product_id
    where p.seller_id = ${sellerId} and v.stock <= p.low_stock_threshold order by v.stock, p.title`);
  return r.rows as unknown as { variantId: string; productTitle: string; variantName: string; stock: number; reserved: number }[];
}
