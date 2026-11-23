// ABOUTME: Seeds the dev/test database from the prototype data (sellers, catalog, orders, ledger).
// ABOUTME: Refuses non-_dev/_test databases; re-run with --reset to wipe and reseed. Passwords come from SEED_USER_PASSWORD.
import argon2 from 'argon2';
import { sql } from 'drizzle-orm';
import { db, closeDb, type Tx } from './client.ts';
import * as s from './schema.ts';
import { INITIAL_PRODUCTS, INITIAL_SELLERS } from './seed-data.ts';
import { splitCommission } from '../lib/money.ts';

const cents = (dollars: number) => Math.round(dollars * 100);
const bps = (rate: number) => Math.round(rate * 10000);
const img = (url: string) => url.replace('/src/assets/images/', '/seed-images/');
const day = (iso: string) => new Date(iso);

const CATEGORIES = [
  ['interiors', 'Interiors', 'Stone, bronze and ceramic objects for the considered home'],
  ['fashion', 'Fashion', 'Wild-spun linen, flax and sanctuary wear'],
  ['timepieces', 'Timepieces', 'Titanium chronometers and architectural movements'],
  ['fragrance', 'Fragrance', 'Small-batch botanical compositions'],
  ['art-objects', 'Art & Objects', 'Sculptural and collectible works'],
  ['audio', 'Audio', 'Hand-built listening instruments'],
] as const;
const categorySlug: Record<string, string> = {
  Interiors: 'interiors', Fashion: 'fashion', Timepieces: 'timepieces',
  Fragrance: 'fragrance', 'Art & Objects': 'art-objects', Audio: 'audio',
};

// Reviewer accounts exist only so seeded reviews satisfy the buyer FK.
const PROTOTYPE_ORDERS = [
  {
    code: 'OZ-2025-98421', buyer: 'sterling', createdAt: '2025-10-24T09:42:00Z', method: 'sandbox_card' as const,
    address: { fullName: 'Julian Sterling', street: '742 Evergreen Terrace, Residence 4B', city: 'San Francisco', state: 'CA', postalCode: '94102', country: 'United States' },
    subs: [
      { code: 'SUB-AV-9021', seller: 'seller-vane', product: 'prod-vane-01', variant: 'var-v01-raw', qty: 1, status: 'SHIPPED' as const, tracking: 'OZ-KY-8820 (Kyoto Customs Cleared)',
        history: [['PLACED','2025-10-24T09:42:00Z','Collector (Julian Sterling)','buyer','Master acquisition authenticated.'],['PAID','2025-10-24T09:43:00Z','Ozone Treasury Protocol #TR-9941','buyer','Escrow funds locked.'],['PACKED','2025-10-25T14:10:00Z','Atelier Vane','seller','Wax seal and hallmarking affixed.'],['SHIPPED','2025-10-26T08:30:00Z','Atelier Vane','seller','Crated and transferred to freight #OZ-KY-8820.']] },
      { code: 'SUB-MS-4819', seller: 'seller-silt', product: 'prod-silt-01', variant: 'var-s01-s2', qty: 1, status: 'DELIVERED' as const, tracking: 'MS-FEDEX-NORMANDY-4819',
        history: [['PLACED','2025-10-24T09:42:00Z','Collector (Julian Sterling)','buyer',null],['PAID','2025-10-24T09:43:00Z','Ozone Treasury Escrow','buyer',null],['PACKED','2025-10-25T11:00:00Z','Maison Silt','seller',null],['SHIPPED','2025-10-25T16:40:00Z','Maison Silt','seller',null],['DELIVERED','2025-10-27T11:15:00Z','Maison Silt','seller','Signed and sealed by concierge.']] },
    ],
  },
  {
    code: 'OZ-2025-9112', buyer: 'dupont', createdAt: '2025-10-18T14:20:00Z', method: 'sandbox_card' as const,
    address: { fullName: 'M. Dupont', street: '14 Rue de Bellechasse', city: 'Paris', state: 'IDF', postalCode: '75007', country: 'France' },
    subs: [
      { code: 'DIS-9921', seller: 'seller-silt', product: 'prod-silt-01', variant: 'var-s01-s2', qty: 1, status: 'RETURN_REQUESTED' as const, tracking: 'FR-RET-9921-SILT',
        returnReason: 'Sizing variance (+4cm hem from sizing codex)',
        history: [['PLACED','2025-10-18T14:20:00Z','Collector (M. Dupont)','buyer',null],['PAID','2025-10-18T14:21:00Z','Sandbox gateway','buyer',null],['PACKED','2025-10-19T09:00:00Z','Maison Silt','seller',null],['SHIPPED','2025-10-19T14:00:00Z','Maison Silt','seller',null],['DELIVERED','2025-10-21T16:00:00Z','Maison Silt','seller',null],['RETURN_REQUESTED','2025-10-23T11:00:00Z','Collector (M. Dupont)','buyer','Sizing variance (+4cm hem).']] },
    ],
  },
  {
    code: 'OZ-2025-8910', buyer: 'sterling', createdAt: '2025-10-18T10:00:00Z', method: 'ozone_escrow' as const,
    address: { fullName: 'Julian Sterling', street: '742 Evergreen Terrace, Residence 4B', city: 'San Francisco', state: 'CA', postalCode: '94102', country: 'United States' },
    subs: [
      { code: 'SUB-AV-8910', seller: 'seller-vane', product: 'prod-vane-02', variant: 'var-v02-std', qty: 5, status: 'DELIVERED' as const, tracking: 'OZ-KY-8910',
        history: [['PLACED','2025-10-18T10:00:00Z','Collector (Julian Sterling)','buyer',null],['PAID','2025-10-18T10:01:00Z','Ozone Escrow','buyer',null],['PACKED','2025-10-19T10:00:00Z','Atelier Vane','seller',null],['SHIPPED','2025-10-20T10:00:00Z','Atelier Vane','seller',null],['DELIVERED','2025-10-24T10:00:00Z','Atelier Vane','seller',null]] },
    ],
  },
];

async function seed(tx: Tx, password: string) {
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  const user = async (email: string, displayName: string, role: 'buyer' | 'seller' | 'admin') =>
    (await tx.insert(s.users).values({ email, displayName, role, passwordHash: hash }).returning())[0];

  await tx.insert(s.settings).values({ key: s.defaultFee.key, value: s.defaultFee.initial });
  await user('admin@ozone.test', 'Ozone Governance', 'admin');
  const buyers = {
    sterling: await user('julian.sterling@ozone.test', 'Julian Sterling', 'buyer'),
    dupont: await user('dupont@ozone.test', 'M. Dupont', 'buyer'),
  };

  const cats = new Map<string, string>();
  for (const [slug, name, description] of CATEGORIES) {
    cats.set(slug, (await tx.insert(s.categories).values({ slug, name, description }).returning())[0].id);
  }

  const sellerIds = new Map<string, string>();
  for (const m of INITIAL_SELLERS) {
    const slug = m.id.replace('seller-', '');
    const u = await user(`${slug}@ozone.test`, m.name, 'seller');
    const row = (await tx.insert(s.sellers).values({
      userId: u.id, slug, name: m.name, tagline: m.tagline, location: m.location,
      bannerDescription: m.bannerDescription, commissionBps: bps(m.commissionRate),
      status: m.status, verified: m.verifiedAtelier, joinedAt: day(m.joinedDate),
    }).returning())[0];
    sellerIds.set(m.id, row.id);
  }

  const productIds = new Map<string, string>();
  const variantIds = new Map<string, string>();
  let reviewer = 0;
  for (const m of INITIAL_PRODUCTS) {
    const p = (await tx.insert(s.products).values({
      slug: m.id.replace('prod-', ''), sellerId: sellerIds.get(m.sellerId)!,
      categoryId: cats.get(categorySlug[m.category])!, title: m.title,
      basePriceCents: cents(m.basePrice), shortDescription: m.shortDescription, description: m.description,
      material: m.material, origin: m.origin, limitedEdition: !!m.limitedEdition,
      lowStockThreshold: m.lowStockThreshold, isPublished: m.isPublished,
    }).returning())[0];
    productIds.set(m.id, p.id);
    await tx.insert(s.productImages).values(m.images.map((url, position) => ({ productId: p.id, url: img(url), position })));
    for (const v of m.variants) {
      const row = (await tx.insert(s.variants).values({
        productId: p.id, name: v.name, sku: v.sku, priceDeltaCents: cents(v.priceDelta), stock: v.stock,
      }).returning())[0];
      variantIds.set(v.id, row.id);
    }
    for (const r of m.reviews) {
      const u = await user(`reviewer${++reviewer}@ozone.test`, r.buyerName, 'buyer');
      await tx.insert(s.reviews).values({
        productId: p.id, buyerId: u.id, rating: r.rating, title: r.title, comment: r.comment, createdAt: day(r.date),
      });
    }
  }

  const productMeta = new Map(INITIAL_PRODUCTS.map((p) => [p.id, p]));
  for (const o of PROTOTYPE_ORDERS) {
    const lines = o.subs.map((sub) => {
      const prod = productMeta.get(sub.product)!;
      const variant = prod.variants.find((v) => v.id === sub.variant)!;
      const unit = cents(prod.basePrice + variant.priceDelta);
      return { sub, prod, variant, unit, subtotal: unit * sub.qty };
    });
    const total = lines.reduce((n, l) => n + l.subtotal, 0);
    const order = (await tx.insert(s.orders).values({
      code: o.code, buyerId: buyers[o.buyer as keyof typeof buyers].id, paymentMethod: o.method,
      paymentStatus: 'PAID', totalCents: total, idempotencyKey: `seed-${o.code}`,
      shippingAddress: o.address, createdAt: day(o.createdAt),
    }).returning())[0];

    for (const { sub, prod, variant, unit, subtotal } of lines) {
      const seller = INITIAL_SELLERS.find((x) => x.id === sub.seller)!;
      const rate = bps(seller.commissionRate);
      const { commissionCents, netCents } = splitCommission(subtotal, rate);
      const so = (await tx.insert(s.subOrders).values({
        code: sub.code, orderId: order.id, sellerId: sellerIds.get(sub.seller)!, status: sub.status,
        subtotalCents: subtotal, commissionBps: rate, commissionCents, netCents,
        trackingNumber: sub.tracking, returnReason: 'returnReason' in sub ? sub.returnReason : null,
        createdAt: day(o.createdAt),
      }).returning())[0];
      await tx.insert(s.orderItems).values({
        subOrderId: so.id, productId: productIds.get(sub.product)!, variantId: variantIds.get(sub.variant)!,
        productTitle: prod.title, variantName: variant.name, sku: variant.sku,
        unitPriceCents: unit, quantity: sub.qty, subtotalCents: subtotal,
      });
      await tx.insert(s.statusEvents).values(sub.history.map(([status, at, label, role, note]) => ({
        subOrderId: so.id, status: status as typeof sub.status, actorLabel: label as string,
        actorRole: role as 'buyer' | 'seller', note: note as string | null, createdAt: day(at as string),
      })));
      await tx.insert(s.ledgerEntries).values({
        sellerId: so.sellerId, orderId: order.id, subOrderId: so.id, type: 'sale_credit',
        grossCents: subtotal, commissionCents, netCents, status: 'settled', createdAt: day(o.createdAt),
      });
    }
  }

  // One historical payout, kept below Atelier Vane's settled balance ($3,522.75).
  await tx.insert(s.ledgerEntries).values({
    sellerId: sellerIds.get('seller-vane')!, type: 'payout_disbursement',
    grossCents: -150000, commissionCents: 0, netCents: -150000, status: 'disbursed',
    createdAt: day('2025-10-25T14:22:08Z'),
  });
}

async function main() {
  const dbName = new URL(process.env.NODE_ENV === 'test' ? process.env.TEST_DATABASE_URL! : process.env.DATABASE_URL!).pathname;
  if (!/_(dev|test)$/.test(dbName)) throw new Error(`Refusing to seed database "${dbName}": name must end in _dev or _test`);
  const password = process.env.SEED_USER_PASSWORD;
  if (!password || password.length < 8) throw new Error('SEED_USER_PASSWORD must be set (min 8 chars); see .env.example');

  const [{ n }] = (await db.execute(sql`select count(*)::int as n from users`)).rows as { n: number }[];
  if (n > 0) {
    if (!process.argv.includes('--reset')) {
      console.log(`Database already has ${n} users; pass --reset to wipe and reseed.`);
      return;
    }
    await db.execute(sql`TRUNCATE TABLE payment_intents, status_events, ledger_entries, order_items, sub_orders, orders,
      cart_items, wishlist_items, reviews, product_images, variants, products, categories, sellers, settings, users, "session" CASCADE`);
  }
  await db.transaction((tx) => seed(tx, password));
  console.log('seeded: 1 admin, 2 buyers, 6 sellers, 6 products, 3 orders (password from SEED_USER_PASSWORD)');
}

main().catch((e) => { console.error('seed failed', e); process.exitCode = 1; }).finally(closeDb);
