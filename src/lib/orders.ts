// ABOUTME: Order query hooks for the buyer: list and single order by code.
// ABOUTME: Mutations (cancel, return) join here in the lifecycle milestone.
import { useQuery } from '@tanstack/react-query';
import { api } from './api.ts';

export const ordersKey = ['orders'] as const;
export const useOrders = () => useQuery({ queryKey: ordersKey, queryFn: api.orders.list });
export const useOrder = (code: string) => useQuery({ queryKey: ['orders', code], queryFn: () => api.orders.get(code), retry: false });
