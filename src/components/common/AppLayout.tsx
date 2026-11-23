// ABOUTME: Root layout: skip link, header, routed page outlet, footer. Wraps every route.
// ABOUTME: The cart button is injected into the header through the cartSlot prop.
import { Outlet } from 'react-router';
import { Footer } from './Footer.tsx';
import { CartButton } from './CartButton.tsx';
import { Header } from './Header.tsx';

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-[70] bg-teal px-4 py-3 text-milk focus:not-sr-only focus:fixed focus:left-2 focus:top-2">
        Skip to content
      </a>
      <Header cartSlot={<CartButton />} />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
