// ABOUTME: Route table (react-router data mode). Modal screens are child routes of "/" so they are deep-linkable.
// ABOUTME: Role-gated areas wrap their element in <RequireRole>; later milestones add their routes here.
import { createBrowserRouter } from 'react-router';
import { AuthenticationModal } from './components/auth/AuthenticationModal.tsx';
import { CheckoutModal } from './components/buyer/CheckoutModal.tsx';
import { OrderDetailView, OrderTrackingView } from './components/buyer/OrderTrackingView.tsx';
import { CartDrawer } from './components/buyer/CartDrawer.tsx';
import { ProductDetailModal } from './components/buyer/ProductDetailModal.tsx';
import { SellerDashboard } from './components/seller/SellerDashboard.tsx';
import { WishlistView } from './components/buyer/WishlistView.tsx';
import { RequireRole } from './lib/auth.tsx';
import { Storefront } from './components/buyer/Storefront.tsx';
import { AppLayout } from './components/common/AppLayout.tsx';
import { Forbidden, NotFound } from './components/common/StatusPages.tsx';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppLayout,
    children: [
      {
        path: '/',
        Component: Storefront, children: [
          { path: 'sign-in', Component: AuthenticationModal },
          { path: 'products/:slug', Component: ProductDetailModal },
          { path: 'checkout', element: <RequireRole><CheckoutModal /></RequireRole> },
          { path: 'cart', element: <RequireRole><CartDrawer /></RequireRole> },
        ],
      },
      { path: 'orders', element: <RequireRole><OrderTrackingView /></RequireRole> },
      { path: 'orders/:code', element: <RequireRole><OrderDetailView /></RequireRole> },
      { path: 'seller', element: <RequireRole roles={['seller']}><SellerDashboard /></RequireRole> },
      { path: 'wishlist', element: <RequireRole><WishlistView /></RequireRole> },
      { path: 'forbidden', Component: Forbidden },
      { path: '*', Component: NotFound },
    ],
  },
]);
