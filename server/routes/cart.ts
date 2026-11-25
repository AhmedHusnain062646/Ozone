// ABOUTME: /api/cart: the signed-in user's server-side cart (and stock holds). All routes require sign-in.
// ABOUTME: Strict bodies; the user id is always the session's. Quantity per request is capped at 10.
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../http/async-handler.ts';
import { requireAuth } from '../http/auth.ts';
import { validate } from '../http/validate.ts';
import * as cart from '../services/cart.ts';

const quantity = z.number().int().min(1).max(10);
const variantParam = z.object({ variantId: z.uuid() });

export const cartRouter = Router();
cartRouter.use(requireAuth);

cartRouter.get('/', asyncHandler(async (req, res) => {
  res.json({ data: await cart.getCart(req.auth!.id) });
}));

cartRouter.post('/items', validate({ body: z.strictObject({ variantId: z.uuid(), quantity }) }), asyncHandler(async (req, res) => {
  await cart.addItem(req.auth!.id, req.body.variantId, req.body.quantity);
  res.status(201).json({ data: await cart.getCart(req.auth!.id) });
}));

cartRouter.patch('/items/:variantId', validate({ params: variantParam, body: z.strictObject({ quantity }) }), asyncHandler(async (req, res) => {
  await cart.setQuantity(req.auth!.id, String(req.params.variantId), req.body.quantity);
  res.json({ data: await cart.getCart(req.auth!.id) });
}));

cartRouter.delete('/items/:variantId', validate({ params: variantParam }), asyncHandler(async (req, res) => {
  await cart.removeItem(req.auth!.id, String(req.params.variantId));
  res.status(204).end();
}));

cartRouter.delete('/', asyncHandler(async (req, res) => {
  await cart.clearCart(req.auth!.id);
  res.status(204).end();
}));
