// ABOUTME: Seller console hooks: profile, products, variants, images, orders, balance, ledger, payouts.
// ABOUTME: Every mutation invalidates the 'seller' key family (and the storefront when visibility/stock changes).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api.ts';
import type { Balance, LedgerRow, OrderStatus, SellerImage, SellerOrder, SellerProduct, SellerProductInput, SellerProfile, SellerSummary, SellerVariant } from './types.ts';

const S = 'seller';
export const useSellerProfile = () => useQuery({ queryKey: [S, 'me'], queryFn: () => api.get<SellerProfile>('/seller/me') });
export const useSellerSummary = () => useQuery({ queryKey: [S, 'summary'], queryFn: () => api.get<SellerSummary>('/seller/summary') });
export const useSellerProducts = () => useQuery({ queryKey: [S, 'products'], queryFn: () => api.get<SellerProduct[]>('/seller/products') });
export const useSellerOrders = () => useQuery({ queryKey: [S, 'orders'], queryFn: () => api.get<SellerOrder[]>('/seller/orders') });
export const useSellerBalance = () => useQuery({ queryKey: [S, 'balance'], queryFn: () => api.get<Balance>('/seller/balance') });
export const useSellerLedger = () => useQuery({ queryKey: [S, 'ledger'], queryFn: () => api.get<{ entries: LedgerRow[] }>('/seller/ledger') });

function useSellerMutation<V, R>(fn: (v: V) => Promise<R>, alsoStorefront = false) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: [S] });
      if (alsoStorefront) await Promise.all([qc.invalidateQueries({ queryKey: ['catalog'] }), qc.invalidateQueries({ queryKey: ['product'] })]);
    },
  });
}

export const useCreateProduct = () =>
  useSellerMutation((v: SellerProductInput & { variants: { name: string; sku: string; priceDeltaCents: number; stock: number }[] }) => api.post<SellerProduct>('/seller/products', v));
export const useUpdateProduct = () =>
  useSellerMutation((v: { id: string; patch: Partial<SellerProductInput> & { isPublished?: boolean } }) => api.patch<SellerProduct>(`/seller/products/${v.id}`, v.patch), true);
export const useAddVariant = () =>
  useSellerMutation((v: { productId: string; variant: { name: string; sku: string; priceDeltaCents: number; stock: number } }) => api.post<SellerVariant>(`/seller/products/${v.productId}/variants`, v.variant), true);
export const useUpdateVariant = () =>
  useSellerMutation((v: { id: string; patch: { name?: string; priceDeltaCents?: number; stock?: number } }) => api.patch<SellerVariant>(`/seller/variants/${v.id}`, v.patch), true);
export const useUploadImage = () =>
  useSellerMutation((v: { productId: string; file: File }) => {
    const form = new FormData();
    form.append('image', v.file);
    return api.upload<SellerImage>(`/seller/products/${v.productId}/images`, form);
  }, true);
export const useDeleteImage = () =>
  useSellerMutation((v: { productId: string; imageId: string }) => api.delete(`/seller/products/${v.productId}/images/${v.imageId}`), true);
export const useRequestPayout = () => useSellerMutation((amountCents: number) => api.post<{ id: string; amountCents: number; balance: Balance }>('/seller/payouts', { amountCents }));
export const useSellerTransition = () =>
  useSellerMutation((v: { code: string; to: OrderStatus; trackingNumber?: string }) => api.subOrders.transition(v.code, { to: v.to, trackingNumber: v.trackingNumber }));

/** "12.50" -> 1250; undefined when the text is not a non-negative amount with at most two decimals. */
export function dollarsToCents(text: string): number | undefined {
  const t = text.trim().replace(/^\$/, '');
  return /^\d{1,7}(\.\d{1,2})?$/.test(t) ? Math.round(Number(t) * 100) : undefined;
}
