// ABOUTME: Home route: hero, then the catalog with server-side search, filters, sort and pagination driven by the URL.
// ABOUTME: <Outlet/> hosts the routed modals (sign-in, product detail, cart, checkout) above the catalog.
import { useEffect, useState, type FormEvent } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Outlet, useSearchParams } from 'react-router';
import hero from '../../assets/images/ozone_hero_luxury_living_1794146207794.jpg';
import { api } from '../../lib/api.ts';
import type { CatalogSort } from '../../lib/types.ts';
import { Button, EmptyState, Input, QueryBoundary, Select, Skeleton } from '../ui/index.ts';
import { ProductCard } from './ProductCard.tsx';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price, low to high' },
  { value: 'price_desc', label: 'Price, high to low' },
  { value: 'rating', label: 'Highest rated' },
];
const PAGE_SIZE = 12;

const toCents = (dollars: string) => (dollars.trim() === '' || Number.isNaN(Number(dollars)) ? undefined : Math.round(Number(dollars) * 100));

export function Storefront() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const sort = (params.get('sort') ?? 'newest') as CatalogSort;
  const minPrice = params.get('minPrice') ? Number(params.get('minPrice')) : undefined;
  const maxPrice = params.get('maxPrice') ? Number(params.get('maxPrice')) : undefined;
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);

  const [searchText, setSearchText] = useState(q);
  useEffect(() => setSearchText(q), [q]);

  const update = (patch: Record<string, string | undefined>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
        if (!('page' in patch)) next.delete('page');
        return next;
      },
      { replace: true },
    );

  const categories = useQuery({ queryKey: ['categories'], queryFn: api.catalog.categories, staleTime: 5 * 60_000 });
  const products = useQuery({
    queryKey: ['catalog', { q, category, sort, minPrice, maxPrice, page }],
    queryFn: ({ signal }) => api.catalog.list({ q, category, sort, minPrice, maxPrice, page, pageSize: PAGE_SIZE }, signal),
    placeholderData: keepPreviousData,
  });

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    update({ q: searchText.trim() || undefined });
  };
  const filtersActive = !!(q || category || minPrice !== undefined || maxPrice !== undefined);

  return (
    <>
      <section className="relative isolate overflow-hidden bg-graphite">
        <img src={hero} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60" />
        <div className="mx-auto max-w-[1440px] px-margin py-20 text-bone md:px-16 md:py-32">
          <p className="label-caps text-mint">Independent ateliers · Limited editions</p>
          <h1 className="mt-4 max-w-3xl font-display text-[38px] leading-[44px] md:text-[64px] md:leading-[72px]">
            Objects made slowly, by hands you can name.
          </h1>
        </div>
      </section>

      <section aria-labelledby="collection-heading" className="mx-auto max-w-[1440px] px-margin py-12 md:px-16">
        <h2 id="collection-heading" className="font-display text-[28px] leading-9 md:text-[40px] md:leading-[48px]">
          The collection
        </h2>

        <form role="search" onSubmit={onSearch} className="mt-8 grid gap-4 md:grid-cols-[2fr_1fr_1fr_auto_auto] md:items-end">
          <Input label="Search" type="search" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Travertine, bronze, linen…" />
          <Select
            label="Category"
            value={category}
            onChange={(e) => update({ category: e.target.value || undefined })}
            options={[{ value: '', label: 'All works' }, ...(categories.data ?? []).map((c) => ({ value: c.slug, label: `${c.name} (${c.productCount})` }))]}
          />
          <Select label="Sort" value={sort} onChange={(e) => update({ sort: e.target.value === 'newest' ? undefined : e.target.value })} options={SORTS} />
          <Input
            label="Min price ($)"
            inputMode="numeric"
            defaultValue={minPrice !== undefined ? String(minPrice / 100) : ''}
            key={`min-${minPrice}`}
            onBlur={(e) => {
              const c = toCents(e.target.value);
              if (c !== minPrice) update({ minPrice: c === undefined ? undefined : String(c) });
            }}
            className="md:w-32"
          />
          <Input
            label="Max price ($)"
            inputMode="numeric"
            defaultValue={maxPrice !== undefined ? String(maxPrice / 100) : ''}
            key={`max-${maxPrice}`}
            onBlur={(e) => {
              const c = toCents(e.target.value);
              if (c !== maxPrice) update({ maxPrice: c === undefined ? undefined : String(c) });
            }}
            className="md:w-32"
          />
          <Button type="submit" className="md:hidden">Search</Button>
        </form>

        <div className="mt-8" aria-live="polite">
          <QueryBoundary
            query={products}
            isEmpty={(d) => d.items.length === 0}
            empty={{
              title: 'No works match your search',
              message: 'Try a different term or clear the filters.',
              action: filtersActive ? (
                <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>
                  Clear filters
                </Button>
              ) : undefined,
            }}
            skeleton={
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton key={i} className="aspect-[4/5]" />
                ))}
              </div>
            }
          >
            {(data) => (
              <>
                <p className="mb-4 text-sm text-sage">
                  {data.total} {data.total === 1 ? 'work' : 'works'}
                </p>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {data.items.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
                {data.pageCount > 1 && (
                  <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-4">
                    <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
                      Previous
                    </Button>
                    <span className="text-sm text-sage">
                      Page {data.page} of {data.pageCount}
                    </span>
                    <Button variant="secondary" size="sm" disabled={page >= data.pageCount} onClick={() => update({ page: String(page + 1) })}>
                      Next
                    </Button>
                  </nav>
                )}
              </>
            )}
          </QueryBoundary>
        </div>
        {products.isError && !products.data && <EmptyState title="The collection is unavailable" />}
      </section>
      <Outlet />
    </>
  );
}
