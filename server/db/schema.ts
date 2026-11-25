// ABOUTME: Drizzle schema for the Ozone marketplace (Postgres 16); money is integer minor units (cents).
// ABOUTME: Invariants (stock/reserved checks, idempotency uniqueness, append-only ledger) live in the DB.
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  boolean,
  primaryKey,
} from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['buyer', 'seller', 'admin']);
export const sellerStatus = pgEnum('seller_status', ['active', 'pending_approval', 'suspended']);
export const orderStatus = pgEnum('order_status', [
  'PLACED',
  'PAID',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'RETURN_REQUESTED',
  'RETURNED',
  'REFUNDED',
  'CANCELLED',
]);
export const paymentMethod = pgEnum('payment_method', ['sandbox_card', 'ozone_escrow', 'cod']);
export const paymentStatus = pgEnum('payment_status', ['PAID', 'PENDING_COD', 'REFUNDED']);
export const ledgerType = pgEnum('ledger_type', [
  'sale_credit',
  'refund_debit',
  'payout_disbursement',
]);
export const ledgerStatus = pgEnum('ledger_status', ['pending', 'settled', 'disbursed']);

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name').notNull(),
    role: userRole('role').notNull().default('buyer'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('users_email_lower_uq').on(sql`lower(${t.email})`)],
);

export const sellers = pgTable(
  'sellers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    tagline: text('tagline').notNull().default(''),
    location: text('location').notNull().default(''),
    bannerDescription: text('banner_description').notNull().default(''),
    commissionBps: integer('commission_bps').notNull(),
    status: sellerStatus('status').notNull().default('pending_approval'),
    verified: boolean('verified').notNull().default(false),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('sellers_user_uq').on(t.userId),
    check('sellers_commission_range', sql`${t.commissionBps} between 100 and 5000`),
  ],
);

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
});

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    sellerId: uuid('seller_id').notNull().references(() => sellers.id),
    categoryId: uuid('category_id').notNull().references(() => categories.id),
    title: text('title').notNull(),
    basePriceCents: integer('base_price_cents').notNull(),
    shortDescription: text('short_description').notNull().default(''),
    description: text('description').notNull().default(''),
    material: text('material').notNull().default(''),
    origin: text('origin').notNull().default(''),
    limitedEdition: boolean('limited_edition').notNull().default(false),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(2),
    isPublished: boolean('is_published').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    index('products_seller_idx').on(t.sellerId),
    index('products_category_idx').on(t.categoryId),
    check('products_price_nonneg', sql`${t.basePriceCents} >= 0`),
  ],
);

export const productImages = pgTable(
  'product_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    position: integer('position').notNull().default(0),
  },
  (t) => [index('product_images_product_idx').on(t.productId)],
);

export const variants = pgTable(
  'variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sku: text('sku').notNull().unique(),
    priceDeltaCents: integer('price_delta_cents').notNull().default(0),
    stock: integer('stock').notNull().default(0),
    reserved: integer('reserved').notNull().default(0),
  },
  (t) => [
    index('variants_product_idx').on(t.productId),
    check('variants_stock_nonneg', sql`${t.stock} >= 0`),
    check('variants_reserved_nonneg', sql`${t.reserved} >= 0`),
    check('variants_reserved_le_stock', sql`${t.reserved} <= ${t.stock}`),
  ],
);

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    buyerId: uuid('buyer_id').notNull().references(() => users.id),
    rating: integer('rating').notNull(),
    title: text('title').notNull(),
    comment: text('comment').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('reviews_one_per_buyer_product').on(t.productId, t.buyerId),
    check('reviews_rating_range', sql`${t.rating} between 1 and 5`),
  ],
);

export const wishlistItems = pgTable(
  'wishlist_items',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] })],
);

// A cart line IS the stock hold: `variants.reserved` includes sum(quantity) of unexpired lines.
export const cartItems = pgTable(
  'cart_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').notNull().references(() => variants.id),
    quantity: integer('quantity').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('cart_items_user_variant_uq').on(t.userId, t.variantId),
    index('cart_items_expires_idx').on(t.expiresAt),
    check('cart_items_qty_positive', sql`${t.quantity} > 0`),
  ],
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    buyerId: uuid('buyer_id').notNull().references(() => users.id),
    paymentMethod: paymentMethod('payment_method').notNull(),
    paymentStatus: paymentStatus('payment_status').notNull(),
    totalCents: integer('total_cents').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    shippingAddress: jsonb('shipping_address').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('orders_buyer_idempotency_uq').on(t.buyerId, t.idempotencyKey),
    index('orders_buyer_idx').on(t.buyerId),
  ],
);

export const subOrders = pgTable(
  'sub_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    orderId: uuid('order_id').notNull().references(() => orders.id),
    sellerId: uuid('seller_id').notNull().references(() => sellers.id),
    status: orderStatus('status').notNull(),
    subtotalCents: integer('subtotal_cents').notNull(),
    commissionBps: integer('commission_bps').notNull(),
    commissionCents: integer('commission_cents').notNull(),
    netCents: integer('net_cents').notNull(),
    trackingNumber: text('tracking_number'),
    returnReason: text('return_reason'),
    createdAt: createdAt(),
  },
  (t) => [
    index('sub_orders_order_idx').on(t.orderId),
    index('sub_orders_seller_idx').on(t.sellerId),
    check('sub_orders_split', sql`${t.subtotalCents} = ${t.commissionCents} + ${t.netCents}`),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subOrderId: uuid('sub_order_id').notNull().references(() => subOrders.id),
    productId: uuid('product_id').notNull().references(() => products.id),
    variantId: uuid('variant_id').notNull().references(() => variants.id),
    productTitle: text('product_title').notNull(),
    variantName: text('variant_name').notNull(),
    sku: text('sku').notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    quantity: integer('quantity').notNull(),
    subtotalCents: integer('subtotal_cents').notNull(),
  },
  (t) => [index('order_items_sub_order_idx').on(t.subOrderId)],
);

export const statusEvents = pgTable(
  'status_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subOrderId: uuid('sub_order_id').notNull().references(() => subOrders.id),
    status: orderStatus('status').notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id),
    actorRole: userRole('actor_role'),
    actorLabel: text('actor_label').notNull(),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [index('status_events_sub_order_idx').on(t.subOrderId)],
);

export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sellerId: uuid('seller_id').notNull().references(() => sellers.id),
    orderId: uuid('order_id').references(() => orders.id),
    subOrderId: uuid('sub_order_id').references(() => subOrders.id),
    type: ledgerType('type').notNull(),
    grossCents: integer('gross_cents').notNull(),
    commissionCents: integer('commission_cents').notNull(),
    netCents: integer('net_cents').notNull(),
    status: ledgerStatus('status').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index('ledger_seller_idx').on(t.sellerId),
    index('ledger_sub_order_idx').on(t.subOrderId),
    check('ledger_gross_split', sql`${t.grossCents} = ${t.commissionCents} + ${t.netCents}`),
  ],
);

export const paymentIntents = pgTable('payment_intents', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id),
  provider: paymentMethod('provider').notNull(),
  amountCents: integer('amount_cents').notNull(),
  reference: text('reference').notNull(),
  createdAt: createdAt(),
});

export const defaultFee = { key: 'default_commission_bps', initial: '850' } as const;
