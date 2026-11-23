// ABOUTME: /wishlist: the signed-in user's saved works as catalog tiles, with loading, empty and error states.
// ABOUTME: Requires sign-in via the router's RequireRole wrapper.
import { Link } from 'react-router';
import { useWishlist } from '../../lib/wishlist.ts';
import { QueryBoundary } from '../ui/index.ts';
import { ProductCard } from './ProductCard.tsx';

export function WishlistView() {
  const wishlist = useWishlist();
  return (
    <section className="mx-auto max-w-[1440px] px-margin py-12 md:px-16" aria-labelledby="wishlist-heading">
      <h1 id="wishlist-heading" className="font-display text-[28px] leading-9 md:text-[40px] md:leading-[48px]">Wishlist</h1>
      <div className="mt-8">
        <QueryBoundary
          query={wishlist}
          isEmpty={(d) => d.length === 0}
          empty={{
            title: 'Nothing saved yet',
            message: 'Tap the heart on any work to keep it here.',
            action: (
              <Link to="/" className="label-caps text-teal underline underline-offset-4">
                Browse the collection
              </Link>
            ),
          }}
        >
          {(items) => (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </QueryBoundary>
      </div>
    </section>
  );
}
