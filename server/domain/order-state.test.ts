// ABOUTME: Pure tests for the order state machine and who may perform each transition (no database).
// ABOUTME: The graph must equal the one in the build brief; permissions are checked edge by edge.
import { describe, expect, it } from 'vitest';
import { ALLOWED_TRANSITIONS, ORDER_STATUSES, authorizeTransition, isLegalTransition } from './order-state.ts';

describe('ALLOWED_TRANSITIONS', () => {
  it('is exactly the graph from the brief', () => {
    expect(ALLOWED_TRANSITIONS).toEqual({
      PLACED: ['PAID', 'CANCELLED'],
      PAID: ['PACKED', 'CANCELLED'],
      PACKED: ['SHIPPED'],
      SHIPPED: ['DELIVERED'],
      DELIVERED: ['RETURN_REQUESTED'],
      RETURN_REQUESTED: ['RETURNED', 'DELIVERED'],
      RETURNED: ['REFUNDED'],
      REFUNDED: [],
      CANCELLED: [],
    });
  });

  it('treats a transition to the same status as illegal for every status', () => {
    for (const s of ORDER_STATUSES) expect(isLegalTransition(s, s)).toBe(false);
  });
});

describe('authorizeTransition (generic endpoint)', () => {
  const seller = (from: string, to: string) => authorizeTransition({ role: 'seller', from: from as never, to: to as never });
  const buyer = (from: string, to: string) => authorizeTransition({ role: 'buyer', from: from as never, to: to as never });

  it('lets sellers pack, ship, deliver and confirm COD payment', () => {
    expect(seller('PAID', 'PACKED')).toBe(true);
    expect(seller('PACKED', 'SHIPPED')).toBe(true);
    expect(seller('SHIPPED', 'DELIVERED')).toBe(true);
    expect(seller('PLACED', 'PAID')).toBe(true);
  });

  it('lets buyers cancel while PLACED or PAID and request a return after delivery', () => {
    expect(buyer('PLACED', 'CANCELLED')).toBe(true);
    expect(buyer('PAID', 'CANCELLED')).toBe(true);
    expect(buyer('DELIVERED', 'RETURN_REQUESTED')).toBe(true);
  });

  it('denies cross-role actions and keeps return approval off the generic endpoint', () => {
    expect(buyer('PAID', 'PACKED')).toBe(false);
    expect(seller('PAID', 'CANCELLED')).toBe(false);
    expect(seller('DELIVERED', 'RETURN_REQUESTED')).toBe(false);
    for (const role of ['buyer', 'seller', 'admin'] as const) {
      expect(authorizeTransition({ role, from: 'RETURN_REQUESTED', to: 'RETURNED' })).toBe(false);
      expect(authorizeTransition({ role, from: 'RETURNED', to: 'REFUNDED' })).toBe(false);
      expect(authorizeTransition({ role, from: 'RETURN_REQUESTED', to: 'DELIVERED' })).toBe(false);
    }
    expect(authorizeTransition({ role: 'admin', from: 'PAID', to: 'PACKED' })).toBe(false);
  });
});
