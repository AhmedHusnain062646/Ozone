// ABOUTME: Cart line persistence. A cart line is also the stock hold: expires_at is the hold deadline.
// ABOUTME: Callers lock the variant row first (see inventory.lockVariant) before touching a line.
import { and, eq, sql } from 'drizzle-orm';
import { type Executor } from './inventory.ts';
import * as s from '../db/schema.ts';

export async function upsertAdd(ex: Executor, userId: string, variantId: string, qty: number, expiresAt: Date) {
  await ex
    .insert(s.cartItems)
    .values({ userId, variantId, quantity: qty, expiresAt })
    .onConflictDoUpdate({
      target: [s.cartItems.userId, s.cartItems.variantId],
      set: { quantity: sql`${s.cartItems.quantity} + excluded.quantity`, expiresAt },
    });
}

export async function getLineForUpdate(ex: Executor, userId: string, variantId: string) {
  const r = await ex.execute(sql`select quantity from cart_items where user_id = ${userId} and variant_id = ${variantId} for update`);
  return (r.rows[0] as { quantity: number } | undefined)?.quantity;
}

export const setLine = (ex: Executor, userId: string, variantId: string, quantity: number, expiresAt?: Date) =>
  ex
    .update(s.cartItems)
    .set(expiresAt ? { quantity, expiresAt } : { quantity })
    .where(and(eq(s.cartItems.userId, userId), eq(s.cartItems.variantId, variantId)));

export async function deleteLine(ex: Executor, userId: string, variantId: string): Promise<number> {
  const rows = await ex
    .delete(s.cartItems)
    .where(and(eq(s.cartItems.userId, userId), eq(s.cartItems.variantId, variantId)))
    .returning({ quantity: s.cartItems.quantity });
  return rows[0]?.quantity ?? 0;
}

export const deleteAllLines = (ex: Executor, userId: string) =>
  ex.delete(s.cartItems).where(eq(s.cartItems.userId, userId)).returning({ variantId: s.cartItems.variantId, quantity: s.cartItems.quantity });

export async function listLines(ex: Executor, userId: string) {
  const r = await ex.execute(sql`
    select ci.variant_id as "variantId", ci.quantity, ci.expires_at as "expiresAt",
      v.name as "variantName", v.sku, v.stock, v.reserved,
      p.id as "productId", p.slug, p.title, p.base_price_cents + v.price_delta_cents as "unitPriceCents",
      (p.is_published and sl.status = 'active') as purchasable,
      sl.id as "sellerId", sl.name as "sellerName",
      (select i.url from product_images i where i.product_id = p.id order by i.position, i.id limit 1) as image
    from cart_items ci
    join variants v on v.id = ci.variant_id
    join products p on p.id = v.product_id
    join sellers sl on sl.id = p.seller_id
    where ci.user_id = ${userId}
    order by ci.expires_at, ci.id`);
  return r.rows as Array<{
    variantId: string; quantity: number; expiresAt: Date | string; variantName: string; sku: string; stock: number; reserved: number;
    productId: string; slug: string; title: string; unitPriceCents: number; purchasable: boolean; sellerId: string; sellerName: string; image: string | null;
  }>;
}
