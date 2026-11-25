// ABOUTME: Express 4 does not forward rejected promises to error middleware; this wrapper does.
// ABOUTME: Wrap every async route handler with it.
import type { NextFunction, Request, RequestHandler, Response } from 'express';

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
