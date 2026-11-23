# Ozone build plan

- [x] M1 server, database, schema, migrations, seed ported from mockData.ts, test harness
- [x] M2 auth and role checks
- [x] M3 UI foundation: tokens, primitives, router, API client
- [x] M4 catalog, wishlist, reviews
- [x] M5 cart and reservations
- [x] M6 checkout, idempotency, split orders, ledger
- [x] M7 order lifecycle, cancel, return, refund
- [ ] M8 seller console
- [ ] M9 admin console and Concurrency Lab
- [ ] M10 end-to-end tests, accessibility and responsive pass, README

## Acceptance checklist (from the original brief)
- [ ] README steps (`docker compose up -d`, `npm install`, `npm run db:migrate`, `npm run db:seed`, `npm run dev`) start API and web from a clean clone.
- [ ] `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` all exit 0.
- [ ] `grep -rn "alert(\|localStorage" src/` empty for business data; no hardcoded order/seller/user IDs in `src/`.
- [ ] Test: 20 parallel reservations on stock-1 variant -> exactly 1 success, 19 `INVENTORY_CONFLICT`; stock/reserved never negative.
- [ ] Test: same idempotency key twice, including concurrently -> exactly one order.
- [ ] Tests: every illegal transition 409; seller cannot read/change another seller's products or sub-orders; buyer cannot read another buyer's orders (403).
- [ ] Tests: gross = commission + net per sub-order; refund reverses the sale exactly; payout above available balance rejected.
- [ ] E2E: buyer registers, buys from two ateliers in one checkout, sees one parent order with two sub-orders.
- [ ] E2E: seller packs and ships with tracking; buyer requests return; admin approves; ledger shows `refund_debit`.
- [ ] E2E: seller applies, admin approves, seller publishes a product, it appears in the storefront.
- [ ] Playwright at 375/768/1440px: no horizontal scroll; axe no serious/critical on storefront, product, cart, checkout, orders, seller, admin.
- [ ] Data survives a server restart and a cleared browser.
