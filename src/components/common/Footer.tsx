// ABOUTME: Site footer: wordmark, short positioning line, and a sandbox-payments disclosure.
// ABOUTME: Static content only; links point at real routes. Not shown on the seller and admin consoles.
import { Link, useLocation } from 'react-router';

export function Footer() {
  const { pathname } = useLocation();
  if (pathname === '/seller' || pathname === '/admin') return null;
  return (
    <footer className="mt-24 border-t border-linen bg-milk">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-margin py-12 md:grid-cols-3 md:px-16">
        <div>
          <p className="font-display text-2xl text-teal">Ozone</p>
          <p className="mt-2 max-w-xs text-sm text-sage">An invitation-only marketplace of independent ateliers presenting limited editions.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2 text-sm">
          <Link to="/" className="hover:underline">Collection</Link>
          <Link to="/sign-in" className="hover:underline">Sign in</Link>
        </nav>
        <p className="text-sm text-sage">
          Payments run in <strong className="font-semibold text-ink">Sandbox</strong> mode. No real card data is collected, transmitted or stored.
        </p>
      </div>
    </footer>
  );
}
