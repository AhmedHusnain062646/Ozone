// ABOUTME: Read-side catalog queries (cards, detail, categories, reviews) plus wishlist and review writes.
// ABOUTME: A product is visible only if it is published AND its seller is active; every query applies that predicate.
import { and, asc, desc, eq, exists, gte, ilike, lte, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../db/client.ts';
import * as s from '../db/schema.ts';

export type Sort = 'newest' | 'price_asc' | 'price_desc' | 'rating';
export interface ListFilter {
  q?: string;
  category?: string;
  seller?: string;
  minPrice?: number;
  maxPrice?: number;
  sort: Sort;
  page: number;
  pageSize: number;
  wishlistUserId?: string;
}

const visible = and(eq(s.products.isPublished, true), eq(s.sellers.status, 'active'));
const fromPrice = sql<number>`${s.products.basePriceCents} + coalesce((select min(v.price_delta_cents) from variants v where v.product_id = ${s.products.id}), 0)`;
const available = sql<number>`coalesce((select sum(v.stock - v.reserved) from variants v where v.product_id = ${s.products.id}), 0)::int`;
const ratingAvg = sql<number | null>`(select avg(r.rating)::float from reviews r where r.product_id = ${s.products.id})`;
const reviewCount = sql<number>`(select count(*)::int from reviews r where r.product_id = ${s.products.id})`;
const firstImage = sql<string | null>`(select i.url from product_images i where i.product_id = ${s.products.id} order by i.position, i.id limit 1)`;

const escapeLike = (v: string) => v.replace(/[\\%_]/g, '\\$&');

function conditions(f: Partial<ListFilter>): SQL | undefined {
  const parts: (SQL | undefined)[] = [visible];
  if (f.q) {
    const pattern = `%${escapeLike(f.q)}%`;
    parts.push(or(ilike(s.products.title, pattern), ilike(s.products.shortDescription, pattern), ilike(s.products.description, pattern)));
  }
  if (f.category) parts.push(eq(s.categories.slug, f.category));
  if (f.seller) parts.push(eq(s.sellers.slug, f.seller));
  if (f.minPrice !== undefined) parts.push(gte(fromPrice, f.minPrice));
  if (f.maxPrice !== undefined) parts.push(lte(fromPrice, f.maxPrice));
  if (f.wishlistUserId) {
    parts.push(exists(db.select({ one: sql`1` }).from(s.wishlistItems).where(and(eq(s.wishlistItems.productId, s.products.id), eq(s.wishlistItems.userId, f.wishlistUserId)))));
  }
  return and(...parts);
}

const orderBy = (sort: Sort) => {
  switch (sort) {
    case 'price_asc': return [asc(fromPrice), asc(s.products.id)];
    case 'price_desc': return [desc(fromPrice), asc(s.products.id)];
    case 'rating': return [sql`${ratingAvg} desc nulls last`, desc(s.products.createdAt), asc(s.products.id)];
    default: return [desc(s.products.createdAt), asc(s.products.id)];
  }
};

const cardColumns = {
  id: s.products.id,
  slug: s.products.slug,
  title: s.products.title,
  shortDescription: s.products.shortDescription,
  limitedEdition: s.products.limitedEdition,
  lowStockThreshold: s.products.lowStockThreshold,
  fromPriceCents: fromPrice,
  available,
  rating: ratingAvg,
  reviewCount,
  image: firstImage,
  categorySlug: s.categories.slug,
  categoryName: s.categories.name,
  sellerId: s.sellers.id,
  sellerSlug: s.sellers.slug,
  sellerName: s.sellers.name,
  sellerVerified: s.sellers.verified,
};

export async function listProducts(f: ListFilter) {
  const base = db
    .select(cardColumns)
    .from(s.products)
    .innerJoin(s.sellers, eq(s.sellers.id, s.products.sellerId))
    .innerJoin(s.categories, eq(s.categories.id, s.products.categoryId))
    .where(conditions(f));
  const items = await base.orderBy(...orderBy(f.sort)).limit(f.pageSize).offset((f.page - 1) * f.pageSize);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.products)
    .innerJoin(s.sellers, eq(s.sellers.id, s.products.sellerId))
    .innerJoin(s.categories, eq(s.categories.id, s.products.categoryId))
    .where(conditions(f));
  return { items, total: n };
}

export async function findVisibleProductBySlug(slug: string) {
  const [row] = await db
    .select({
      ...cardColumns,
      description: s.products.description,
      material: s.products.material,
      origin: s.products.origin,
      basePriceCents: s.products.basePriceCents,
      sellerTagline: s.sellers.tagline,
      sellerLocation: s.sellers.location,
      sellerBanner: s.sellers.bannerDescription,
    })
    .from(s.products)
    .innerJoin(s.sellers, eq(s.sellers.id, s.products.sellerId))
    .innerJoin(s.categories, eq(s.categories.id, s.products.categoryId))
    .where(and(visible, eq(s.products.slug, slug)));
  return row;
}

export const findVisibleProductById = async (id: string) => {
  const [row] = await db
    .select({ id: s.products.id })
    .from(s.products)
    .innerJoin(s.sellers, eq(s.sellers.id, s.products.sellerId))
    .where(and(visible, eq(s.products.id, id)));
  return row;
};

export const listImages = (productId: string) =>
  db.select({ id: s.productImages.id, url: s.productImages.url }).from(s.productImages).where(eq(s.productImages.productId, productId)).orderBy(asc(s.productImages.position), asc(s.productImages.id));

export const listVariants = (productId: string) =>
  db.select().from(s.variants).where(eq(s.variants.productId, productId)).orderBy(asc(s.variants.priceDeltaCents), asc(s.variants.id));

export async function listCategories() {
  return db
    .select({
      id: s.categories.id,
      slug: s.categories.slug,
      name: s.categories.name,
      description: s.categories.description,
      productCount: sql<number>`(select count(*)::int from products p join sellers sl on sl.id = p.seller_id where p.category_id = "categories"."id" and p.is_published and sl.status = 'active')`,
    })
    .from(s.categories)
    // The subquery above must qualify categories.id by hand: Drizzle omits the table prefix in single-table selects.
    .orderBy(asc(s.categories.name));
}

/** True when the buyer owns a sub-order containing this product that is currently DELIVERED. */
export async function hasDeliveredPurchase(buyerId: string, productId: string): Promise<boolean> {
  const r = await db.execute(sql`
    select 1 from order_items oi
    join sub_orders so on so.id = oi.sub_order_id
    join orders o on o.id = so.order_id
    where oi.product_id = ${productId} and o.buyer_id = ${buyerId} and so.status = 'DELIVERED' limit 1`);
  return r.rows.length > 0;
}

export async function hasReviewed(buyerId: string, productId: string): Promise<boolean> {
  const [row] = await db.select({ id: s.reviews.id }).from(s.reviews).where(and(eq(s.reviews.buyerId, buyerId), eq(s.reviews.productId, productId)));
  return !!row;
}

export async function listReviews(productId: string) {
  const r = await db.execute(sql`
    select r.id, u.display_name as "buyerName", r.rating, r.title, r.comment, r.created_at as "createdAt",
      exists (select 1 from order_items oi join sub_orders so on so.id = oi.sub_order_id join orders o on o.id = so.order_id
              where oi.product_id = r.product_id and o.buyer_id = r.buyer_id and so.status = 'DELIVERED') as "verifiedPurchase"
    from reviews r join users u on u.id = r.buyer_id
    where r.product_id = ${productId} order by r.created_at desc, r.id`);
  return r.rows as { id: string; buyerName: string; rating: number; title: string; comment: string; createdAt: string | Date; verifiedPurchase: boolean }[];
}

export async function insertReview(v: typeof s.reviews.$inferInsert) {
  const [row] = await db.insert(s.reviews).values(v).returning();
  return row;
}

export const addWishlist = (userId: string, productId: string) =>
  db.insert(s.wishlistItems).values({ userId, productId }).onConflictDoNothing();

export const removeWishlist = (userId: string, productId: string) =>
  db.delete(s.wishlistItems).where(and(eq(s.wishlistItems.userId, userId), eq(s.wishlistItems.productId, productId)));
