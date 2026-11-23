// ABOUTME: POST /api/checkout and the buyer/admin order reads. Strict bodies: no prices, no card data, no identity fields.
// ABOUTME: 201 for a new order, 200 + Idempotent-Replay: true when the idempotency key was already used.
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../http/async-handler.ts';
import { requireAuth } from '../http/auth.ts';
import { validate } from '../http/validate.ts';
import * as checkoutService from '../services/checkout.ts';
import * as orderService from '../services/orders.ts';

const text = (max: number) => z.string().trim().min(1).max(max);
const checkoutBody = z.strictObject({
  idempotencyKey: z.string().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/, 'Use letters, digits and . _ : -'),
  paymentMethod: z.enum(['sandbox_card', 'ozone_escrow', 'cod']),
  shippingAddress: z.strictObject({ fullName: text(120), street: text(200), city: text(100), state: text(100), postalCode: text(20), country: text(100) }),
  sandboxOutcome: z.enum(['approve', 'decline']).optional(),
});

export const checkoutRouter = Router();
checkoutRouter.post('/', requireAuth, validate({ body: checkoutBody }), asyncHandler(async (req, res) => {
  const { order, replayed } = await checkoutService.checkout(req.auth!, req.body);
  if (replayed) res.set('Idempotent-Replay', 'true');
  res.status(replayed ? 200 : 201).json({ data: order });
}));

export const ordersRouter = Router();
ordersRouter.use(requireAuth);
ordersRouter.get('/', asyncHandler(async (req, res) => {
  res.json({ data: await orderService.listOrdersForBuyer(req.auth!.id) });
}));
ordersRouter.get('/:code', validate({ params: z.object({ code: z.string().min(1).max(40) }) }), asyncHandler(async (req, res) => {
  res.json({ data: await orderService.getOrderForViewer(String(req.params.code), req.auth!) });
}));
