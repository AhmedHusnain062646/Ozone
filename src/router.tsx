// ABOUTME: Route table (react-router data mode). Modal screens are child routes of "/" so they are deep-linkable.
// ABOUTME: Screens most visitors never open are code-split with `lazy`; role-gated areas wrap their element in <RequireRole>.
import type { ComponentType } from 'react';
import { createBrowserRouter } from 'react-router';
import { AuthenticationModal } from './components/auth/AuthenticationModal.tsx';
import { CartDrawer } from './components/buyer/CartDrawer.tsx';
import { ProductDetailModal } from './components/buyer/ProductDetailModal.tsx';
import { Storefront } from './components/buyer/Storefront.tsx';
import { AppLayout } from './components/common/AppLayout.tsx';
import { Forbidden, NotFound, PageError, PageLoading } from './components/common/StatusPages.tsx';
import { RequireRole } from './lib/auth.tsx';
import type { UserRole } from './lib/types.ts';

/** Downloads a signed-in screen only when its route is first visited. */
const guarded = (load: () => Promise<ComponentType>, roles?: UserRole[]) => async () => {
  const Screen = await load();
  return { element: <RequireRole roles={roles}><Screen /></RequireRole> };
};

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppLayout,
    HydrateFallback: PageLoading,
    ErrorBoundary: PageError,
    children: [
      {
        path: '/',
        Component: Storefront, children: [
          { path: 'sign-in', Component: AuthenticationModal },
          { path: 'products/:slug', Component: ProductDetailModal },
          { path: 'checkout', lazy: guarded(async () => (await import('./components/buyer/CheckoutModal.tsx')).CheckoutModal) },
          { path: 'cart', element: <RequireRole><CartDrawer /></RequireRole> },
        ],
      },
      { path: 'orders', lazy: guarded(async () => (await import('./components/buyer/OrderTrackingView.tsx')).OrderTrackingView) },
      { path: 'orders/:code', lazy: guarded(async () => (await import('./components/buyer/OrderTrackingView.tsx')).OrderDetailView) },
      { path: 'admin', lazy: guarded(async () => (await import('./components/admin/AdminDashboard.tsx')).AdminDashboard, ['admin']) },
      { path: 'seller', lazy: guarded(async () => (await import('./components/seller/SellerDashboard.tsx')).SellerDashboard, ['seller']) },
      { path: 'wishlist', lazy: guarded(async () => (await import('./components/buyer/WishlistView.tsx')).WishlistView) },
      { path: 'forbidden', Component: Forbidden },
      { path: '*', Component: NotFound },
    ],
  },
]);
