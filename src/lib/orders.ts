// ABOUTME: Order query hooks for the buyer: list and single order by code.
// ABOUTME: Mutations (cancel, return) join here in the lifecycle milestone.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api.ts';
import type { OrderStatus } from './types.ts';

export const ordersKey = ['orders'] as const;
export const useOrders = () => useQuery({ queryKey: ordersKey, queryFn: api.orders.list });
export const useOrder = (code: string) => useQuery({ queryKey: ['orders', code], queryFn: () => api.orders.get(code), retry: false });

/** Buyer actions on a sub-order. Server owns legality; the UI only offers the buttons that can succeed. */
export function useSubOrderTransition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { code: string; to: OrderStatus; reason?: string }) => api.subOrders.transition(v.code, { to: v.to, reason: v.reason }),
    onSettled: () => Promise.all([qc.invalidateQueries({ queryKey: ordersKey }), qc.invalidateQueries({ queryKey: ['catalog'] }), qc.invalidateQueries({ queryKey: ['product'] })]),
  });
}
