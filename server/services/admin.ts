// ABOUTME: Admin console: seller approval/commission, platform default fee, categories, analytics, returns queue, concurrency lab.
// ABOUTME: Commission changes only affect future orders because sub-orders snapshot their rate at checkout.
import { asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { conflict, notFound } from '../http/errors.ts';
import { logger } from '../http/logger.ts';
import * as inventory from '../repositories/inventory.ts';
import * as users from '../repositories/users.ts';

const isUnique = (e: unknown) => ((e as { cause?: { code?: string } }).cause?.code ?? (e as { code?: string }).code) === '23505';
const slugify = (v: string) => v.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

const toSellerDto = (r: { seller: typeof s.sellers.$inferSelect; email: string; productCount: number }) => ({
  id: r.seller.id, name: r.seller.name, slug: r.seller.slug, location: r.seller.location, status: r.seller.status, verified: r.seller.verified,
  commissionBps: r.seller.commissionBps, email: r.email, productCount: r.productCount, joinedAt: r.seller.joinedAt.toISOString(),
});

async function loadSellers(id?: string) {
  const rows = await db
    .select({ seller: s.sellers, email: s.users.email, productCount: sql<number>`(select count(*)::int from products p where p.seller_id = "sellers"."id")` })
    .from(s.sellers).innerJoin(s.users, eq(s.users.id, s.sellers.userId))
    .where(id ? eq(s.sellers.id, id) : undefined).orderBy(desc(s.sellers.joinedAt), asc(s.sellers.id));
  return rows.map(toSellerDto);
}

export const listSellers = () => loadSellers();

export async function updateSeller(id: string, patch: { status?: 'active' | 'pending_approval' | 'suspended'; commissionBps?: number; verified?: boolean }) {
  const [row] = await db.update(s.sellers).set(patch).where(eq(s.sellers.id, id)).returning({ id: s.sellers.id });
  if (!row) throw notFound('Atelier not found');
  logger.info({ sellerId: id, ...patch }, 'seller updated by admin');
  return (await loadSellers(id))[0];
}

export async function getSettings() {
  return { defaultCommissionBps: await users.getDefaultCommissionBps() };
}
export async function setDefaultFee(bps: number) {
  await db.insert(s.settings).values({ key: s.defaultFee.key, value: String(bps) }).onConflictDoUpdate({ target: s.settings.key, set: { value: String(bps) } });
  return getSettings();
}

const categoryRows = () =>
  db.select({ c: s.categories, productCount: sql<number>`(select count(*)::int from products p where p.category_id = "categories"."id")` })
    .from(s.categories).orderBy(asc(s.categories.name));
const toCategoryDto = (r: { c: typeof s.categories.$inferSelect; productCount: number }) => ({ id: r.c.id, slug: r.c.slug, name: r.c.name, description: r.c.description, productCount: r.productCount });

export async function listCategories() { return (await categoryRows()).map(toCategoryDto); }

export async function createCategory(input: { name: string; description?: string }) {
  try {
    const [row] = await db.insert(s.categories).values({ name: input.name, slug: slugify(input.name) || 'category', description: input.description ?? '' }).returning();
    return toCategoryDto({ c: row, productCount: 0 });
  } catch (e) {
    if (isUnique(e)) throw conflict('CATEGORY_EXISTS', 'A category with this name already exists');
    throw e;
  }
}
export async function updateCategory(id: string, patch: { name?: string; description?: string }) {
  try {
    const [row] = await db.update(s.categories).set({ ...patch, ...(patch.name && { slug: slugify(patch.name) || 'category' }) }).where(eq(s.categories.id, id)).returning();
    if (!row) throw notFound('Category not found');
    return (await listCategories()).find((c) => c.id === id)!;
  } catch (e) {
    if (isUnique(e)) throw conflict('CATEGORY_EXISTS', 'A category with this name already exists');
    throw e;
  }
}
export async function deleteCategory(id: string) {
  const [cat] = (await categoryRows()).filter((r) => r.c.id === id);
  if (!cat) throw notFound('Category not found');
  if (cat.productCount > 0) throw conflict('CATEGORY_IN_USE', `${cat.productCount} product(s) use this category; move them first`);
  await db.delete(s.categories).where(eq(s.categories.id, id));
}

/** Money figures come from the append-only ledger (sales net of refunds), never from mutable order rows. */
export async function analytics() {
  const money = (await db.execute(sql`
    select coalesce(sum(gross_cents),0)::int as gross, coalesce(sum(commission_cents),0)::int as commission, coalesce(sum(net_cents),0)::int as net
    from ledger_entries where type in ('sale_credit','refund_debit')`)).rows[0] as { gross: number; commission: number; net: number };
  const [orderCount] = (await db.execute(sql`select count(*)::int as c from orders`)).rows as { c: number }[];
  const byStatus = (await db.execute(sql`select status, count(*)::int as c from sub_orders group by status`)).rows as { status: string; c: number }[];
  const sellerStatus = (await db.execute(sql`select status, count(*)::int as c from sellers group by status`)).rows as { status: string; c: number }[];
  const top = (await db.execute(sql`
    select sl.id as "sellerId", sl.name, coalesce(sum(l.gross_cents),0)::int as "grossCents", coalesce(sum(l.commission_cents),0)::int as "commissionCents"
    from sellers sl join ledger_entries l on l.seller_id = sl.id and l.type in ('sale_credit','refund_debit')
    group by sl.id, sl.name order by 3 desc, sl.name limit 5`)).rows;
  const daily = (await db.execute(sql`
    select to_char(date_trunc('day', created_at at time zone 'UTC'), 'YYYY-MM-DD') as date, sum(gross_cents)::int as "grossCents"
    from ledger_entries where type in ('sale_credit','refund_debit') and created_at >= now() - interval '14 days'
    group by 1 order by 1`)).rows;
  return {
    grossCents: money.gross, commissionCents: money.commission, netToSellersCents: money.net, orderCount: orderCount.c,
    subOrdersByStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.c])),
    sellersByStatus: Object.fromEntries(sellerStatus.map((r) => [r.status, r.c])),
    topSellers: top, daily,
  };
}

export async function returnsQueue() {
  const rows = await db
    .select({ so: s.subOrders, orderCode: s.orders.code, sellerName: s.sellers.name, buyerName: s.users.displayName, buyerEmail: s.users.email })
    .from(s.subOrders)
    .innerJoin(s.orders, eq(s.orders.id, s.subOrders.orderId)).innerJoin(s.sellers, eq(s.sellers.id, s.subOrders.sellerId)).innerJoin(s.users, eq(s.users.id, s.orders.buyerId))
    .where(eq(s.subOrders.status, 'RETURN_REQUESTED')).orderBy(asc(s.subOrders.createdAt), asc(s.subOrders.code));
  const items = rows.length ? await db.select().from(s.orderItems) : [];
  return rows.map((r) => ({
    id: r.so.id, code: r.so.code, orderCode: r.orderCode, seller: r.sellerName, buyer: { name: r.buyerName, email: r.buyerEmail }, returnReason: r.so.returnReason,
    subtotalCents: r.so.subtotalCents, commissionCents: r.so.commissionCents, netCents: r.so.netCents,
    items: items.filter((i) => i.subOrderId === r.so.id).map((i) => ({ productTitle: i.productTitle, variantName: i.variantName, quantity: i.quantity })),
  }));
}

/** Fires `attempts` simultaneous one-unit reservations at the same atomic guard the cart uses, measures each, then releases what it took.
 *  Units are held for milliseconds only and never exceed what was free, so real buyers can at worst see a momentary "just taken". */
export async function runConcurrencyLab(variantId: string, attempts: number) {
  await inventory.releaseExpired(db);
  const [before] = await db.select().from(s.variants).where(eq(s.variants.id, variantId));
  if (!before) throw notFound('Variant not found');
  const availableBefore = before.stock - before.reserved;
  const t0 = performance.now();
  const results = await Promise.all(Array.from({ length: attempts }, async () => {
    const start = performance.now();
    const ok = await inventory.reserveStock(db, variantId, 1);
    return { ok, ms: Math.round((performance.now() - start) * 100) / 100 };
  }));
  const totalMs = Math.round((performance.now() - t0) * 100) / 100;
  const succeeded = results.filter((r) => r.ok).length;
  let oversold = false;
  let reservedAtPeak = 0;
  try {
    const [peak] = await db.select().from(s.variants).where(eq(s.variants.id, variantId));
    reservedAtPeak = peak.reserved;
    oversold = peak.reserved > peak.stock;
  } finally {
    await inventory.releaseStock(db, variantId, succeeded);
  }
  const released = succeeded;
  logger.info({ variantId, attempts, succeeded, availableBefore, totalMs }, 'concurrency lab run');
  return { variantId, attempts, availableBefore, succeeded, conflicts: attempts - succeeded, oversold, reservedAtPeak, released, totalMs, timingsMs: results.map((r) => r.ms) };
}

/** Variants the lab may target: sellable ones only, with live availability so the admin sees what is free. */
export async function listLabVariants() {
  const rows = (await db.execute(sql`
    select v.id, p.title || ' · ' || v.name as label, v.stock, v.reserved
    from variants v join products p on p.id = v.product_id join sellers sl on sl.id = p.seller_id
    where p.is_published and sl.status = 'active' order by p.title, v.name`)).rows as unknown as { id: string; label: string; stock: number; reserved: number }[];
  return rows;
}
