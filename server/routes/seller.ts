// ABOUTME: /api/seller/*: the seller console API. Everything is scoped to the signed-in seller's own atelier.
// ABOUTME: Strict zod bodies; image upload is memory-buffered (2 MB cap) and validated by magic bytes in the service.
import { Router, type RequestHandler } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { asyncHandler } from '../http/async-handler.ts';
import { requireRole } from '../http/auth.ts';
import { HttpError } from '../http/errors.ts';
import { validate } from '../http/validate.ts';
import * as seller from '../services/seller.ts';
import type { ImageStorage } from '../storage/image-storage.ts';

const cents = z.number().int().min(0).max(100_000_000);
const variant = z.strictObject({ name: z.string().trim().min(1).max(80), sku: z.string().trim().min(2).max(64), priceDeltaCents: z.number().int().min(-100_000_000).max(100_000_000), stock: z.number().int().min(0).max(100_000) });
const productFields = {
  title: z.string().trim().min(1).max(120), categoryId: z.string().uuid(), basePriceCents: cents,
  shortDescription: z.string().trim().max(240), description: z.string().trim().max(4000), material: z.string().trim().max(120), origin: z.string().trim().max(120),
  limitedEdition: z.boolean(), lowStockThreshold: z.number().int().min(0).max(1000),
};
const createBody = z.strictObject({ ...productFields, shortDescription: productFields.shortDescription.optional(), description: productFields.description.optional(), material: productFields.material.optional(), origin: productFields.origin.optional(), limitedEdition: productFields.limitedEdition.optional(), lowStockThreshold: productFields.lowStockThreshold.optional(), variants: z.array(variant).min(1).max(20) });
const patchBody = z.strictObject({ ...Object.fromEntries(Object.entries(productFields).map(([k, v]) => [k, v.optional()])), isPublished: z.boolean().optional() } as { [K in keyof typeof productFields]: z.ZodOptional<(typeof productFields)[K]> } & { isPublished: z.ZodOptional<z.ZodBoolean> });
const variantPatch = z.strictObject({ name: variant.shape.name.optional(), priceDeltaCents: variant.shape.priceDeltaCents.optional(), stock: variant.shape.stock.optional() });
const id = z.object({ id: z.string().uuid() });

export function sellerRouter(storage: ImageStorage) {
  const router = Router();
  router.use(requireRole('seller'));
  const sid = (req: Parameters<RequestHandler>[0]) => seller.requireSellerId(req.auth!);

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });
  const uploadOne: RequestHandler = (req, res, next) =>
    upload.single('image')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return next(err.code === 'LIMIT_FILE_SIZE' ? new HttpError(413, 'FILE_TOO_LARGE', 'Images can be at most 2 MB') : new HttpError(400, 'UPLOAD_ERROR', err.message));
      }
      next(err);
    });

  router.get('/me', asyncHandler(async (req, res) => { res.json({ data: await seller.getProfile(sid(req)) }); }));
  router.get('/summary', asyncHandler(async (req, res) => { res.json({ data: await seller.summary(sid(req)) }); }));

  router.get('/products', asyncHandler(async (req, res) => { res.json({ data: await seller.listProducts(sid(req)) }); }));
  router.post('/products', validate({ body: createBody }), asyncHandler(async (req, res) => { res.status(201).json({ data: await seller.createProduct(sid(req), req.body) }); }));
  router.patch('/products/:id', validate({ params: id, body: patchBody }), asyncHandler(async (req, res) => { res.json({ data: await seller.updateProduct(sid(req), String(req.params.id), req.body) }); }));
  router.post('/products/:id/variants', validate({ params: id, body: variant }), asyncHandler(async (req, res) => { res.status(201).json({ data: await seller.addVariant(sid(req), String(req.params.id), req.body) }); }));
  router.patch('/variants/:id', validate({ params: id, body: variantPatch }), asyncHandler(async (req, res) => { res.json({ data: await seller.updateVariant(sid(req), String(req.params.id), req.body) }); }));

  router.post('/products/:id/images', validate({ params: id }), uploadOne, asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'FILE_REQUIRED', 'Attach an image in the "image" field');
    res.status(201).json({ data: await seller.addImage(storage, sid(req), String(req.params.id), req.file.buffer) });
  }));
  router.delete('/products/:id/images/:imageId', validate({ params: id.extend({ imageId: z.string().uuid() }) }), asyncHandler(async (req, res) => {
    await seller.removeImage(storage, sid(req), String(req.params.id), String(req.params.imageId));
    res.status(204).end();
  }));

  router.get('/orders', asyncHandler(async (req, res) => { res.json({ data: await seller.listOrders(sid(req)) }); }));
  router.get('/balance', asyncHandler(async (req, res) => { res.json({ data: await seller.getBalance(sid(req)) }); }));
  router.get('/ledger', asyncHandler(async (req, res) => { res.json({ data: { entries: await seller.getLedger(sid(req)) } }); }));
  router.get('/ledger.csv', asyncHandler(async (req, res) => {
    res.set('Content-Type', 'text/csv; charset=utf-8').set('Content-Disposition', 'attachment; filename="ozone-ledger.csv"').send(await seller.ledgerCsv(sid(req)));
  }));
  router.post('/payouts', validate({ body: z.strictObject({ amountCents: z.number().int().min(1).max(100_000_000) }) }), asyncHandler(async (req, res) => {
    res.status(201).json({ data: await seller.requestPayout(sid(req), req.body.amountCents) });
  }));

  return router;
}
