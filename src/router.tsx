// ABOUTME: Route table (react-router data mode). Modal screens are child routes of "/" so they are deep-linkable.
// ABOUTME: Role-gated areas wrap their element in <RequireRole>; later milestones add their routes here.
import { createBrowserRouter } from 'react-router';
import { AuthenticationModal } from './components/auth/AuthenticationModal.tsx';
import { Storefront } from './components/buyer/Storefront.tsx';
import { AppLayout } from './components/common/AppLayout.tsx';
import { Forbidden, NotFound } from './components/common/StatusPages.tsx';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppLayout,
    children: [
      { path: '/', Component: Storefront, children: [{ path: 'sign-in', Component: AuthenticationModal }] },
      { path: 'forbidden', Component: Forbidden },
      { path: '*', Component: NotFound },
    ],
  },
]);
