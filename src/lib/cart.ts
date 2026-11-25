// ABOUTME: Cart hooks: server cart query, mutations, and a hold countdown corrected for client/server clock skew.
// ABOUTME: Stock-affecting mutations also invalidate the catalog and product queries so availability stays fresh.
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api.ts';
import { useMe } from './auth.tsx';

export const cartKey = ['cart'] as const;

export function useCart() {
  const me = useMe();
  return useQuery({ queryKey: cartKey, queryFn: api.cart.get, enabled: !!me.data, staleTime: 5_000 });
}

function useCartMutation<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    // Success and conflict both change what is in stock, so refresh either way.
    onSettled: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: cartKey }),
        qc.invalidateQueries({ queryKey: ['catalog'] }),
        qc.invalidateQueries({ queryKey: ['product'] }),
      ]);
    },
  });
}

export const useAddToCart = () => useCartMutation(({ variantId, quantity }: { variantId: string; quantity: number }) => api.cart.add(variantId, quantity));
export const useSetCartQuantity = () => useCartMutation(({ variantId, quantity }: { variantId: string; quantity: number }) => api.cart.setQuantity(variantId, quantity));
export const useRemoveFromCart = () => useCartMutation((variantId: string) => api.cart.remove(variantId));

/** Seconds left on the soonest hold. Uses the server's clock at fetch time so a wrong local clock cannot lie. */
export function useHoldSeconds(expiresAt: string | null | undefined, serverTime: string | undefined, fetchedAt: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [expiresAt]);
  if (!expiresAt || !serverTime) return null;
  const skew = new Date(serverTime).getTime() - fetchedAt;
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - (now + skew)) / 1000));
}
