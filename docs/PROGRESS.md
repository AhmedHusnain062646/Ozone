STATUS: IN_PROGRESS

# Progress log

## Iteration 1 (setup)
- `git init`, baseline commit eed248a, branch `feat/full-stack`. Result: `git log --oneline` shows eed248a.
- `docker compose version` -> v2.39.2-desktop.1 (exit 0).
- Baseline: `npm install` OK (258 packages, 0 vulnerabilities); `npm run lint` exit 0; `npm run build` exit 0 (vite 8.3.6, TypeScript 7.0.2).
- Installed approved dependencies via npm (0 vulnerabilities reported). Argon2 library: `argon2`. Session store: `connect-pg-simple`.

## Iteration 1, M1 server, database, schema, migrations, seed, test harness (DONE)
Changed: `docker-compose.yml` (postgres:16 on host port 5433, dev + test DBs), `.env.example`, Drizzle schema (17 tables) + migrations `0000_init`, `0001_hardening` (append-only ledger trigger, session table), `server/` skeleton (config, db client, error envelope, zod `validate`, pino, helmet, health route), seed ported from `mockData.ts`, vitest harness with `_test` DB guard, Vite `/api` proxy (HMR block untouched), npm scripts (`dev`, `build`, `lint`, `test`, `db:migrate`, `db:seed`; `test:e2e` arrives in M10 with Playwright config).
Commands run and results:
- `docker compose up -d` then `psql \l`: `ozone_dev` and `ozone_test` exist; `show timezone` = Etc/UTC. (First pull timed out reaching Docker Hub; retry succeeded.)
- `npx tsx server/db/migrate.ts`: "migrations applied"; `\dt` lists 17 tables.
- `npm run db:seed`: seeded 1 admin, 2 buyers, 6 sellers, 6 products, 3 orders; ledger balances reconcile (Vane 352275 credits - 150000 payout = 202275 cents).
- `npx vitest run`: 5 files, 28 tests passed. Red-first evidence: money and app/validate tests failed with "Cannot find module" before implementation. Schema-invariant tests were written after the schema existed, so I mutation-checked them: dropping `variants_reserved_le_stock` and the ledger trigger made 4 tests fail; restoring both made all 11 pass again.
- `npm run lint` exit 0; `npm run build` exit 0.
- Booted `tsx server/index.ts`: `GET /api/health` 200 `{"status":"ok","database":"up"}`; `GET /api/nope` returns the NOT_FOUND envelope.
Not yet verified: `npm run dev` end to end (port 3000 is held by an unrelated `gowa` process, PID 1041; not touched); README clean-clone steps (M10).
Next: M2 auth and role checks.

## Iteration 1, M2 auth and role checks (DONE)
Changed: `server/http/{session,auth,origin,async-handler}.ts`, `server/routes/auth.ts`, `server/services/auth.ts`, `server/repositories/users.ts`, `server/lib/password.ts`, `createApp(opts)` wiring (session, origin check, auth router with rate limit), `TRUST_PROXY` config.
Commands run and results:
- `npx vitest run server/tests/auth.test.ts` before implementation: "Cannot find module '../http/auth.ts'" (red). After: 18 passed.
- Mutation check: removing `session.regenerate` and the origin check made exactly the fixation test and the CSRF_ORIGIN test fail (2 failed, 16 passed); restored, all pass.
- `npm run lint` exit 0 (after fixing an argon2 option typing error), `npx vitest run` 6 files / 46 tests passed, `npm run build` exit 0.
- Live smoke on the dev DB (`tsx server/index.ts`, curl): seeded `vane@ozone.test` login 200 with `HttpOnly; SameSite=Lax` cookie (no Secure over http, as intended); `/api/auth/me` returns role seller + sellerId; forged `Origin: https://evil.example` POST returns 403 CSRF_ORIGIN; wrong password returns 401 INVALID_CREDENTIALS.
Covered by tests: register/login/logout/me, duplicate email 409 (case-insensitive), argon2id storage, strict body rejects forged role, session rotation, logout destroys session, deleted user with live cookie is signed out, requireRole 401/403/200, Secure cookie under HTTPS proxy header, 429 envelope after the limit.
Not covered: rate limiter shared state across processes; seller "apply" flow (M8); Secure cookie in a real production deploy (only simulated via X-Forwarded-Proto).
Next: M3 UI foundation (tokens, primitives, router, API client).
- Correction (iteration 2): the M1 tick in iteration 1 also ticked M10 by regex accident; M10 is unticked and not started.

## Iteration 2, M3 UI foundation (DONE)
Changed: `@theme` tokens in `src/index.css`; typed API client `src/lib/api.ts` (+ `types`, `format`, `cx`, `auth` hooks); 12 primitives in `src/components/ui/` (Button, Input, Select, Badge, Card, Modal, Drawer, Table, Tabs, Toast, Skeleton, EmptyState/ErrorState, plus SafeImage, QueryBoundary, useFocusTrap); router + app root; Header, Footer, AppLayout, status pages, routed `AuthenticationModal` (sign-in/register only; fake biometric and prefilled identities removed); Storefront reduced to a hero (module-imported image) until M4; Playwright config + `e2e/foundation.spec.ts`; Vite proxy target via `API_PROXY_TARGET`.
Commands and results:
- `npm run lint` exit 0; `npx vitest run` 46 passed; `npm run build` exit 0 (hero emitted as hashed asset `ozone_hero_luxury_living_*.jpg`).
- `npm run test:e2e`: first run 4 failed (2 were my selector hitting the footer's second "Sign in" link; 2 were a real bug: `qc.clear()` orphaned the header's `me` observer so the UI never showed the signed-in state). After the fix: 5 passed (hero loads with naturalWidth>0; modal focus trap over 12 Tab presses + Esc closes; wrong password shows inline error then seeded buyer signs in, survives reload, signs out; register signs in as buyer; unknown route shows not-found).
Not yet verified: contrast/axe and responsive checks (M10); screens other than auth are still prototype files orphaned from the router.
Next: M4 catalog, wishlist, reviews.

## Iteration 2, M4 catalog, wishlist, reviews (DONE)
Changed: `server/repositories|services|routes` for catalog (`/api/catalog/products|products/:slug|categories`), wishlist (`/api/wishlist`), reviews (`POST /api/products/:productId/reviews`); frontend Storefront (URL-driven search/category/sort/price/pagination), ProductCard, routed ProductDetailModal (+ review form), ProductPurchasePanel (variant picker; add-to-cart lands in M5), WishlistView; API client + types + wishlist hooks.
Commands and results:
- Tests first: 18 new server tests failed (404s / missing routes) before implementation. After: `npx vitest run` 8 files / 64 tests passed. One 500 (categories subquery unqualified column) and one test-teardown bug (afterAll inside the first describe) found and fixed along the way.
- Mutation check on the review rule: replacing `so.status = 'DELIVERED'` with `true` failed "rejects a buyer with no purchase, or a purchase that is not DELIVERED yet"; restored, 9/9 pass. (A first attempt with GNU-only `sed 0,/re/` silently did nothing on macOS and wrongly showed 9/9; redone with a verified edit.)
- `npm run lint` exit 0; `npm run build` exit 0; `npm run test:e2e` 13 passed (catalog e2e: 8 new, covering seeded list of 6 with the pending atelier hidden, server-side search/category/sort in URL, empty state + Clear filters, product modal deep link and Esc keeping filters, unknown slug error state, wishlist redirect/save/list/remove, wishlist route guard, review by the seeded buyer with a delivered purchase).
Not covered: pagination UI at >12 products (server pagination is unit-tested; seed has 6); axe/responsive (M10).
Next: M5 cart and reservations.

## Iteration 2, M5 cart and reservations (DONE)
Changed: `server/repositories/{inventory,cart}.ts`, `server/services/{cart,reservations}.ts`, `server/routes/cart.ts`, lazy release wired into catalog reads, sweeper started in `server/index.ts`; frontend cart hooks, `CartDrawer` (routed `/cart`, atelier-grouped lines, steppers, hold countdown), header `CartButton`, reserve action in the product panel.
Commands and results:
- Tests first: `cart.test.ts` failed with "Cannot find module '../services/reservations.ts'" before implementation; after: 16 passed, full `npx vitest run` 9 files / 80 tests passed.
- Acceptance test inside `cart.test.ts`: 20 parallel reservations of a stock-1 variant from 20 signed-in users -> exactly 1 x 201 and 19 x 409 INVENTORY_CONFLICT; afterwards stock=1, reserved=1, one cart line. Also: 10 parallel adds by one user with stock 3 -> 3 successes, 7 conflicts, reserved=3; mixed add/delete/get storm keeps `reserved` = sum(cart lines) and within [0, stock].
- Mutation check: changing the reserve guard to compare against 0 instead of `qty` made 4 tests fail (conflict, accumulate/patch, 20-parallel, same-user parallel); restored, all pass.
- Expiry: lazy release via GET /cart, via catalog detail (availability restored), an expired hold no longer blocks another buyer, 8 concurrent `releaseExpiredHolds` release exactly 3 lines in total, and the sweeper clears an expired hold on its own.
- `npm run lint` exit 0 (after typing the sweeper default param), `npm run build` exit 0, `npm run test:e2e` 17 passed (4 new: sign-in redirect returning to the product; reserve with ~10:00 countdown, server-priced $1,240.00, stepper and removal; cart survives a brand-new browser context; two real browser contexts racing for the last unit, loser sees "Just taken" and then "Sold out").
Not covered: hold-expiry countdown reaching 0 in the browser (server side is tested; waiting 10 minutes in e2e is impractical).
Next: M6 checkout, idempotency, split orders, ledger.

## Iteration 2, M6 checkout, idempotency, split orders, ledger (DONE)
Changed: `server/payments/provider.ts`, `repositories/orders.ts`, `services/{checkout,orders}.ts`, `routes/checkout.ts` (`POST /api/checkout`, `GET /api/orders`, `GET /api/orders/:code`); UI: routed 3-step `CheckoutModal` (address, Sandbox payment, review split by atelier), `OrderTrackingView` (+ detail with per-atelier cards and timeline), status mapping, API client and hooks.
Commands and results:
- Tests first: 17 checkout tests failed (404 routes) before implementation; after: `npx vitest run` 10 files / 97 tests passed (one test fixed because it wrongly read a field buyers must not see).
- Acceptance coverage in `checkout.test.ts`: same key twice -> 201 then 200 + `Idempotent-Replay`, one order/ledger row, stock decremented once; 8 concurrent same-key submissions -> exactly one 201 and seven 200, one order, one sub-order, one ledger row; buyer reading another buyer's order -> 403 FORBIDDEN, owner 200, admin 200 (with financials), anonymous 401, unknown 404; two-seller cart -> 1 order / 2 sub-orders with per-seller commission snapshots (10% and 8.5%, 33300 -> 2831 commission), gross = commission + net on every sub-order and ledger row, later rate change does not alter the snapshot; decline -> 402 and nothing written (cart + hold intact, retry succeeds); expired hold -> 409 HOLD_EXPIRED; unpublished item -> 409 ITEM_UNAVAILABLE; COD -> PLACED / PENDING_COD / ledger pending; forged totals or `cardNumber` -> 400.
- Mutation check: removing the advisory lock + in-lock re-check failed exactly "8 concurrent submissions ... exactly one order"; restored, 17/17 pass.
- `npm run lint` 0, `npm run build` 0, `npm run test:e2e` 20 passed / exit 0 (3 new: new buyer buys from Nordic Fine Foundry + Atelier Vane in one checkout with a double-click on Place order -> URL /orders/OZ-..., one order heading, two sub-order regions, $1,100.00, one "2 parcels" row; declined sandbox payment shows inline alert then approve succeeds; address validation and no card-number fields). An e2e assertion exposed an a11y defect (sub-order card had aria-label without a role); fixed with role="region".
- A mid-gate run showed 2 spurious e2e failures caused by a stale Playwright run of mine sharing the `_test` DB; killed only my own PIDs and the clean rerun passed.
Not covered: lifecycle actions on orders (M7); multi-quantity cross-seller race at checkout.
Next: M7 order lifecycle, cancel, return, refund.

## Iteration 2, M7 order lifecycle, cancel, return, refund (DONE)
Changed: `server/domain/order-state.ts`, `repositories/lifecycle.ts`, `services/lifecycle.ts`, `routes/lifecycle.ts` (`POST /api/sub-orders/:code/transitions`, `/return-decision`); UI: `OrderActions` (cancel + return modals) on the order detail.
Commands and results:
- Red first: both new test files failed with "Cannot find module order-state.ts"; after implementation `npx vitest run` 12 files / 117 tests passed.
- Covered: the generated set of ALL illegal (from, to) pairs (81 minus legal edges) each returns 409 ILLEGAL_TRANSITION and leaves the row unchanged; seller isolation 403; buyer/seller/admin role rules; tracking required for SHIPPED; every event records the session actor; cancel restores stock and the ledger nets to zero (gross, commission, net); 5 concurrent cancels -> one 200, four 409, one refund_debit, stock restored once; COD pending until DELIVERED then settled, COD cancel stays pending and nets to zero; return needs a reason; approve -> REFUNDED with exact `refund_debit` negation and restock; reject -> DELIVERED unchanged; return decision admin-only and not repeatable; a refund in a two-seller order leaves the other parcel and parent PAID.
- Mutation checks: removing `FOR UPDATE` failed the concurrent-cancel test; removing the ledger reversal on cancel failed 3 tests. Both restored; 117/117.
- `npm run lint` 0, `npm run build` 0, `npm run test:e2e` 22 passed / exit 0 (2 new: cancel one parcel of a two-atelier order leaves the other live; return request requires a reason and shows "Return requested").
Not covered yet: the admin approval UI and the ship/return/refund e2e through real consoles (M8/M9).
Next: M8 seller console and M9 admin console.
