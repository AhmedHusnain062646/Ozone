// ABOUTME: Order lifecycle commands: seller/buyer transitions, cancel, return request, and admin return decisions.
// ABOUTME: Each command is ONE transaction on a row-locked sub-order, so concurrent duplicates see the new status and get 409.
import { db, type Tx } from '../db/client.ts';
import type { AuthContext } from '../http/auth.ts';
import { HttpError, conflict, forbidden, notFound } from '../http/errors.ts';
import { logger } from '../http/logger.ts';
import { authorizeTransition, isLegalTransition, type OrderStatus } from '../domain/order-state.ts';
import * as lifecycle from '../repositories/lifecycle.ts';
import * as orders from '../repositories/orders.ts';
import { toOrderDto } from './orders.ts';

export interface TransitionInput { to: OrderStatus; trackingNumber?: string; reason?: string }

type Locked = NonNullable<Awaited<ReturnType<typeof lifecycle.lockSubOrderByCode>>>;

async function lockOrFail(tx: Tx, code: string): Promise<Locked> {
  const row = await lifecycle.lockSubOrderByCode(tx, code);
  if (!row) throw notFound('Sub-order not found');
  return row;
}

const illegal = (from: OrderStatus, to: OrderStatus) =>
  conflict('ILLEGAL_TRANSITION', `A sub-order cannot move from ${from} to ${to}`, { from, to });

async function respond(tx: Tx, orderId: string, subId: string, viewer: AuthContext) {
  const [graph] = await orders.loadOrders(tx, [orderId]);
  return toOrderDto(graph, { financials: viewer.role === 'admin' }).subOrders.find((x) => x.id === subId)!;
}

const event = (subOrderId: string, status: OrderStatus, actor: AuthContext, note: string | null, offsetMs = 0) => ({
  subOrderId, status, actorUserId: actor.id, actorRole: actor.role, actorLabel: `${actor.role[0].toUpperCase()}${actor.role.slice(1)} (${actor.displayName})`, note,
  createdAt: new Date(Date.now() + offsetMs),
});

export async function transition(actor: AuthContext, code: string, input: TransitionInput) {
  return db.transaction(async (tx) => {
    const row = await lockOrFail(tx, code);
    const so = row.so;
    const owns = actor.role === 'admin' || (actor.role === 'buyer' && row.buyerId === actor.id) || (actor.role === 'seller' && actor.sellerId === so.sellerId);
    if (!owns) throw forbidden();

    const from = so.status as OrderStatus;
    if (!isLegalTransition(from, input.to)) throw illegal(from, input.to);
    if (!authorizeTransition({ role: actor.role, from, to: input.to })) throw forbidden('Your role cannot perform this transition');
    if (from === 'PLACED' && input.to === 'PAID' && row.paymentMethod !== 'cod') throw illegal(from, input.to);

    const tracking = input.trackingNumber?.trim();
    const reason = input.reason?.trim();
    if (input.to === 'SHIPPED' && !tracking) throw new HttpError(400, 'TRACKING_REQUIRED', 'A tracking number is required to ship');
    if (input.to === 'RETURN_REQUESTED' && !reason) throw new HttpError(400, 'REASON_REQUIRED', 'A reason is required to request a return');

    await lifecycle.updateSubOrder(tx, so.id, {
      status: input.to,
      ...(input.to === 'SHIPPED' && { trackingNumber: tracking }),
      ...(input.to === 'RETURN_REQUESTED' && { returnReason: reason }),
    });
    await lifecycle.addEvent(tx, event(so.id, input.to, actor, input.to === 'SHIPPED' ? `Tracking ${tracking}` : reason ?? null));

    if (input.to === 'CANCELLED') {
      await lifecycle.restock(tx, so.id);
      await lifecycle.reverseSale(tx, so.id);
    }
    if (input.to === 'DELIVERED') await lifecycle.settleSale(tx, so.id);
    await lifecycle.syncParentPayment(tx, so.orderId);

    logger.info({ subOrderId: so.id, code, from, to: input.to, actorId: actor.id, role: actor.role }, 'sub-order transition');
    return respond(tx, so.orderId, so.id, actor);
  });
}

/** Admin decision on a return. Approve runs RETURN_REQUESTED -> RETURNED -> REFUNDED atomically. */
export async function decideReturn(admin: AuthContext, code: string, decision: 'approve' | 'reject', note?: string) {
  return db.transaction(async (tx) => {
    const so = (await lockOrFail(tx, code)).so;
    const from = so.status as OrderStatus;
    if (from !== 'RETURN_REQUESTED') throw conflict('ILLEGAL_TRANSITION', `Only a sub-order in RETURN_REQUESTED can be decided (is ${from})`, { from });

    if (decision === 'reject') {
      await lifecycle.updateSubOrder(tx, so.id, { status: 'DELIVERED' });
      await lifecycle.addEvent(tx, event(so.id, 'DELIVERED', admin, note?.trim() || 'Return rejected'));
    } else {
      await lifecycle.updateSubOrder(tx, so.id, { status: 'REFUNDED' });
      await lifecycle.addEvent(tx, event(so.id, 'RETURNED', admin, note?.trim() || 'Return approved'));
      await lifecycle.addEvent(tx, event(so.id, 'REFUNDED', admin, 'Refund issued', 1));
      await lifecycle.restock(tx, so.id);
      await lifecycle.reverseSale(tx, so.id);
      await lifecycle.syncParentPayment(tx, so.orderId);
    }
    logger.info({ subOrderId: so.id, code, decision, adminId: admin.id }, 'return decided');
    return respond(tx, so.orderId, so.id, admin);
  });
}
