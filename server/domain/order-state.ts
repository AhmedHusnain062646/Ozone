// ABOUTME: Order state machine: the single ALLOWED_TRANSITIONS graph and who may perform each edge via the generic endpoint.
// ABOUTME: Pure (no I/O). Return approval/refund edges are admin-only through a dedicated decision endpoint, never the generic one.
export const ORDER_STATUSES = ['PLACED', 'PAID', 'PACKED', 'SHIPPED', 'DELIVERED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED', 'CANCELLED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type Actor = 'buyer' | 'seller' | 'admin';

export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PLACED: ['PAID', 'CANCELLED'],
  PAID: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED', 'DELIVERED'],
  RETURNED: ['REFUNDED'],
  REFUNDED: [],
  CANCELLED: [],
};

export const isLegalTransition = (from: OrderStatus, to: OrderStatus): boolean => ALLOWED_TRANSITIONS[from].includes(to);

const SELLER_EDGES: readonly string[] = ['PLACED>PAID', 'PAID>PACKED', 'PACKED>SHIPPED', 'SHIPPED>DELIVERED'];
const BUYER_EDGES: readonly string[] = ['PLACED>CANCELLED', 'PAID>CANCELLED', 'DELIVERED>RETURN_REQUESTED'];

/** Role permission for an edge that is already known to be legal. */
export function authorizeTransition(a: { role: Actor; from: OrderStatus; to: OrderStatus }): boolean {
  const edge = `${a.from}>${a.to}`;
  if (a.role === 'seller') return SELLER_EDGES.includes(edge);
  if (a.role === 'buyer') return BUYER_EDGES.includes(edge);
  return false;
}
