# Decisions

- argon2 library: `argon2` (node-argon2, argon2id default). Session store: `connect-pg-simple` with `express-session`.
- Postgres host port 5433 (another local Postgres uses 55432; 5432 left free for the user's own).
