// ABOUTME: /api/wishlist: the signed-in user's saved products. PUT and DELETE are idempotent (204 either way).
// ABOUTME: The user id always comes from the session.
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../http/async-handler.ts';
import { requireAuth } from '../http/auth.ts';
import { validate } from '../http/validate.ts';
import * as catalog from '../services/catalog.ts';

const idParam = z.object({ productId: z.uuid() });

export const wishlistRouter = Router();
wishlistRouter.use(requireAuth);

wishlistRouter.get('/', asyncHandler(async (req, res) => {
  res.json({ data: await catalog.listWishlist(req.auth!.id) });
}));

wishlistRouter.put('/:productId', validate({ params: idParam }), asyncHandler(async (req, res) => {
  await catalog.addToWishlist(req.auth!.id, String(req.params.productId));
  res.status(204).end();
}));

wishlistRouter.delete('/:productId', validate({ params: idParam }), asyncHandler(async (req, res) => {
  await catalog.removeFromWishlist(req.auth!.id, String(req.params.productId));
  res.status(204).end();
}));
