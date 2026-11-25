// ABOUTME: HTTP tests for registration, login, logout, session rotation, role guards, origin check and rate limiting.
// ABOUTME: Role, user id and seller id must come from the session; request bodies can never set them.
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createApp } from '../app.ts';
import { closeDb, db } from '../db/client.ts';
import * as s from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { attachAuth, requireAuth, requireRole } from '../http/auth.ts';
import { createSessionMiddleware } from '../http/session.ts';
import { errorHandler } from '../http/errors.ts';
import { makeSeller, resetDb } from './helpers.ts';

const PASSWORD = 'correct horse battery';
const app = createApp();
const cookieOf = (res: request.Response) =>
  (res.headers['set-cookie'] as unknown as string[] | undefined)?.find((c) => c.startsWith('ozone.sid='));
const sidOf = (cookie?: string) => cookie?.split(';')[0].split('=')[1];

async function register(email = 'ada@example.com', extra: object = {}) {
  return request(app).post('/api/auth/register').send({ email, password: PASSWORD, displayName: 'Ada', ...extra });
}

describe('auth', () => {
  beforeEach(resetDb);
  afterAll(closeDb);

  describe('register', () => {
    it('creates a buyer, signs them in, and returns the user without a hash', async () => {
      const res = await register();
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ email: 'ada@example.com', role: 'buyer', displayName: 'Ada', sellerId: null });
      expect(JSON.stringify(res.body)).not.toMatch(/argon2|password/i);
      const me = await request(app).get('/api/auth/me').set('Cookie', cookieOf(res)!);
      expect(me.body.data.email).toBe('ada@example.com');
    });

    it('rejects a client-supplied role instead of honouring it', async () => {
      const res = await register('evil@example.com', { role: 'admin' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(await db.select().from(s.users)).toHaveLength(0);
    });

    it('stores an argon2id hash, never the password', async () => {
      await register();
      const [u] = await db.select().from(s.users);
      expect(u.passwordHash.startsWith('$argon2id$')).toBe(true);
      expect(u.passwordHash).not.toContain(PASSWORD);
    });

    it('rejects short passwords and bad emails', async () => {
      const short = await request(app).post('/api/auth/register').send({ email: 'a@b.co', password: 'short', displayName: 'A' });
      expect(short.status).toBe(400);
      const bad = await request(app).post('/api/auth/register').send({ email: 'nope', password: PASSWORD, displayName: 'A' });
      expect(bad.status).toBe(400);
    });

    it('treats email case-insensitively and returns 409 for a duplicate', async () => {
      await register('Ada@Example.com');
      const dup = await register('ada@example.COM');
      expect(dup.status).toBe(409);
      expect(dup.body.error.code).toBe('EMAIL_TAKEN');
    });
  });

  describe('login / logout', () => {
    it('logs in with correct credentials', async () => {
      await register();
      const res = await request(app).post('/api/auth/login').send({ email: 'ADA@example.com', password: PASSWORD });
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('ada@example.com');
    });

    it('gives the same 401 for a wrong password and an unknown email', async () => {
      await register();
      const wrong = await request(app).post('/api/auth/login').send({ email: 'ada@example.com', password: 'wrong wrong wrong' });
      const unknown = await request(app).post('/api/auth/login').send({ email: 'ghost@example.com', password: PASSWORD });
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(wrong.body).toEqual(unknown.body);
      expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('rotates the session id on login and kills the old one (no session fixation)', async () => {
      const first = await register('first@example.com');
      const oldCookie = cookieOf(first)!;
      await register('second@example.com'); // second account to log into from the same browser
      const login = await request(app).post('/api/auth/login').set('Cookie', oldCookie)
        .send({ email: 'second@example.com', password: PASSWORD });
      const newCookie = cookieOf(login)!;
      expect(sidOf(newCookie)).toBeTruthy();
      expect(sidOf(newCookie)).not.toBe(sidOf(oldCookie));
      const stale = await request(app).get('/api/auth/me').set('Cookie', oldCookie);
      expect(stale.status).toBe(401);
      const fresh = await request(app).get('/api/auth/me').set('Cookie', newCookie);
      expect(fresh.body.data.email).toBe('second@example.com');
    });

    it('logout destroys the server-side session', async () => {
      const reg = await register();
      const cookie = cookieOf(reg)!;
      const out = await request(app).post('/api/auth/logout').set('Cookie', cookie);
      expect(out.status).toBe(204);
      const me = await request(app).get('/api/auth/me').set('Cookie', cookie);
      expect(me.status).toBe(401);
    });

    it('/me without a session is 401 in the envelope', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('session cookie is HttpOnly, SameSite=Lax, and Secure when secureCookies is on', async () => {
      const plain = cookieOf(await register())!;
      expect(plain).toMatch(/HttpOnly/i);
      expect(plain).toMatch(/SameSite=Lax/i);
      expect(plain).not.toMatch(/Secure/i);

      const secureApp = createApp({ secureCookies: true, trustProxy: 1 });
      const res = await request(secureApp)
        .post('/api/auth/register')
        .set('X-Forwarded-Proto', 'https')
        .send({ email: 'sec@example.com', password: PASSWORD, displayName: 'S' });
      expect(cookieOf(res)).toMatch(/Secure/i);
    });
  });

  describe('roles come from the session', () => {
    it("exposes the seller's own sellerId on /me and ignores any body-supplied ids", async () => {
      const { user, seller } = await makeSeller();
      const hash = (await import('../lib/password.ts')).hashPassword;
      await db.update(s.users).set({ passwordHash: await hash(PASSWORD) }).where(eq(s.users.id, user.id));
      const login = await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD, sellerId: 'x', role: 'admin' });
      // strict schema: extra keys are rejected, so a forged role can never reach the service
      expect(login.status).toBe(400);
      const ok = await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD });
      expect(ok.body.data).toMatchObject({ role: 'seller', sellerId: seller.id });
    });

    it('requireRole returns 401 unauthenticated, 403 wrong role, passes the right role', async () => {
      const guarded = express();
      guarded.use(createSessionMiddleware());
      guarded.use(attachAuth);
      guarded.get('/admin-only', requireAuth, requireRole('admin'), (_req, res) => res.json({ ok: true }));
      guarded.use(errorHandler);

      expect((await request(guarded).get('/admin-only')).status).toBe(401);
      const cookie = cookieOf(await register('b@example.com'))!;
      const forbidden = await request(guarded).get('/admin-only').set('Cookie', cookie);
      expect(forbidden.status).toBe(403);
      expect(forbidden.body.error.code).toBe('FORBIDDEN');
      await db.update(s.users).set({ role: 'admin' }).where(eq(s.users.email, 'b@example.com'));
      expect((await request(guarded).get('/admin-only').set('Cookie', cookie)).status).toBe(200);
    });

    it('a deleted user with a live session is treated as signed out', async () => {
      const reg = await register();
      await db.delete(s.users).where(eq(s.users.email, 'ada@example.com'));
      const me = await request(app).get('/api/auth/me').set('Cookie', cookieOf(reg)!);
      expect(me.status).toBe(401);
    });
  });

  describe('origin check on mutating requests', () => {
    it('rejects a cross-site Origin with 403 CSRF_ORIGIN', async () => {
      const res = await request(app).post('/api/auth/register').set('Origin', 'https://evil.example')
        .send({ email: 'x@example.com', password: PASSWORD, displayName: 'X' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_ORIGIN');
    });

    it('accepts an Origin whose host matches the Host header', async () => {
      const res = await request(app).post('/api/auth/register').set('Host', 'ozone.test').set('Origin', 'http://ozone.test')
        .send({ email: 'y@example.com', password: PASSWORD, displayName: 'Y' });
      expect(res.status).toBe(201);
    });

    it('never blocks safe methods', async () => {
      const res = await request(app).get('/api/health').set('Origin', 'https://evil.example');
      expect(res.status).toBe(200);
    });
  });

  describe('rate limiting', () => {
    it('returns 429 in the envelope after the limit on auth routes', async () => {
      const limited = createApp({ authRateLimit: { limit: 3, windowMs: 60_000 } });
      const attempt = () => request(limited).post('/api/auth/login').send({ email: 'ada@example.com', password: 'bad bad bad bad' });
      for (let i = 0; i < 3; i++) expect((await attempt()).status).toBe(401);
      const blocked = await attempt();
      expect(blocked.status).toBe(429);
      expect(blocked.body.error.code).toBe('RATE_LIMITED');
    });
  });
});
