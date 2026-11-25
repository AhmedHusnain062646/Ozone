// ABOUTME: Site header: brand, role-aware navigation, account actions. Identity comes from the server session only.
// ABOUTME: On phones the links collapse into a Drawer menu; the wordmark and account button stay visible.
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { Menu } from 'lucide-react';
import { useLogout, useMe } from '../../lib/auth.tsx';
import { cx } from '../../lib/cx.ts';
import { Button, Drawer, useToast } from '../ui/index.ts';
import type { SessionUser } from '../../lib/types.ts';

function linksFor(user: SessionUser | null | undefined) {
  const links = [{ to: '/', label: 'Collection', end: true }];
  if (user?.role === 'buyer') links.push({ to: '/wishlist', label: 'Wishlist', end: false }, { to: '/orders', label: 'Orders', end: false });
  if (user?.role === 'seller') links.push({ to: '/seller', label: 'Atelier console', end: false });
  if (user?.role === 'admin') links.push({ to: '/admin', label: 'Governance', end: false });
  return links;
}

export function Header({ cartSlot }: { cartSlot?: React.ReactNode }) {
  const me = useMe();
  const logout = useLogout();
  const toast = useToast();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const links = linksFor(me.data);

  const signOut = () =>
    logout.mutate(undefined, {
      onSuccess: () => {
        setMenuOpen(false);
        toast.info('Signed out');
        navigate('/');
      },
      onError: (e) => toast.error('Could not sign out', e.message),
    });

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cx('label-caps border-b-2 py-2', isActive ? 'border-teal text-teal' : 'border-transparent text-sage hover:text-ink');

  return (
    <header className="sticky top-0 z-40 border-b border-linen bg-bone/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-margin md:px-16">
        <div className="flex items-center gap-8">
          <Link to="/" className="font-display text-2xl tracking-tight text-teal">
            Ozone
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {cartSlot}
          {me.data ? (
            <>
              <span className="hidden max-w-40 truncate text-sm text-sage lg:inline" title={me.data.email}>
                {me.data.displayName}
              </span>
              <Button variant="secondary" size="sm" onClick={signOut} loading={logout.isPending} className="hidden md:inline-flex">
                Sign out
              </Button>
            </>
          ) : (
            !me.isPending && (
              <Link to="/sign-in" className="inline-flex min-h-9 items-center rounded-sm border border-teal bg-teal px-3 text-xs font-medium text-milk hover:bg-teal-hover">
                Sign in
              </Link>
            )
          )}
          <button
            type="button"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-sm hover:bg-linen/60 md:hidden"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu">
        <nav aria-label="Mobile" className="flex flex-col">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={() => setMenuOpen(false)}
              className="border-b border-linen py-4 font-display text-xl"
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        {me.data && (
          <Button variant="secondary" className="mt-6 w-full" onClick={signOut} loading={logout.isPending}>
            Sign out
          </Button>
        )}
      </Drawer>
    </header>
  );
}
