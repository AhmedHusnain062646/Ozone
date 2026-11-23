// ABOUTME: Checkout: ONE transaction that verifies holds, prices server-side, splits per seller, snapshots commission,
// ABOUTME: consumes stock, writes ledger + history, and records the idempotency key. Replays return the original order.
import { randomBytes } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db, type Tx } from '../db/client.ts';
import type { AuthContext } from '../http/auth.ts';
import { HttpError, conflict } from '../http/errors.ts';
import { logger } from '../http/logger.ts';
import { splitCommission } from '../lib/money.ts';
import { getPaymentProvider, type PaymentMethod } from '../payments/provider.ts';
import * as orders from '../repositories/orders.ts';
import { toOrderDto } from './orders.ts';

export interface ShippingAddress {
  fullName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}
export interface CheckoutInput {
  idempotencyKey: string;
  paymentMethod: PaymentMethod;
  shippingAddress: ShippingAddress;
  sandboxOutcome?: 'approve' | 'decline';
}

interface LockedLine {
  variantId: string;
  quantity: number;
  expired: boolean;
  purchasable: boolean;
  productId: string;
  title: string;
  variantName: string;
  sku: string;
  unitPriceCents: number;
  sellerId: string;
  commissionBps: number;
}

const canonical = (v: unknown): string =>
  JSON.stringify(v, (_k, val) => (val && typeof val === 'object' && !Array.isArray(val) ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b))) : val));

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
const newOrderCode = () => `OZ-${Array.from(randomBytes(10), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')}`;

/** Locks variants (sorted) then the buyer's cart lines: the same variant -> cart order every cart write uses. */
async function lockCart(tx: Tx, buyerId: string): Promise<LockedLine[]> {
  await tx.execute(sql`
    select v.id from variants v
    where v.id in (select variant_id from cart_items where user_id = ${buyerId})
    order by v.id for update`);
  const r = await tx.execute(sql`
    select ci.variant_id as "variantId", ci.quantity, (ci.expires_at <= now()) as expired,
      (p.is_published and sl.status = 'active') as purchasable,
      p.id as "productId", p.title, v.name as "variantName", v.sku,
      p.base_price_cents + v.price_delta_cents as "unitPriceCents",
      sl.id as "sellerId", sl.commission_bps as "commissionBps"
    from cart_items ci
    join variants v on v.id = ci.variant_id
    join products p on p.id = v.product_id
    join sellers sl on sl.id = p.seller_id
    where ci.user_id = ${buyerId}
    order by ci.variant_id
    for update of ci`);
  return (r.rows as unknown as LockedLine[]).map((l) => ({ ...l, unitPriceCents: Number(l.unitPriceCents) }));
}

/** @returns the order DTO and whether it was a replay of an earlier submission with the same key. */
export async function checkout(buyer: AuthContext, input: CheckoutInput) {
  const replayOf = async (existing: orders.OrderRow, ex = db as Parameters<typeof orders.loadOrders>[0]) => {
    if (existing.paymentMethod !== input.paymentMethod || canonical(existing.shippingAddress) !== canonical(input.shippingAddress)) {
      throw new HttpError(422, 'IDEMPOTENCY_KEY_REUSED', 'This idempotency key was already used with different checkout details');
    }
    const [graph] = await orders.loadOrders(ex, [existing.id]);
    return { order: toOrderDto(graph, { financials: false }), replayed: true };
  };

  const prior = await orders.findByIdempotency(db, buyer.id, input.idempotencyKey);
  if (prior) return replayOf(prior);

  return db.transaction(async (tx) => {
    // Serialise duplicates of the same (buyer, key); the loser then finds the winner's committed order.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${buyer.id}:${input.idempotencyKey}`}))`);
    const raced = await orders.findByIdempotency(tx, buyer.id, input.idempotencyKey);
    if (raced) return replayOf(raced, tx);

    const lines = await lockCart(tx, buyer.id);
    if (lines.length === 0) throw conflict('CART_EMPTY', 'Your cart is empty');
    if (lines.some((l) => l.expired)) throw conflict('HOLD_EXPIRED', 'One or more reservations expired. Review your cart and reserve again.');
    const gone = lines.filter((l) => !l.purchasable);
    if (gone.length) throw conflict('ITEM_UNAVAILABLE', 'Some items are no longer available', { variantIds: gone.map((l) => l.variantId) });

    const provider = getPaymentProvider(input.paymentMethod);
    const bySeller = new Map<string, LockedLine[]>();
    for (const l of lines) bySeller.set(l.sellerId, [...(bySeller.get(l.sellerId) ?? []), l]);
    const totalCents = lines.reduce((n, l) => n + l.unitPriceCents * l.quantity, 0);
    const code = newOrderCode();

    const auth = await provider.authorize({ amountCents: totalCents, orderCode: code, idempotencyKey: input.idempotencyKey, sandboxOutcome: input.sandboxOutcome });
    if (!auth.approved) throw new HttpError(402, 'PAYMENT_DECLINED', auth.declineReason ?? 'Payment was declined');

    const order = await orders.insertOrder(tx, {
      code,
      buyerId: buyer.id,
      paymentMethod: provider.method,
      paymentStatus: provider.collectsAtCheckout ? 'PAID' : 'PENDING_COD',
      totalCents,
      idempotencyKey: input.idempotencyKey,
      shippingAddress: input.shippingAddress,
    });
    await orders.insertPaymentIntent(tx, { orderId: order.id, provider: provider.method, amountCents: totalCents, reference: auth.reference });

    let n = 0;
    for (const sellerLines of bySeller.values()) {
      const subtotal = sellerLines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
      const bps = sellerLines[0].commissionBps; // snapshot: later rate changes never touch this sub-order
      const { commissionCents, netCents } = splitCommission(subtotal, bps);
      const status = provider.collectsAtCheckout ? 'PAID' : 'PLACED';
      const sub = await orders.insertSubOrder(tx, {
        code: `${code}-${String.fromCharCode(65 + n++)}`,
        orderId: order.id,
        sellerId: sellerLines[0].sellerId,
        status,
        subtotalCents: subtotal,
        commissionBps: bps,
        commissionCents,
        netCents,
      });
      await orders.insertItems(tx, sellerLines.map((l) => ({
        subOrderId: sub.id, productId: l.productId, variantId: l.variantId, productTitle: l.title, variantName: l.variantName,
        sku: l.sku, unitPriceCents: l.unitPriceCents, quantity: l.quantity, subtotalCents: l.unitPriceCents * l.quantity,
      })));
      const placedAt = new Date();
      await orders.insertEvents(tx, [
        { subOrderId: sub.id, status: 'PLACED', actorUserId: buyer.id, actorRole: 'buyer', actorLabel: `Buyer (${buyer.displayName})`, note: 'Order placed', createdAt: placedAt },
        ...(provider.collectsAtCheckout
          ? [{ subOrderId: sub.id, status: 'PAID' as const, actorUserId: null, actorRole: null, actorLabel: provider.actorLabel, note: 'Payment authorised', createdAt: new Date(placedAt.getTime() + 1) }]
          : []),
      ]);
      await orders.insertLedger(tx, {
        sellerId: sub.sellerId, orderId: order.id, subOrderId: sub.id, type: 'sale_credit',
        grossCents: subtotal, commissionCents, netCents, status: provider.collectsAtCheckout ? 'settled' : 'pending',
      });
    }

    // Consume stock: the hold becomes a sale. Both counters drop together so reserved <= stock holds throughout.
    for (const l of lines) {
      const r = await tx.execute(sql`
        update variants set stock = stock - ${l.quantity}, reserved = reserved - ${l.quantity}
        where id = ${l.variantId} and stock >= ${l.quantity} and reserved >= ${l.quantity} returning id`);
      if (r.rows.length !== 1) throw conflict('ITEM_UNAVAILABLE', 'Stock changed during checkout', { variantId: l.variantId });
    }
    await tx.execute(sql`delete from cart_items where user_id = ${buyer.id}`);

    const [graph] = await orders.loadOrders(tx, [order.id]);
    logger.info({ orderId: order.id, code, buyerId: buyer.id, subOrders: bySeller.size, totalCents, method: provider.method }, 'checkout completed');
    return { order: toOrderDto(graph, { financials: false }), replayed: false };
  });
}
