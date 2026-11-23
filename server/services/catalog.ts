// ABOUTME: Catalog use-cases: shape cards and detail DTOs, wishlist toggles, and the review rules.
// ABOUTME: Review rule: only after a DELIVERED purchase of that product, once per buyer; identity from the session.
import { HttpError, conflict, forbidden, notFound } from '../http/errors.ts';
import * as repo from '../repositories/catalog.ts';
import type { ListFilter } from '../repositories/catalog.ts';

type Card = Awaited<ReturnType<typeof repo.listProducts>>['items'][number];

const round2 = (n: number | null) => (n === null ? null : Math.round(n * 100) / 100);

function toCard(c: Card) {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    shortDescription: c.shortDescription,
    limitedEdition: c.limitedEdition,
    fromPriceCents: Number(c.fromPriceCents),
    available: Number(c.available),
    lowStock: Number(c.available) > 0 && Number(c.available) <= c.lowStockThreshold,
    rating: round2(c.rating),
    reviewCount: Number(c.reviewCount),
    image: c.image,
    category: { slug: c.categorySlug, name: c.categoryName },
    seller: { id: c.sellerId, slug: c.sellerSlug, name: c.sellerName, verified: c.sellerVerified },
  };
}

export async function listCatalog(filter: ListFilter) {
  const { items, total } = await repo.listProducts(filter);
  return { items: items.map(toCard), total, page: filter.page, pageSize: filter.pageSize, pageCount: Math.max(1, Math.ceil(total / filter.pageSize)) };
}

export const listCategories = () => repo.listCategories();

export async function productDetail(slug: string, viewerId: string | undefined) {
  const p = await repo.findVisibleProductBySlug(slug);
  if (!p) throw notFound('Product not found');
  const [images, variants, reviews] = await Promise.all([repo.listImages(p.id), repo.listVariants(p.id), repo.listReviews(p.id)]);
  const [delivered, reviewed] = viewerId
    ? await Promise.all([repo.hasDeliveredPurchase(viewerId, p.id), repo.hasReviewed(viewerId, p.id)])
    : [false, false];
  return {
    ...toCard(p),
    description: p.description,
    material: p.material,
    origin: p.origin,
    seller: { ...toCard(p).seller, tagline: p.sellerTagline, location: p.sellerLocation, banner: p.sellerBanner },
    images,
    variants: variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      priceCents: p.basePriceCents + v.priceDeltaCents,
      available: Math.max(0, v.stock - v.reserved),
    })),
    reviews: reviews.map((r) => ({ ...r, createdAt: new Date(r.createdAt).toISOString() })),
    viewer: { canReview: !!viewerId && delivered && !reviewed, hasReviewed: reviewed },
  };
}

export async function listWishlist(userId: string, page = 1, pageSize = 48) {
  const { items } = await repo.listProducts({ sort: 'newest', page, pageSize, wishlistUserId: userId });
  return items.map(toCard);
}

async function requireVisibleProduct(productId: string) {
  if (!(await repo.findVisibleProductById(productId))) throw notFound('Product not found');
}

export async function addToWishlist(userId: string, productId: string) {
  await requireVisibleProduct(productId);
  await repo.addWishlist(userId, productId);
}

export const removeFromWishlist = (userId: string, productId: string) => repo.removeWishlist(userId, productId);

const isUnique = (e: unknown) => ((e as { cause?: { code?: string } }).cause?.code ?? (e as { code?: string }).code) === '23505';

export async function addReview(buyerId: string, productId: string, input: { rating: number; title: string; comment: string }) {
  await requireVisibleProduct(productId);
  if (!(await repo.hasDeliveredPurchase(buyerId, productId))) {
    throw new HttpError(403, 'REVIEW_REQUIRES_DELIVERED_PURCHASE', 'You can review a product once your purchase has been delivered');
  }
  if (await repo.hasReviewed(buyerId, productId)) throw conflict('ALREADY_REVIEWED', 'You have already reviewed this product');
  try {
    return await repo.insertReview({ productId, buyerId, ...input });
  } catch (err) {
    if (isUnique(err)) throw conflict('ALREADY_REVIEWED', 'You have already reviewed this product');
    throw err;
  }
}

export { forbidden };
