// ABOUTME: Cart use-cases. Adding/raising a line reserves stock atomically; lowering/removing releases it.
// ABOUTME: Every write is one transaction that locks variant -> cart line, so stock accounting cannot drift.
import { config } from '../config.ts';
import { db } from '../db/client.ts';
import { conflict, notFound } from '../http/errors.ts';
import { logger } from '../http/logger.ts';
import * as cart from '../repositories/cart.ts';
import * as inventory from '../repositories/inventory.ts';
import { releaseExpiredHolds } from './reservations.ts';

const holdDeadline = () => new Date(Date.now() + config.reservationTtlMs);
const inventoryConflict = (qty: number) =>
  conflict('INVENTORY_CONFLICT', `Only part of the requested quantity (${qty}) is available right now`, { requested: qty });

export async function addItem(userId: string, variantId: string, qty: number) {
  await releaseExpiredHolds(); // expired holds must not block this reservation
  await db.transaction(async (tx) => {
    if (!(await inventory.findPurchasableVariant(tx, variantId))) throw notFound('This edition is not available');
    await inventory.lockVariant(tx, variantId);
    if (!(await inventory.reserveStock(tx, variantId, qty))) {
      logger.info({ userId, variantId, qty }, 'reservation conflict');
      throw inventoryConflict(qty);
    }
    await cart.upsertAdd(tx, userId, variantId, qty, holdDeadline());
  });
}

export async function setQuantity(userId: string, variantId: string, quantity: number) {
  await releaseExpiredHolds();
  await db.transaction(async (tx) => {
    if (!(await inventory.lockVariant(tx, variantId))) throw notFound('This edition is not available');
    const current = await cart.getLineForUpdate(tx, userId, variantId);
    if (current === undefined) throw notFound('That item is not in your cart');
    const delta = quantity - current;
    if (delta > 0) {
      if (!(await inventory.reserveStock(tx, variantId, delta))) throw inventoryConflict(delta);
      await cart.setLine(tx, userId, variantId, quantity, holdDeadline());
    } else {
      await inventory.releaseStock(tx, variantId, -delta);
      await cart.setLine(tx, userId, variantId, quantity);
    }
  });
}

export async function removeItem(userId: string, variantId: string) {
  await db.transaction(async (tx) => {
    if (!(await inventory.lockVariant(tx, variantId))) return;
    const qty = await cart.deleteLine(tx, userId, variantId);
    await inventory.releaseStock(tx, variantId, qty);
  });
}

export async function clearCart(userId: string) {
  await db.transaction(async (tx) => {
    const removed = await cart.deleteAllLines(tx, userId);
    const byVariant = new Map<string, number>();
    for (const r of removed) byVariant.set(r.variantId, (byVariant.get(r.variantId) ?? 0) + r.quantity);
    // Sorted so concurrent clears lock variants in the same order.
    for (const [variantId, qty] of [...byVariant].sort(([a], [b]) => a.localeCompare(b))) await inventory.releaseStock(tx, variantId, qty);
  });
}

export async function getCart(userId: string) {
  await releaseExpiredHolds();
  const rows = await cart.listLines(db, userId);
  const lines = rows.map((r) => ({
    variantId: r.variantId,
    productId: r.productId,
    slug: r.slug,
    title: r.title,
    variantName: r.variantName,
    sku: r.sku,
    image: r.image,
    seller: { id: r.sellerId, name: r.sellerName },
    unitPriceCents: Number(r.unitPriceCents),
    quantity: r.quantity,
    lineTotalCents: Number(r.unitPriceCents) * r.quantity,
    expiresAt: new Date(r.expiresAt).toISOString(),
    purchasable: r.purchasable,
  }));
  return {
    lines,
    subtotalCents: lines.reduce((n, l) => n + l.lineTotalCents, 0),
    expiresAt: lines.length ? lines.map((l) => l.expiresAt).sort()[0] : null,
    serverTime: new Date().toISOString(),
  };
}
