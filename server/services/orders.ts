// ABOUTME: Order read models. Buyers see prices and progress; commission/net are visible only to admins (and sellers, M8).
// ABOUTME: Access rule: a buyer reads only their own orders (403 otherwise); admins read any.
import { db } from '../db/client.ts';
import type { AuthContext } from '../http/auth.ts';
import { forbidden, notFound } from '../http/errors.ts';
import * as repo from '../repositories/orders.ts';

export function toOrderDto(g: repo.OrderGraph, opts: { financials: boolean }) {
  return {
    id: g.order.id,
    code: g.order.code,
    createdAt: g.order.createdAt.toISOString(),
    paymentMethod: g.order.paymentMethod,
    paymentStatus: g.order.paymentStatus,
    totalCents: g.order.totalCents,
    shippingAddress: g.order.shippingAddress,
    subOrders: g.subOrders.map((so) => ({
      id: so.id,
      code: so.code,
      seller: { id: so.sellerId, name: so.sellerName },
      status: so.status,
      subtotalCents: so.subtotalCents,
      trackingNumber: so.trackingNumber,
      returnReason: so.returnReason,
      ...(opts.financials && { commissionBps: so.commissionBps, commissionCents: so.commissionCents, netCents: so.netCents }),
      items: so.items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        productTitle: i.productTitle,
        variantName: i.variantName,
        sku: i.sku,
        unitPriceCents: i.unitPriceCents,
        quantity: i.quantity,
        subtotalCents: i.subtotalCents,
      })),
      history: so.events.map((e) => ({ status: e.status, at: e.createdAt.toISOString(), actorLabel: e.actorLabel, actorRole: e.actorRole, note: e.note })),
    })),
  };
}

export async function getOrderForViewer(code: string, viewer: AuthContext) {
  const order = await repo.findByCode(db, code);
  if (!order) throw notFound('Order not found');
  if (viewer.role !== 'admin' && order.buyerId !== viewer.id) throw forbidden();
  const [graph] = await repo.loadOrders(db, [order.id]);
  return toOrderDto(graph, { financials: viewer.role === 'admin' });
}

export async function listOrdersForBuyer(buyerId: string) {
  const ids = await repo.listIdsForBuyer(db, buyerId);
  return (await repo.loadOrders(db, ids)).map((g) => toOrderDto(g, { financials: false }));
}
