// ABOUTME: Seller console commands and read models: products, variants, images, order queue, ledger, balance, payouts.
// ABOUTME: Rules enforced here: only active sellers publish/withdraw; stock never below reserved; payouts never exceed settled balance.
import { eq } from 'drizzle-orm';
import { db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import type { AuthContext } from '../http/auth.ts';
import { HttpError, conflict, forbidden, notFound } from '../http/errors.ts';
import { logger } from '../http/logger.ts';
import * as inventory from '../repositories/inventory.ts';
import * as repo from '../repositories/seller.ts';
import { sniffImage, type ImageStorage } from '../storage/image-storage.ts';

const isUnique = (e: unknown) => ((e as { cause?: { code?: string } }).cause?.code ?? (e as { code?: string }).code) === '23505';
const slugify = (v: string) => v.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'piece';

export function requireSellerId(a: AuthContext): string {
  if (!a.sellerId) throw forbidden('This account has no atelier');
  return a.sellerId;
}

async function sellerRow(sellerId: string) {
  const [row] = await db.select().from(s.sellers).where(eq(s.sellers.id, sellerId));
  if (!row) throw notFound('Atelier not found');
  return row;
}
async function requireActive(sellerId: string) {
  const row = await sellerRow(sellerId);
  if (row.status !== 'active') throw new HttpError(403, 'SELLER_NOT_ACTIVE', 'Your atelier is awaiting approval or suspended');
  return row;
}

export async function getProfile(sellerId: string) {
  const r = await sellerRow(sellerId);
  return { id: r.id, name: r.name, slug: r.slug, tagline: r.tagline, location: r.location, status: r.status, verified: r.verified, commissionBps: r.commissionBps };
}

type ProductGraph = Awaited<ReturnType<typeof repo.loadProducts>>[number];
export const toProductDto = (p: ProductGraph) => ({
  id: p.id, slug: p.slug, title: p.title, categoryId: p.categoryId, basePriceCents: p.basePriceCents,
  shortDescription: p.shortDescription, description: p.description, material: p.material, origin: p.origin,
  limitedEdition: p.limitedEdition, lowStockThreshold: p.lowStockThreshold, isPublished: p.isPublished,
  images: p.images.map((i) => ({ id: i.id, url: i.url, position: i.position })),
  variants: p.variants.map((v) => ({ id: v.id, name: v.name, sku: v.sku, priceDeltaCents: v.priceDeltaCents, stock: v.stock, reserved: v.reserved })),
});

export async function listProducts(sellerId: string) {
  await inventory.releaseExpired(db); // so "reserved" shown to the seller is not inflated by lapsed holds
  return (await repo.loadProducts(db, sellerId)).map(toProductDto);
}

async function ownedProduct(sellerId: string, id: string) {
  const [p] = await repo.loadProducts(db, sellerId, id);
  if (!p) throw notFound('Product not found');
  return p;
}

export interface VariantInput { name: string; sku: string; priceDeltaCents: number; stock: number }
export interface ProductInput {
  title: string; categoryId: string; basePriceCents: number; shortDescription?: string; description?: string; material?: string; origin?: string;
  limitedEdition?: boolean; lowStockThreshold?: number; variants: VariantInput[];
}

export async function createProduct(sellerId: string, input: ProductInput) {
  if (!(await repo.categoryExists(db, input.categoryId))) throw new HttpError(422, 'CATEGORY_NOT_FOUND', 'Choose an existing category');
  try {
    const id = await db.transaction(async (tx) => {
      const [p] = await tx.insert(s.products).values({
        sellerId, slug: `${slugify(input.title)}-${Math.random().toString(36).slice(2, 7)}`, categoryId: input.categoryId, title: input.title,
        basePriceCents: input.basePriceCents, shortDescription: input.shortDescription ?? '', description: input.description ?? '',
        material: input.material ?? '', origin: input.origin ?? '', limitedEdition: input.limitedEdition ?? false,
        lowStockThreshold: input.lowStockThreshold ?? 2, isPublished: false,
      }).returning();
      await tx.insert(s.variants).values(input.variants.map((v) => ({ ...v, productId: p.id })));
      return p.id;
    });
    logger.info({ sellerId, productId: id }, 'product created');
    return toProductDto(await ownedProduct(sellerId, id));
  } catch (e) {
    if (isUnique(e)) throw conflict('SKU_TAKEN', 'A variant with this SKU already exists');
    throw e;
  }
}

export type ProductPatch = Partial<Omit<ProductInput, 'variants'>> & { isPublished?: boolean };

export async function updateProduct(sellerId: string, id: string, patch: ProductPatch) {
  await ownedProduct(sellerId, id);
  if (patch.isPublished === true) await requireActive(sellerId); // unpublishing is always allowed
  if (patch.categoryId && !(await repo.categoryExists(db, patch.categoryId))) throw new HttpError(422, 'CATEGORY_NOT_FOUND', 'Choose an existing category');
  if (Object.keys(patch).length) await db.update(s.products).set(patch).where(eq(s.products.id, id));
  logger.info({ sellerId, productId: id, fields: Object.keys(patch) }, 'product updated');
  return toProductDto(await ownedProduct(sellerId, id));
}

export async function addVariant(sellerId: string, productId: string, v: VariantInput) {
  await ownedProduct(sellerId, productId);
  try {
    const [row] = await db.insert(s.variants).values({ ...v, productId }).returning();
    return { id: row.id, name: row.name, sku: row.sku, priceDeltaCents: row.priceDeltaCents, stock: row.stock, reserved: row.reserved };
  } catch (e) {
    if (isUnique(e)) throw conflict('SKU_TAKEN', 'A variant with this SKU already exists');
    throw e;
  }
}

export async function updateVariant(sellerId: string, variantId: string, patch: { name?: string; priceDeltaCents?: number; stock?: number }) {
  return db.transaction(async (tx) => {
    if (!(await repo.findOwnedVariant(tx, sellerId, variantId))) throw notFound('Variant not found');
    await inventory.releaseExpired(tx);
    if (!(await inventory.lockVariant(tx, variantId))) throw notFound('Variant not found');
    const [cur] = await tx.select().from(s.variants).where(eq(s.variants.id, variantId));
    if (patch.stock !== undefined && patch.stock < cur.reserved) {
      throw conflict('STOCK_BELOW_RESERVED', `${cur.reserved} unit(s) are held in carts; stock cannot go below that`, { reserved: cur.reserved });
    }
    const [row] = await tx.update(s.variants).set(patch).where(eq(s.variants.id, variantId)).returning();
    return { id: row.id, name: row.name, sku: row.sku, priceDeltaCents: row.priceDeltaCents, stock: row.stock, reserved: row.reserved };
  });
}

const MAX_IMAGES = 8;
export async function addImage(storage: ImageStorage, sellerId: string, productId: string, bytes: Buffer) {
  const p = await ownedProduct(sellerId, productId);
  const ext = sniffImage(bytes);
  if (!ext) throw new HttpError(415, 'UNSUPPORTED_IMAGE', 'Upload a PNG, JPEG or WebP image');
  if (p.images.length >= MAX_IMAGES) throw conflict('TOO_MANY_IMAGES', `A product can have at most ${MAX_IMAGES} images`);
  const { url } = await storage.save(bytes, ext);
  const [row] = await db.insert(s.productImages).values({ productId, url, position: p.images.length }).returning();
  return { id: row.id, url: row.url, position: row.position };
}

export async function removeImage(storage: ImageStorage, sellerId: string, productId: string, imageId: string) {
  const p = await ownedProduct(sellerId, productId);
  const img = p.images.find((i) => i.id === imageId);
  if (!img) throw notFound('Image not found');
  await db.delete(s.productImages).where(eq(s.productImages.id, imageId));
  if (img.url.startsWith('/uploads/')) await storage.remove(img.url); // seeded/remote URLs are not ours to delete
}

export async function listOrders(sellerId: string) {
  return (await repo.listOrderRows(db, sellerId)).map((r) => ({
    id: r.so.id, code: r.so.code, orderCode: r.orderCode, createdAt: r.createdAt.toISOString(), status: r.so.status,
    paymentMethod: r.paymentMethod, shipTo: r.shippingAddress, trackingNumber: r.so.trackingNumber, returnReason: r.so.returnReason,
    subtotalCents: r.so.subtotalCents, commissionCents: r.so.commissionCents, netCents: r.so.netCents,
    items: r.items.map((i) => ({ productTitle: i.productTitle, variantName: i.variantName, sku: i.sku, quantity: i.quantity, unitPriceCents: i.unitPriceCents })),
  }));
}

export const getBalance = (sellerId: string) => repo.balance(db, sellerId);

export async function getLedger(sellerId: string) {
  return (await repo.ledgerRows(db, sellerId)).map((r) => ({
    id: r.e.id, createdAt: r.e.createdAt.toISOString(), type: r.e.type, status: r.e.status, orderCode: r.orderCode,
    grossCents: r.e.grossCents, commissionCents: r.e.commissionCents, netCents: r.e.netCents,
  }));
}

const dollars = (cents: number) => `${cents < 0 ? '-' : ''}${Math.trunc(Math.abs(cents) / 100)}.${String(Math.abs(cents) % 100).padStart(2, '0')}`;
/** Spreadsheet apps execute cells that start with = + - @; text cells get a leading apostrophe. */
const text = (v: string) => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export async function ledgerCsv(sellerId: string) {
  const rows = await getLedger(sellerId);
  const lines = rows.map((r) => [r.createdAt.slice(0, 10), text(r.type), text(r.status), text(r.orderCode ?? ''), dollars(r.grossCents), dollars(r.commissionCents), dollars(r.netCents)].map(csvCell).join(','));
  return ['date,type,status,order,gross,commission,net', ...lines].join('\n') + '\n';
}

export async function requestPayout(sellerId: string, amountCents: number) {
  await requireActive(sellerId);
  return db.transaction(async (tx) => {
    await repo.lockSeller(tx, sellerId); // serialises payouts per seller so two requests cannot both spend the same balance
    const bal = await repo.balance(tx, sellerId);
    if (amountCents > bal.availableCents) {
      throw new HttpError(422, 'INSUFFICIENT_BALANCE', 'The payout is more than your available balance', { availableCents: bal.availableCents, requestedCents: amountCents });
    }
    const [row] = await tx.insert(s.ledgerEntries).values({
      sellerId, type: 'payout_disbursement', grossCents: -amountCents, commissionCents: 0, netCents: -amountCents, status: 'disbursed',
    }).returning();
    logger.info({ sellerId, amountCents, ledgerId: row.id }, 'payout disbursed');
    return { id: row.id, amountCents, balance: await repo.balance(tx, sellerId) };
  });
}

export async function summary(sellerId: string) {
  return { ...(await repo.salesTotals(db, sellerId)), balance: await repo.balance(db, sellerId), lowStock: await repo.lowStock(db, sellerId) };
}
