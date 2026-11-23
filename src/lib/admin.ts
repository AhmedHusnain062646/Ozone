// ABOUTME: Admin console hooks: analytics, sellers, fees, categories, returns queue and the concurrency lab.
// ABOUTME: All keys live under 'admin' so one invalidation refreshes every governance view.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api.ts';
import type { AdminAnalytics, AdminCategory, AdminSeller, LabResult, LabVariant, ReturnRow, SellerProfile } from './types.ts';

const A = 'admin';
export const useAnalytics = () => useQuery({ queryKey: [A, 'analytics'], queryFn: () => api.get<AdminAnalytics>('/admin/analytics') });
export const useAdminSellers = () => useQuery({ queryKey: [A, 'sellers'], queryFn: () => api.get<AdminSeller[]>('/admin/sellers') });
export const useAdminSettings = () => useQuery({ queryKey: [A, 'settings'], queryFn: () => api.get<{ defaultCommissionBps: number }>('/admin/settings') });
export const useAdminCategories = () => useQuery({ queryKey: [A, 'categories'], queryFn: () => api.get<AdminCategory[]>('/admin/categories') });
export const useReturns = () => useQuery({ queryKey: [A, 'returns'], queryFn: () => api.get<ReturnRow[]>('/admin/returns') });
export const useLabVariants = () => useQuery({ queryKey: [A, 'lab-variants'], queryFn: () => api.get<LabVariant[]>('/admin/concurrency-lab/variants') });

function useAdminMutation<V, R>(fn: (v: V) => Promise<R>, extra: string[] = []) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => Promise.all([qc.invalidateQueries({ queryKey: [A] }), ...extra.map((k) => qc.invalidateQueries({ queryKey: [k] }))]),
  });
}

export const useUpdateSeller = () =>
  useAdminMutation((v: { id: string; patch: { status?: SellerProfile['status']; commissionBps?: number; verified?: boolean } }) => api.patch<AdminSeller>(`/admin/sellers/${v.id}`, v.patch), ['catalog', 'product']);
export const useSetDefaultFee = () => useAdminMutation((commissionBps: number) => api.put<{ defaultCommissionBps: number }>('/admin/settings/default-fee', { commissionBps }));
export const useCreateCategory = () => useAdminMutation((v: { name: string; description?: string }) => api.post<AdminCategory>('/admin/categories', v), ['catalog']);
export const useRenameCategory = () => useAdminMutation((v: { id: string; name: string }) => api.patch<AdminCategory>(`/admin/categories/${v.id}`, { name: v.name }), ['catalog']);
export const useDeleteCategory = () => useAdminMutation((id: string) => api.delete(`/admin/categories/${id}`), ['catalog']);
export const useDecideReturn = () =>
  useAdminMutation((v: { code: string; decision: 'approve' | 'reject'; note?: string }) => api.subOrders.decideReturn(v.code, { decision: v.decision, note: v.note }), ['orders', 'seller', 'catalog']);
export const useRunLab = () => useAdminMutation((v: { variantId: string; attempts: number }) => api.post<LabResult>('/admin/concurrency-lab', v), ['catalog', 'product']);

/** "12" or "12.5" percent -> basis points; undefined when outside 1-50% or not a number. */
export function percentToBps(text: string): number | undefined {
  const n = Number(text.trim());
  const bps = Math.round(n * 100);
  return Number.isFinite(n) && text.trim() !== '' && bps >= 100 && bps <= 5000 ? bps : undefined;
}
