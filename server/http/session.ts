// ABOUTME: express-session backed by the Postgres "session" table; httpOnly, SameSite=Lax, Secure in production.
// ABOUTME: Sessions hold only the user id; role and seller id are re-read from the database on every request.
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import type { RequestHandler } from 'express';
import { config } from '../config.ts';
import { pool } from '../db/client.ts';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

export const SESSION_COOKIE = 'ozone.sid';
const PgStore = connectPgSimple(session);

export function createSessionMiddleware(opts: { secureCookies?: boolean } = {}): RequestHandler {
  return session({
    name: SESSION_COOKIE,
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: new PgStore({ pool, tableName: 'session', pruneSessionInterval: config.isTest ? false : 60 * 15 }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: opts.secureCookies ?? config.isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  });
}
