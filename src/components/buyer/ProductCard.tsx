// ABOUTME: Catalog tile: 4:5 editorial image, atelier name, mono price, scarcity notice, and a wishlist toggle.
// ABOUTME: The tile links to the routed product modal; the wishlist button sends signed-out users to sign-in.
import { BadgeCheck, Heart } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';
import { formatMoney } from '../../lib/format.ts';
import { useMe } from '../../lib/auth.tsx';
import { useToggleWishlist, useWishlist } from '../../lib/wishlist.ts';
import { cx } from '../../lib/cx.ts';
import type { ProductCardData } from '../../lib/types.ts';
import { SafeImage, useToast } from '../ui/index.ts';

export function ProductCard({ product }: { product: ProductCardData }) {
  const me = useMe();
  const wishlist = useWishlist();
  const toggle = useToggleWishlist();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const saved = !!wishlist.data?.some((p) => p.id === product.id);
  const soldOut = product.available === 0;

  const onHeart = () => {
    if (!me.data) {
      navigate(`/sign-in?next=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }
    toggle.mutate(
      { productId: product.id, saved },
      { onError: (e) => toast.error('Could not update wishlist', e.message) },
    );
  };

  return (
    <article className="group relative flex flex-col">
      <Link
        to={{ pathname: `/products/${product.slug}`, search: location.pathname === '/' ? location.search : '' }}
        state={{ from: location.pathname === '/' ? location.search : '' }}
        className="block"
      >
        <div className="aspect-[4/5] overflow-hidden bg-linen">
          <SafeImage src={product.image ?? undefined} alt="" className="h-full w-full object-cover transition-transform duration-[400ms] group-hover:scale-[1.02]" />
        </div>
        <div className="space-y-1 pt-3">
          <p className="flex flex-wrap items-center gap-1 text-xs text-sage">
            <span>{product.seller.name}</span>
            {product.seller.verified && (
              <>
                <BadgeCheck className="h-4 w-4 text-gold-ink" aria-hidden="true" />
                <span className="sr-only">Verified</span>
              </>
            )}
            {product.limitedEdition && <span>· Limited edition</span>}
          </p>
          <h3 className="font-display text-xl leading-snug">{product.title}</h3>
          <div className="flex items-baseline justify-between gap-2">
            <p className={cx('font-numeric text-base', product.limitedEdition ? 'text-gold-ink' : 'text-ink')}>
              {formatMoney(product.fromPriceCents)}
            </p>
            {(soldOut || product.lowStock) && (
              <p className={cx('text-xs', soldOut ? 'text-danger' : 'text-[#7a5410]')}>
                {soldOut ? 'Sold out' : `Only ${product.available} left`}
              </p>
            )}
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={onHeart}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${product.title} from wishlist` : `Save ${product.title} to wishlist`}
        className="absolute right-2 top-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-linen bg-milk/90 hover:border-ink"
      >
        <Heart className={cx('h-5 w-5', saved ? 'fill-danger text-danger' : 'text-ink')} aria-hidden="true" />
      </button>
    </article>
  );
}
