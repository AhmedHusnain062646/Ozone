# Ozone: multi-vendor marketplace

A full-stack marketplace for limited-edition goods: buyers reserve stock and check out from several ateliers at once, ateliers run their own console, and platform admins govern fees, approvals and returns. Payments are a **sandbox** (no real money, no card data is ever collected).

- **Web:** React 19, Vite 8, Tailwind v4, react-router, TanStack Query
- **API:** Express 4 + TypeScript (tsx), zod, argon2id sessions in Postgres
- **Data:** Postgres 16, Drizzle ORM, SQL migrations (invariants live in the database: stock/reserved checks, append-only ledger, idempotency uniqueness)
- **Tests:** vitest + supertest (API and domain), Playwright + axe (browser flows, responsive, accessibility)

## Run it locally (clean clone)

Prerequisites: Node 20+ and Docker.

```bash
git clone <repo-url> ozone && cd ozone
npm install

cp .env.example .env
# put a real secret in SESSION_SECRET and a password in SEED_USER_PASSWORD:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

docker compose up -d --wait db   # Postgres 16 on localhost:5433 (creates ozone_dev and ozone_test); waits until it accepts connections
npm run db:migrate               # apply SQL migrations to ozone_dev
npm run db:seed                  # demo catalogue, accounts, orders and ledger
npm run dev                      # API on :4000, web on :3000
```

Open the URL Vite prints (normally http://localhost:3000; if the port is taken Vite picks the next free one). The browser talks to the API through Vite's `/api` proxy, so no CORS or extra config is needed.

No external API key is required. `.env` is git-ignored; never commit it.

### Seeded accounts

All seeded accounts use the password you set in `SEED_USER_PASSWORD`.

| Role | Email |
|---|---|
| Admin | `admin@ozone.test` |
| Buyer | `julian.sterling@ozone.test`, `dupont@ozone.test` |
| Seller (active) | `vane@ozone.test`, `silt@ozone.test`, `homage@ozone.test`, `kanso@ozone.test`, `nordic@ozone.test` |
| Seller (pending approval) | `kurogane@ozone.test` |

You can also register as a buyer, or use **Sell on Ozone** in the sign-in dialog to apply as an atelier (it starts as *pending approval* until an admin approves it in `/admin`).

## What to try

1. **Two-atelier checkout:** reserve pieces from two ateliers (a 10-minute hold starts), check out with the Sandbox card; the order splits into one parcel per atelier, each with its own commission snapshot.
2. **Lifecycle:** sign in as an atelier (`/seller`), pack and ship a parcel (tracking number required); as the buyer, request a return; as admin (`/admin`, Returns), approve it. The buyer is refunded, stock returns, and the atelier's ledger gets an exact reversal.
3. **Admin:** in `/admin` approve or suspend ateliers, change a commission (1% to 50%, applies to new orders only), manage categories, and run the **Concurrency Lab** (N parallel reservation requests with measured timings; it never oversells).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API (tsx watch) + web (Vite) together |
| `npm run build` | Production build of the web app into `dist/` |
| `npm start` | API only; with `NODE_ENV=production` it also serves `dist/` (cookies are `Secure`, so serve over HTTPS) |
| `npm run lint` | Type-check (`tsc --noEmit`) |
| `npm test` | vitest against the `ozone_test` database (migrated automatically) |
| `npm run test:e2e` | Playwright against its own API (:4100) and Vite (:3100) on `ozone_test`; reseeds it first |
| `npm run db:generate` / `db:migrate` / `db:seed` | Drizzle migration tooling and the seed (`-- --reset` wipes and reseeds a `_dev`/`_test` database) |

Before the first browser run, install the Playwright browser once: `npx playwright install chromium`.

`npm test` and `npm run test:e2e` share the `ozone_test` database: run them one after the other, not at the same time. Seeding refuses any database whose name does not end in `_dev` or `_test`.

## Rules the code enforces

- Money is integer cents; the platform commission is stored in basis points and snapshotted on every sub-order. `gross = commission + net`, always (also a database CHECK).
- Reservations are one conditional `UPDATE`; the last unit can only be won once. Holds last 10 minutes and are released lazily and by a 30 s sweeper.
- Checkout is one transaction with server-side pricing and an idempotency key unique per buyer: replaying a key returns the original order, concurrent replays create exactly one.
- The order state machine lives on the server (`server/domain/order-state.ts`); every transition is recorded with the actor from the session. Illegal transitions are `409`.
- The ledger is append-only (a database trigger rejects edits and deletes, except settling a pending entry). A seller's available balance is settled net minus payouts, and a payout above it is rejected.
- Sessions are HttpOnly, SameSite=Lax cookies backed by Postgres; roles are re-read from the database on every request. Browser storage holds no business data, so clearing it loses nothing.

## Layout

```
src/        React app (components/ui = shared primitives, lib = API client + hooks)
server/     Express API: routes -> services -> repositories, domain/, payments/, storage/
server/db/  schema, migrations, seed
e2e/        Playwright specs (flows, responsive + axe)
docs/       PLAN.md, PROGRESS.md (evidence log), DECISIONS.md
```

## Troubleshooting

- **Port 3000 is busy:** another process listening on `localhost:3000` can shadow Vite even though Vite reports 3000 (the more specific address wins). Run the two halves yourself on a free port: `npx tsx watch server/index.ts` and `npx vite --port 3001`. Playwright never uses 3000/4000.
- **`Missing required environment variable ...`:** copy `.env.example` to `.env` and fill it in.
- **Cannot connect to Postgres:** `docker compose up -d --wait db` and check `docker compose ps`; the database listens on host port 5433.
