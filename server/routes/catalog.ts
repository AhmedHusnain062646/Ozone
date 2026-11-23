// ABOUTME: Public catalog routes (/api/catalog/*): product list, detail by slug, categories. No sign-in needed.
// ABOUTME: Signed-in viewers additionally get `viewer.canReview` on the detail response.
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../http/async-handler.ts';
import { validate } from '../http/validate.ts';
import * as catalog from '../services/catalog.ts';

const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(),
  seller: z.string().trim().max(80).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'rating']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

export const catalogRouter = Router();

catalogRouter.get('/products', validate({ query: listQuery }), asyncHandler(async (req, res) => {
  res.json({ data: await catalog.listCatalog(req.query as unknown as z.infer<typeof listQuery>) });
}));

catalogRouter.get('/products/:slug', validate({ params: z.object({ slug: z.string().min(1).max(120) }) }), asyncHandler(async (req, res) => {
  res.json({ data: await catalog.productDetail(String(req.params.slug), req.auth?.id) });
}));

catalogRouter.get('/categories', asyncHandler(async (_req, res) => {
  res.json({ data: await catalog.listCategories() });
}));
