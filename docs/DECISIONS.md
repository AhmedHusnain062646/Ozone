# Decisions

- argon2 library: `argon2` (node-argon2, argon2id default). Session store: `connect-pg-simple` with `express-session`.
- Postgres host port 5433 (another local Postgres uses 55432; 5432 left free for the user's own).
- Commission stored as integer basis points (850 = 8.5%); DB CHECK 100..5000 enforces the 1%..50% rule. `splitCommission` rounds half up; net is the remainder so gross = commission + net always holds (also a DB CHECK on sub_orders and ledger_entries).
- Ledger append-only is enforced by a Postgres trigger. The single permitted UPDATE is status `pending -> settled` (COD entries settle on DELIVERED); every other column is immutable and DELETE is rejected. Tests TRUNCATE (bypasses row triggers) between cases.
- Seed normalisation: prototype sub-orders carried a $65 shipping line and commission computed on the shipping-inclusive total (e.g. 81.18). Checkout ships at 0 and commission is on item subtotal, so seeded numbers were recomputed (890.00 -> commission 75.65, net 814.35). Mock "disbursed" sale credits became `settled`; the mock $14,200 payout exceeded Atelier Vane's balance, so it is seeded as $1,500.00 (balance would otherwise go negative, violating the payout rule).
- Seed has two buyers (Julian Sterling, M. Dupont) because the prototype had two buyers owning orders; the Dupont return request feeds the admin return queue. Seeded reviews use throwaway `reviewerN@ozone.test` accounts only to satisfy the buyer FK; the "verified purchase" rule is enforced at the API (M4), not retroactively on seed data.
- Seeded product images that pointed at `/src/assets/images/*` are copied to `public/seed-images/` and referenced as `/seed-images/*` so they survive a production build. Remote hotlinks stay as-is (fallback placeholder in the UI, M3).
- helmet CSP `img-src` widened to `'self' data: https:` because product images can be remote https URLs.
- Seed refuses any database whose name does not end in `_dev` or `_test`; re-seeding needs `--reset`. Test global setup applies the same `_test` guard before migrating.
- Environment note: port 3000 is occupied on this machine by an unrelated `gowa` process; Vite falls back to the next free port. Playwright (M10) will start its own servers on dedicated ports rather than assume 3000.
- `drizzle-kit generate` produced 0000_init; 0001_hardening is a hand-written custom migration (trigger + session table) because the schema DSL cannot express either.
