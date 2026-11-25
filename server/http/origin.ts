// ABOUTME: Rejects mutating requests whose Origin header names a different host than the one served.
// ABOUTME: Requests without an Origin (curl, server-to-server) pass; browsers always send it on cross-site writes.
import type { RequestHandler } from 'express';
import { HttpError } from './errors.ts';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

export const originCheck: RequestHandler = (req, _res, next) => {
  const origin = req.get('origin');
  if (SAFE.has(req.method) || !origin) return next();
  let originHost: string | undefined;
  try {
    originHost = new URL(origin).host;
  } catch {
    originHost = undefined;
  }
  if (originHost && originHost === req.get('host')) return next();
  next(new HttpError(403, 'CSRF_ORIGIN', 'Cross-site request blocked'));
};
