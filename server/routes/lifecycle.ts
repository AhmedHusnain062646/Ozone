// ABOUTME: POST /api/sub-orders/:code/transitions (buyer/seller actions) and /return-decision (admin only).
// ABOUTME: Bodies are strict; the state machine itself lives in domain/order-state.ts and is enforced in the service.
import { Router } from 'express';
import { z } from 'zod';
import { ORDER_STATUSES } from '../domain/order-state.ts';
import { asyncHandler } from '../http/async-handler.ts';
import { requireAuth, requireRole } from '../http/auth.ts';
import { validate } from '../http/validate.ts';
import * as lifecycle from '../services/lifecycle.ts';

const params = z.object({ code: z.string().min(1).max(60) });
const transitionBody = z.strictObject({
  to: z.enum(ORDER_STATUSES),
  trackingNumber: z.string().trim().max(80).optional(),
  reason: z.string().trim().max(500).optional(),
});
const decisionBody = z.strictObject({ decision: z.enum(['approve', 'reject']), note: z.string().trim().max(500).optional() });

export const subOrdersRouter = Router();
subOrdersRouter.use(requireAuth);
subOrdersRouter.post('/:code/transitions', validate({ params, body: transitionBody }), asyncHandler(async (req, res) => {
  res.json({ data: await lifecycle.transition(req.auth!, String(req.params.code), req.body) });
}));
subOrdersRouter.post('/:code/return-decision', requireRole('admin'), validate({ params, body: decisionBody }), asyncHandler(async (req, res) => {
  res.json({ data: await lifecycle.decideReturn(req.auth!, String(req.params.code), req.body.decision, req.body.note) });
}));
