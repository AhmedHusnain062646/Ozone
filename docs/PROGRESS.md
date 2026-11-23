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
