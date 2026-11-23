// ABOUTME: Session state hooks: who is signed in (server truth via /auth/me) plus login/register/logout mutations.
// ABOUTME: No identity is ever kept in localStorage; a cleared browser just means a fresh /me call.
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { Navigate, useLocation } from 'react-router';
import type { ReactNode } from 'react';
import { api, ApiError } from './api.ts';
import type { SessionUser, UserRole } from './types.ts';
import { Skeleton } from '../components/ui/Skeleton.tsx';

export const meKey = ['me'] as const;

export function useMe() {
  return useQuery<SessionUser | null>({
    queryKey: meKey,
    queryFn: async () => {
      try {
        return await api.auth.me();
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}

/** Identity changed: set `me` explicitly and reset every other query (cart, orders, wishlist...).
 *  resetQueries (not clear/removeQueries) keeps mounted observers attached, so the UI actually updates. */
async function applyIdentity(qc: QueryClient, user: SessionUser | null) {
  qc.setQueryData(meKey, user);
  await qc.resetQueries({ predicate: (q) => q.queryKey[0] !== meKey[0] });
}

function useSessionMutation<V>(fn: (v: V) => Promise<SessionUser>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (user) => applyIdentity(qc, user),
  });
}

export const useLogin = () => useSessionMutation(api.auth.login);
export const useRegister = () => useSessionMutation(api.auth.register);

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.auth.logout,
    onSuccess: () => applyIdentity(qc, null),
  });
}

/** Route guard: signed-out users go to the sign-in modal and come back; wrong role sees a 403 page. */
export function RequireRole({ roles, children }: { roles?: UserRole[]; children: ReactNode }) {
  const me = useMe();
  const location = useLocation();
  if (me.isPending) {
    return (
      <div className="mx-auto max-w-5xl p-margin" aria-busy="true">
        <Skeleton className="h-10 w-64" />
      </div>
    );
  }
  if (!me.data) {
    return <Navigate to={`/sign-in?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (roles && !roles.includes(me.data.role)) return <Navigate to="/forbidden" replace />;
  return <>{children}</>;
}
