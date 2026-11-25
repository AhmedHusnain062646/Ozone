// ABOUTME: Resolves req.auth from the session and provides requireAuth / requireRole guards.
// ABOUTME: Identity (user id, role, seller id) is read from the DB per request, never from request input.
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { findAuthUserById, type AuthUser } from '../repositories/users.ts';
import { forbidden, unauthorized } from './errors.ts';

export type AuthContext = Pick<AuthUser, 'id' | 'email' | 'displayName' | 'role' | 'sellerId'>;

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}

export const attachAuth: RequestHandler = async (req, _res, next) => {
  try {
    const userId = req.session?.userId;
    if (userId) {
      const user = await findAuthUserById(userId);
      if (user) {
        req.auth = { id: user.id, email: user.email, displayName: user.displayName, role: user.role, sellerId: user.sellerId };
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  next(req.auth ? undefined : unauthorized());
};

export const requireRole =
  (...roles: AuthContext['role'][]): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized());
    next(roles.includes(req.auth.role) ? undefined : forbidden());
  };

export const toUserDto = (a: AuthContext) => ({
  id: a.id,
  email: a.email,
  displayName: a.displayName,
  role: a.role,
  sellerId: a.sellerId,
});
