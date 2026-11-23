// ABOUTME: /api/auth: register (buyer only), login, logout, me. Sessions rotate on login and register.
// ABOUTME: Body schemas are strict so a forged role/sellerId is a 400, not silently ignored.
import { Router, type Request } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler } from '../http/async-handler.ts';
import { attachAuth, requireAuth, toUserDto } from '../http/auth.ts';
import { HttpError } from '../http/errors.ts';
import { SESSION_COOKIE } from '../http/session.ts';
import { validate } from '../http/validate.ts';
import { logger } from '../http/logger.ts';
import * as authService from '../services/auth.ts';

const email = z.string().trim().toLowerCase().email().max(254);
const registerBody = z.strictObject({
  email,
  password: z.string().min(10, 'Password must be at least 10 characters').max(128),
  displayName: z.string().trim().min(1).max(80),
});
const applySellerBody = z.strictObject({
  email,
  password: z.string().min(10, 'Password must be at least 10 characters').max(128),
  displayName: z.string().trim().min(1).max(80),
  atelierName: z.string().trim().min(1).max(80),
  tagline: z.string().trim().max(140).optional(),
  location: z.string().trim().max(80).optional(),
});
const loginBody = z.strictObject({ email, password: z.string().min(1).max(128) });

/** Replaces the session id (and destroys the old session) so a pre-login id can never become authenticated. */
function startSession(req: Request, userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = userId;
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

export function authRouter(limits: { limit: number; windowMs: number }) {
  const router = Router();
  const limiter = rateLimit({
    windowMs: limits.windowMs,
    limit: limits.limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, _res, next) => {
      logger.warn({ path: req.path }, 'auth rate limit hit');
      next(new HttpError(429, 'RATE_LIMITED', 'Too many attempts. Try again later.'));
    },
  });

  router.post(
    '/register',
    limiter,
    validate({ body: registerBody }),
    asyncHandler(async (req, res) => {
      const userId = await authService.registerBuyer(req.body);
      await startSession(req, userId);
      req.auth = undefined;
      await new Promise<void>((resolve, reject) => attachAuth(req, res, (e) => (e ? reject(e) : resolve())));
      logger.info({ userId }, 'user registered');
      res.status(201).json({ data: toUserDto(req.auth!) });
    }),
  );

  router.post(
    '/apply-seller',
    limiter,
    validate({ body: applySellerBody }),
    asyncHandler(async (req, res) => {
      const userId = await authService.applyAsSeller(req.body);
      await startSession(req, userId);
      req.auth = undefined;
      await new Promise<void>((resolve, reject) => attachAuth(req, res, (e) => (e ? reject(e) : resolve())));
      logger.info({ userId, sellerId: req.auth!.sellerId }, 'seller applied');
      res.status(201).json({ data: toUserDto(req.auth!) });
    }),
  );

  router.post(
    '/login',
    limiter,
    validate({ body: loginBody }),
    asyncHandler(async (req, res) => {
      const userId = await authService.authenticate(req.body.email, req.body.password);
      await startSession(req, userId);
      await new Promise<void>((resolve, reject) => attachAuth(req, res, (e) => (e ? reject(e) : resolve())));
      logger.info({ userId }, 'user logged in');
      res.json({ data: toUserDto(req.auth!) });
    }),
  );

  router.post('/logout', (req, res, next) => {
    if (!req.session) return void res.status(204).end();
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie(SESSION_COOKIE);
      res.status(204).end();
    });
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json({ data: toUserDto(req.auth!) });
  });

  return router;
}
