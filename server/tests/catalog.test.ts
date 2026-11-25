// ABOUTME: Public catalog contract: visibility rules, server-side search/filter/sort/pagination, detail by slug.
// ABOUTME: Unpublished products and products of non-active sellers must never leak.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../app.ts';
import { closeDb, db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { makeSeller, makeVariant, resetDb } from './helpers.ts';

const app = createApp();
const list = (q = '') => request(app).get(`/api/catalog/products${q}`);

async function product(opts: { title: string; price: number; sellerId?: string; published?: boolean; category?: string; stock?: number }) {
  const seller = opts.sellerId ?? (await makeSeller()).seller.id;
  const { product, variant } = await makeVariant({ stock: opts.stock ?? 3, sellerId: seller, basePriceCents: opts.price });
  const patch: Partial<typeof s.products.$inferInsert> = { title: opts.title, isPublished: opts.published ?? true };
  if (opts.category) {
    const [c] = await db.insert(s.categories).values({ slug: opts.category, name: opts.category }).onConflictDoNothing().returning();
    const cat = c ?? (await db.select().from(s.categories).where(eq(s.categories.slug, opts.category)))[0];
    patch.categoryId = cat.id;
  }
  await db.update(s.products).set(patch).where(eq(s.products.id, product.id));
  return { product: { ...product, ...patch } as typeof product, variant };
}

describe('catalog', () => {
  beforeEach(resetDb);
  afterAll(closeDb);

  it('is public (no sign-in) and lists only published products of active sellers', async () => {
    const pending = await makeSeller(1000, 'pending_approval');
    await product({ title: 'Visible', price: 10000 });
    await product({ title: 'Draft', price: 10000, published: false });
    await product({ title: 'Pending seller item', price: 10000, sellerId: pending.seller.id });
    const res = await list();
    expect(res.status).toBe(200);
    expect(res.body.data.items.map((i: { title: string }) => i.title)).toEqual(['Visible']);
    expect(res.body.data.total).toBe(1);
  });

  it('searches title and description case-insensitively and treats % and _ literally', async () => {
    await product({ title: 'Travertine Vessel', price: 100 });
    await product({ title: 'Bronze Sconce', price: 100 });
    await product({ title: '100% Linen', price: 100 });
    expect((await list('?q=TRAVER')).body.data.items).toHaveLength(1);
    expect((await list('?q=%25')).body.data.items.map((i: { title: string }) => i.title)).toEqual(['100% Linen']);
    expect((await list('?q=nothing-matches')).body.data.items).toHaveLength(0);
  });

  it('filters by category slug, seller slug and price range (cents)', async () => {
    const a = await makeSeller();
    await product({ title: 'A1', price: 5000, sellerId: a.seller.id, category: 'interiors' });
    await product({ title: 'B1', price: 90000, category: 'fashion' });
    expect((await list('?category=fashion')).body.data.items.map((i: { title: string }) => i.title)).toEqual(['B1']);
    expect((await list(`?seller=${a.seller.slug}`)).body.data.items.map((i: { title: string }) => i.title)).toEqual(['A1']);
    expect((await list('?minPrice=10000')).body.data.items.map((i: { title: string }) => i.title)).toEqual(['B1']);
    expect((await list('?maxPrice=10000')).body.data.items.map((i: { title: string }) => i.title)).toEqual(['A1']);
  });

  it('sorts by price both ways', async () => {
    await product({ title: 'Mid', price: 500 });
    await product({ title: 'Low', price: 100 });
    await product({ title: 'High', price: 900 });
    const titles = async (sort: string) => (await list(`?sort=${sort}`)).body.data.items.map((i: { title: string }) => i.title);
    expect(await titles('price_asc')).toEqual(['Low', 'Mid', 'High']);
    expect(await titles('price_desc')).toEqual(['High', 'Mid', 'Low']);
  });

  it('paginates server-side with a stable total', async () => {
    for (let i = 1; i <= 5; i++) await product({ title: `P${i}`, price: i * 100 });
    const p1 = (await list('?sort=price_asc&pageSize=2&page=1')).body.data;
    const p3 = (await list('?sort=price_asc&pageSize=2&page=3')).body.data;
    expect(p1).toMatchObject({ total: 5, page: 1, pageSize: 2, pageCount: 3 });
    expect(p1.items.map((i: { title: string }) => i.title)).toEqual(['P1', 'P2']);
    expect(p3.items.map((i: { title: string }) => i.title)).toEqual(['P5']);
  });

  it('rejects bad query parameters with the validation envelope', async () => {
    const res = await list('?pageSize=500&sort=bogus');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('reports "from" price including the cheapest variant delta, and availability = stock - reserved', async () => {
    const { product: p, variant } = await product({ title: 'Edition', price: 1000, stock: 5 });
    await db.update(s.variants).set({ priceDeltaCents: 250, reserved: 2 }).where(eq(s.variants.id, variant.id));
    const item = (await list()).body.data.items.find((i: { id: string }) => i.id === p.id);
    expect(item.fromPriceCents).toBe(1250);
    expect(item.available).toBe(3);
  });

  describe('detail', () => {
    it('returns variants with price and availability, seller and images; 404 for drafts', async () => {
      const { product: p, variant } = await product({ title: 'Detail Me', price: 2000, stock: 4 });
      await db.insert(s.productImages).values({ productId: p.id, url: '/seed-images/x.jpg' });
      await db.update(s.variants).set({ priceDeltaCents: 500, reserved: 1 }).where(eq(s.variants.id, variant.id));
      const res = await request(app).get(`/api/catalog/products/${p.slug}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ title: 'Detail Me', images: [{ url: '/seed-images/x.jpg' }] });
      expect(res.body.data.variants[0]).toMatchObject({ id: variant.id, priceCents: 2500, available: 3 });
      expect(res.body.data.seller.name).toBeTruthy();

      const draft = await product({ title: 'Draft', price: 1, published: false });
      expect((await request(app).get(`/api/catalog/products/${draft.product.slug}`)).status).toBe(404);
      expect((await request(app).get('/api/catalog/products/does-not-exist')).status).toBe(404);
    });
  });

  it('lists categories with the count of visible products', async () => {
    await product({ title: 'A', price: 1, category: 'interiors' });
    await product({ title: 'B', price: 1, category: 'interiors' });
    await product({ title: 'C', price: 1, category: 'fashion', published: false });
    const res = await request(app).get('/api/catalog/categories');
    const by = Object.fromEntries(res.body.data.map((c: { slug: string; productCount: number }) => [c.slug, c.productCount]));
    expect(by).toMatchObject({ interiors: 2, fashion: 0 });
  });
});
