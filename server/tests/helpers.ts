// ABOUTME: Test fixtures: wipe all tables and create minimal users/sellers/products on the test database.
// ABOUTME: Only ever imported by tests; config.ts selects the _test database when NODE_ENV=test.
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client.ts';
import * as s from '../db/schema.ts';

export async function resetDb(): Promise<void> {
  // ledger_entries has a delete-blocking trigger; TRUNCATE bypasses row triggers.
  await db.execute(sql`TRUNCATE TABLE
    payment_intents, status_events, ledger_entries, order_items, sub_orders, orders,
    cart_items, wishlist_items, reviews, product_images, variants, products, categories,
    sellers, settings, users, "session" RESTART IDENTITY CASCADE`);
}

let counter = 0;
const uniq = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

export async function makeUser(role: 'buyer' | 'seller' | 'admin' = 'buyer') {
  const n = uniq();
  const [u] = await db
    .insert(s.users)
    .values({ email: `${role}-${n}@test.local`, passwordHash: 'x', displayName: `${role} ${n}`, role })
    .returning();
  return u;
}

export async function makeSeller(commissionBps = 1000, status: 'active' | 'pending_approval' = 'active') {
  const user = await makeUser('seller');
  const n = uniq();
  const [seller] = await db
    .insert(s.sellers)
    .values({ userId: user.id, slug: `atelier-${n}`, name: `Atelier ${n}`, commissionBps, status })
    .returning();
  return { user, seller };
}

export async function makeVariant(opts: { stock: number; sellerId?: string; basePriceCents?: number }) {
  const sellerId = opts.sellerId ?? (await makeSeller()).seller.id;
  const n = uniq();
  const [cat] = await db
    .insert(s.categories)
    .values({ slug: `cat-${n}`, name: `Cat ${n}` })
    .returning();
  const [product] = await db
    .insert(s.products)
    .values({
      slug: `prod-${n}`,
      sellerId,
      categoryId: cat.id,
      title: `Product ${n}`,
      basePriceCents: opts.basePriceCents ?? 10000,
      isPublished: true,
    })
    .returning();
  const [variant] = await db
    .insert(s.variants)
    .values({ productId: product.id, name: 'Std', sku: `SKU-${n}`, stock: opts.stock })
    .returning();
  return { product, variant, sellerId };
}

/** Inserts a one-line order for `buyerId` whose sub-order is already in `status` (default DELIVERED). */
export async function makePurchase(
  buyerId: string,
  item: { product: { id: string; sellerId: string; title: string }; variant: { id: string; name: string; sku: string } },
  status: typeof s.subOrders.$inferInsert.status = 'DELIVERED',
) {
  const n = uniq();
  const [order] = await db
    .insert(s.orders)
    .values({ code: `OZ-T-${n}`, buyerId, paymentMethod: 'sandbox_card', paymentStatus: 'PAID', totalCents: 10000, idempotencyKey: `k-${n}`, shippingAddress: {} })
    .returning();
  const [sub] = await db
    .insert(s.subOrders)
    .values({ code: `OZ-T-${n}-A`, orderId: order.id, sellerId: item.product.sellerId, status, subtotalCents: 10000, commissionBps: 1000, commissionCents: 1000, netCents: 9000 })
    .returning();
  await db.insert(s.orderItems).values({
    subOrderId: sub.id, productId: item.product.id, variantId: item.variant.id,
    productTitle: item.product.title, variantName: item.variant.name, sku: item.variant.sku,
    unitPriceCents: 10000, quantity: 1, subtotalCents: 10000,
  });
  return { order, sub };
}

export const TEST_PASSWORD = 'correct horse battery';

/** Creates a buyer and returns a supertest agent that is signed in as them. */
export async function signedInAgent(app: import('express').Express, role: 'buyer' | 'seller' | 'admin' = 'buyer') {
  const { default: request } = await import('supertest');
  const { hashPassword } = await import('../lib/password.ts');
  const user = await makeUser(role);
  await db.update(s.users).set({ passwordHash: await hashPassword(TEST_PASSWORD) }).where(eq(s.users.id, user.id));
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email: user.email, password: TEST_PASSWORD });
  if (res.status !== 200) throw new Error(`test login failed: ${res.status}`);
  return { agent, user };
}
