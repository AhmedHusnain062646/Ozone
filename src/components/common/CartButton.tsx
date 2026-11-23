// ABOUTME: Header cart link with the item count (server cart). Signed-out visitors are sent to sign-in by the route guard.
// ABOUTME: The count is the sum of line quantities.
import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router';
import { useCart } from '../../lib/cart.ts';

export function CartButton() {
  const cart = useCart();
  const count = cart.data?.lines.reduce((n, l) => n + l.quantity, 0) ?? 0;
  return (
    <Link
      to="/cart"
      aria-label={count ? `Cart, ${count} ${count === 1 ? 'item' : 'items'}` : 'Cart'}
      className="relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-sm hover:bg-linen/60"
    >
      <ShoppingBag className="h-5 w-5" aria-hidden="true" />
      {count > 0 && (
        <span className="font-numeric absolute -right-0.5 -top-0.5 min-w-5 rounded-sm bg-teal px-1 text-center text-[11px] leading-5 text-milk">{count}</span>
      )}
    </Link>
  );
}
