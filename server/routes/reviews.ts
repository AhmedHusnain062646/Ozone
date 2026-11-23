// ABOUTME: POST /api/products/:productId/reviews: one review per buyer per product, after a DELIVERED purchase.
// ABOUTME: Strict body: a client-supplied buyer id or timestamp is rejected, not ignored.
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../http/async-handler.ts';
import { requireAuth } from '../http/auth.ts';
import { validate } from '../http/validate.ts';
import * as catalog from '../services/catalog.ts';

const body = z.strictObject({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(1).max(120),
  comment: z.string().trim().min(1).max(2000),
});

export const reviewsRouter = Router({ mergeParams: true });

reviewsRouter.post('/', requireAuth, validate({ params: z.object({ productId: z.uuid() }), body }), asyncHandler(async (req, res) => {
  const review = await catalog.addReview(req.auth!.id, String(req.params.productId), req.body);
  res.status(201).json({ data: { id: review.id } });
}));
