// ABOUTME: Stock reservation primitives. `reserved` counts live holds; stock only drops at checkout (M6).
// ABOUTME: reserveStock is THE atomic guard: one conditional UPDATE; zero rows affected means not enough stock.
import { and, eq, gte, sql } from 'drizzle-orm';
import { db, type Db, type Tx } from '../db/client.ts';
import * as s from '../db/schema.ts';

export type Executor = Db | Tx;

/** Increments `reserved` only where `stock - reserved >= qty`. Returns false if nothing matched. */
export async function reserveStock(ex: Executor, variantId: string, qty: number): Promise<boolean> {
  const rows = await ex
    .update(s.variants)
    .set({ reserved: sql`${s.variants.reserved} + ${qty}` })
    .where(and(eq(s.variants.id, variantId), gte(sql`${s.variants.stock} - ${s.variants.reserved}`, qty)))
    .returning({ id: s.variants.id });
  return rows.length === 1;
}

/** Decrements `reserved`. The CHECK (reserved >= 0) turns an accounting bug into a hard error, never a silent clamp. */
export async function releaseStock(ex: Executor, variantId: string, qty: number): Promise<void> {
  if (qty <= 0) return;
  await ex.update(s.variants).set({ reserved: sql`${s.variants.reserved} - ${qty}` }).where(eq(s.variants.id, variantId));
}

/** Takes the variant row lock; every cart write path locks variant -> cart line in this order to avoid deadlocks. */
export async function lockVariant(tx: Tx, variantId: string): Promise<boolean> {
  const r = await tx.execute(sql`select 1 from variants where id = ${variantId} for update`);
  return r.rows.length === 1;
}

/** Deletes every expired cart line and returns its quantity to `reserved`, in one statement.
 *  A concurrent run blocks on the same row locks and then finds nothing left, so nothing is released twice. */
export async function releaseExpired(ex: Executor = db): Promise<number> {
  const r = await ex.execute(sql`
    with expired as (delete from cart_items where expires_at <= now() returning variant_id, quantity),
    agg as (select variant_id, sum(quantity)::int as q from expired group by variant_id),
    upd as (update variants v set reserved = v.reserved - agg.q from agg where v.id = agg.variant_id returning v.id)
    select (select count(*) from expired)::int as released`);
  return (r.rows[0] as { released: number }).released;
}

/** The variant, only if it is purchasable now: product published and seller active. */
export async function findPurchasableVariant(ex: Executor, variantId: string) {
  const r = await ex.execute(sql`
    select v.id from variants v
    join products p on p.id = v.product_id
    join sellers sl on sl.id = p.seller_id
    where v.id = ${variantId} and p.is_published and sl.status = 'active'`);
  return r.rows.length === 1;
}
