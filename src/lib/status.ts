// ABOUTME: Display mapping for order statuses (label + badge tone). Presentation only; the server owns the state machine.
// ABOUTME: Kept in one place so the buyer, seller and admin screens always agree.
import type { BadgeTone } from '../components/ui/Badge.tsx';
import type { OrderStatus } from './types.ts';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PLACED: 'Placed',
  PAID: 'Paid',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  RETURN_REQUESTED: 'Return requested',
  RETURNED: 'Returned',
  REFUNDED: 'Refunded',
  CANCELLED: 'Cancelled',
};

const TONE: Record<OrderStatus, BadgeTone> = {
  PLACED: 'neutral',
  PAID: 'info',
  PACKED: 'info',
  SHIPPED: 'info',
  DELIVERED: 'success',
  RETURN_REQUESTED: 'warning',
  RETURNED: 'warning',
  REFUNDED: 'neutral',
  CANCELLED: 'danger',
};
export const statusTone = (s: OrderStatus): BadgeTone => TONE[s];
