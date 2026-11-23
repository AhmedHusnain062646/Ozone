// ABOUTME: Routed product detail (/products/:slug): gallery, provenance, variants with live availability, reviews.
// ABOUTME: Review form appears only when the server says the viewer can review (delivered purchase, not yet reviewed).
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Star } from 'lucide-react';
import { api } from '../../lib/api.ts';
import { formatDate, formatMoney } from '../../lib/format.ts';
import { cx } from '../../lib/cx.ts';
import { Badge, Button, Input, Modal, QueryBoundary, SafeImage, useToast } from '../ui/index.ts';
import type { ProductDetailData } from '../../lib/types.ts';
import { ProductPurchasePanel } from './ProductPurchasePanel.tsx';

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cx('h-4 w-4', n <= Math.round(value) ? 'fill-gold text-gold' : 'text-linen-strong')} aria-hidden="true" />
      ))}
    </span>
  );
}

function ReviewForm({ product }: { product: ProductDetailData }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const mutation = useMutation({
    mutationFn: (v: { title: string; comment: string }) => api.reviews.create(product.id, { rating, ...v }),
    onSuccess: async () => {
      toast.success('Thank you', 'Your review has been published.');
      await qc.invalidateQueries({ queryKey: ['product', product.slug] });
      await qc.invalidateQueries({ queryKey: ['catalog'] });
    },
    onError: (e) => toast.error('Could not publish review', e.message),
  });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    mutation.mutate({ title: String(f.get('title') ?? ''), comment: String(f.get('comment') ?? '') });
  };
  return (
    <form onSubmit={submit} className="mt-6 space-y-4 border border-linen p-4" aria-label="Write a review">
      <h4 className="font-display text-xl">Write a review</h4>
      <fieldset>
        <legend className="label-caps mb-1 text-sage">Rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="peer sr-only" />
              <span className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-linen-strong peer-checked:border-teal peer-checked:bg-teal peer-checked:text-milk peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-teal">
                {n}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Input name="title" label="Title" required maxLength={120} />
      <div>
        <label htmlFor="review-comment" className="label-caps mb-1 block text-sage">Comment</label>
        <textarea id="review-comment" name="comment" required maxLength={2000} rows={4} className="w-full rounded-sm border border-linen-strong bg-milk p-4 focus:border-teal focus:outline-none" />
      </div>
      <Button type="submit" loading={mutation.isPending}>Publish review</Button>
    </form>
  );
}

function Detail({ product }: { product: ProductDetailData }) {
  const [active, setActive] = useState(0);
  const image = product.images[active];
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <div className="aspect-[4/5] overflow-hidden border border-linen bg-linen">
          <SafeImage src={image?.url} alt={`${product.title}, view ${active + 1}`} className="h-full w-full object-cover" />
        </div>
        {product.images.length > 1 && (
          <div className="mt-3 flex gap-2" role="group" aria-label="Product images">
            {product.images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show image ${i + 1}`}
                aria-pressed={i === active}
                className={cx('h-16 w-14 overflow-hidden border', i === active ? 'border-teal' : 'border-linen')}
              >
                <SafeImage src={img.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={product.seller.verified ? 'gold' : 'neutral'}>{product.seller.name}</Badge>
          {product.limitedEdition && <Badge>Limited edition</Badge>}
        </div>
        <p className="text-sm text-sage">{product.seller.location} · {product.seller.tagline}</p>
        {product.rating !== null && (
          <p className="flex items-center gap-2 text-sm">
            <Stars value={product.rating} />
            <span className="font-numeric">{product.rating.toFixed(2)}</span>
            <span className="text-sage">({product.reviewCount} {product.reviewCount === 1 ? 'review' : 'reviews'})</span>
          </p>
        )}
        <p className="leading-7">{product.description}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="label-caps text-sage">Material</dt>
          <dd>{product.material}</dd>
          <dt className="label-caps text-sage">Origin</dt>
          <dd>{product.origin}</dd>
        </dl>
        <ProductPurchasePanel product={product} />
      </div>
      <section className="md:col-span-2" aria-labelledby="reviews-heading">
        <h3 id="reviews-heading" className="font-display text-2xl">Reviews</h3>
        {product.reviews.length === 0 ? (
          <p className="mt-2 text-sm text-sage">No reviews yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-linen border-y border-linen">
            {product.reviews.map((r) => (
              <li key={r.id} className="py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Stars value={r.rating} />
                  <span className="font-semibold">{r.title}</span>
                  {r.verifiedPurchase && <Badge tone="success">Verified purchase</Badge>}
                </div>
                <p className="mt-1 text-sm">{r.comment}</p>
                <p className="mt-1 text-xs text-sage">{r.buyerName} · {formatDate(r.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
        {product.viewer.canReview && <ReviewForm product={product} />}
      </section>
    </div>
  );
}

export function ProductDetailModal() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const query = useQuery({ queryKey: ['product', slug], queryFn: () => api.catalog.detail(slug), retry: false });
  const from = (location.state as { from?: string } | null)?.from ?? '';
  const close = () => navigate({ pathname: '/', search: from });
  return (
    <Modal open onClose={close} title={query.data?.title ?? 'Product'} size="lg">
      <QueryBoundary query={query}>{(p) => <Detail product={p} />}</QueryBoundary>
      <span className="sr-only">{query.data ? formatMoney(query.data.fromPriceCents) : ''}</span>
    </Modal>
  );
}
