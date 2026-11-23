// ABOUTME: Liveness/readiness route; verifies the database answers a trivial query.
// ABOUTME: Returns 503 with the envelope when the database is unreachable.
import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../db/client.ts';
import { HttpError } from '../http/errors.ts';
import { logger } from '../http/logger.ts';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res, next) => {
  try {
    await db.execute(sql`select 1`);
    res.json({ status: 'ok', database: 'up' });
  } catch (err) {
    logger.error({ err }, 'health check: database unreachable');
    next(new HttpError(503, 'DATABASE_DOWN', 'Database is unreachable'));
  }
});
