// ABOUTME: Wishlist hooks: the saved list (only fetched when signed in) and an add/remove toggle.
// ABOUTME: Server is the source of truth; the toggle invalidates the list instead of guessing locally.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api.ts';
import { useMe } from './auth.tsx';

export const wishlistKey = ['wishlist'] as const;

export function useWishlist() {
  const me = useMe();
  return useQuery({ queryKey: wishlistKey, queryFn: api.wishlist.list, enabled: !!me.data });
}

export function useToggleWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, saved }: { productId: string; saved: boolean }) =>
      saved ? api.wishlist.remove(productId) : api.wishlist.add(productId),
    onSuccess: () => qc.invalidateQueries({ queryKey: wishlistKey }),
  });
}
