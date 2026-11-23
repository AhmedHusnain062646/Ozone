// ABOUTME: Wire types for the Ozone API (money in integer cents, ids are uuids, dates are ISO UTC strings).
// ABOUTME: Mirrors server responses; the API client is the only module that should construct them.

export type UserRole = 'buyer' | 'seller' | 'admin';

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  sellerId: string | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface ProductCardData {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  limitedEdition: boolean;
  fromPriceCents: number;
  available: number;
  lowStock: boolean;
  rating: number | null;
  reviewCount: number;
  image: string | null;
  category: { slug: string; name: string };
  seller: { id: string; slug: string; name: string; verified: boolean };
}

export interface Review {
  id: string;
  buyerName: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  verifiedPurchase: boolean;
}

export interface ProductVariantData {
  id: string;
  name: string;
  sku: string;
  priceCents: number;
  available: number;
}

export interface ProductDetailData extends ProductCardData {
  description: string;
  material: string;
  origin: string;
  seller: ProductCardData['seller'] & { tagline: string; location: string; banner: string };
  images: { id: string; url: string }[];
  variants: ProductVariantData[];
  reviews: Review[];
  viewer: { canReview: boolean; hasReviewed: boolean };
}

export interface CategoryData {
  id: string;
  slug: string;
  name: string;
  description: string;
  productCount: number;
}

export type CatalogSort = 'newest' | 'price_asc' | 'price_desc' | 'rating';
export interface CatalogQuery {
  q?: string;
  category?: string;
  seller?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
}

export interface CartLine {
  variantId: string;
  productId: string;
  slug: string;
  title: string;
  variantName: string;
  sku: string;
  image: string | null;
  seller: { id: string; name: string };
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  expiresAt: string;
  purchasable: boolean;
}

export interface CartData {
  lines: CartLine[];
  subtotalCents: number;
  expiresAt: string | null;
  serverTime: string;
}
