// ABOUTME: /api/admin/*: governance API (sellers, fees, categories, analytics, returns queue, concurrency lab). Admin role only.
// ABOUTME: Return approval itself goes through POST /api/sub-orders/:code/return-decision (shared state machine).
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../http/async-handler.ts';
import { requireRole } from '../http/auth.ts';
import { validate } from '../http/validate.ts';
import * as admin from '../services/admin.ts';

const bps = z.number().int().min(100).max(5000);
const uuid = z.object({ id: z.string().uuid() });
const catBody = z.strictObject({ name: z.string().trim().min(1).max(60), description: z.string().trim().max(240).optional() });

export const adminRouter = Router();
adminRouter.use(requireRole('admin'));

adminRouter.get('/analytics', asyncHandler(async (_req, res) => { res.json({ data: await admin.analytics() }); }));
adminRouter.get('/sellers', asyncHandler(async (_req, res) => { res.json({ data: await admin.listSellers() }); }));
adminRouter.patch('/sellers/:id', validate({ params: uuid, body: z.strictObject({ status: z.enum(['active', 'pending_approval', 'suspended']).optional(), commissionBps: bps.optional(), verified: z.boolean().optional() }) }),
  asyncHandler(async (req, res) => { res.json({ data: await admin.updateSeller(String(req.params.id), req.body) }); }));

adminRouter.get('/settings', asyncHandler(async (_req, res) => { res.json({ data: await admin.getSettings() }); }));
adminRouter.put('/settings/default-fee', validate({ body: z.strictObject({ commissionBps: bps }) }),
  asyncHandler(async (req, res) => { res.json({ data: await admin.setDefaultFee(req.body.commissionBps) }); }));

adminRouter.get('/categories', asyncHandler(async (_req, res) => { res.json({ data: await admin.listCategories() }); }));
adminRouter.post('/categories', validate({ body: catBody }), asyncHandler(async (req, res) => { res.status(201).json({ data: await admin.createCategory(req.body) }); }));
adminRouter.patch('/categories/:id', validate({ params: uuid, body: catBody.partial() }), asyncHandler(async (req, res) => { res.json({ data: await admin.updateCategory(String(req.params.id), req.body) }); }));
adminRouter.delete('/categories/:id', validate({ params: uuid }), asyncHandler(async (req, res) => { await admin.deleteCategory(String(req.params.id)); res.status(204).end(); }));

adminRouter.get('/returns', asyncHandler(async (_req, res) => { res.json({ data: await admin.returnsQueue() }); }));
adminRouter.get('/concurrency-lab/variants', asyncHandler(async (_req, res) => { res.json({ data: await admin.listLabVariants() }); }));
adminRouter.post('/concurrency-lab', validate({ body: z.strictObject({ variantId: z.string().uuid(), attempts: z.number().int().min(2).max(100) }) }),
  asyncHandler(async (req, res) => { res.json({ data: await admin.runConcurrencyLab(req.body.variantId, req.body.attempts) }); }));
