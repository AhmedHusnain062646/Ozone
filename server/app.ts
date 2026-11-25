// ABOUTME: Builds the Express app: security middleware, JSON parsing, routes, error envelope.
// ABOUTME: In production the built SPA in dist/ is served with an index.html fallback for client routes.
import express, { type Express } from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { config } from './config.ts';
import { errorHandler, notFoundHandler } from './http/errors.ts';
import { attachAuth } from './http/auth.ts';
import { originCheck } from './http/origin.ts';
import { createSessionMiddleware } from './http/session.ts';
import { authRouter } from './routes/auth.ts';
import { cartRouter } from './routes/cart.ts';
import { subOrdersRouter } from './routes/lifecycle.ts';
import { checkoutRouter, ordersRouter } from './routes/checkout.ts';
import { catalogRouter } from './routes/catalog.ts';
import { reviewsRouter } from './routes/reviews.ts';
import { wishlistRouter } from './routes/wishlist.ts';
import { adminRouter } from './routes/admin.ts';
import { sellerRouter } from './routes/seller.ts';
import { createLocalDiskStorage, type ImageStorage } from './storage/image-storage.ts';
import { healthRouter } from './routes/health.ts';

export interface AppOptions {
  secureCookies?: boolean;
  trustProxy?: number | boolean;
  authRateLimit?: { limit: number; windowMs: number };
  imageStorage?: ImageStorage;
}

export function createApp(opts: AppOptions = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', opts.trustProxy ?? config.trustProxy);
  // Product images may be remote https URLs, so img-src allows https: (default is 'self' data: only).
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { 'img-src': ["'self'", 'data:', 'https:'] } },
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use('/uploads', express.static(config.uploadDir, { index: false, fallthrough: true }));
  app.use('/uploads', (_req, res) => { res.status(404).end(); });

  app.use('/api', originCheck);
  app.use(createSessionMiddleware({ secureCookies: opts.secureCookies }));
  app.use(attachAuth);

  app.use('/api/health', healthRouter);
  app.use(
    '/api/auth',
    authRouter(opts.authRateLimit ?? { limit: config.isTest ? 10_000 : 20, windowMs: 15 * 60 * 1000 }),
  );
  app.use('/api/catalog', catalogRouter);
  app.use('/api/wishlist', wishlistRouter);
  app.use('/api/cart', cartRouter);
  app.use('/api/checkout', checkoutRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/sub-orders', subOrdersRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/seller', sellerRouter(opts.imageStorage ?? createLocalDiskStorage(config.uploadDir)));
  app.use('/api/products/:productId/reviews', reviewsRouter);

  app.use('/api', notFoundHandler);

  if (config.isProduction) {
    const dist = path.resolve(process.cwd(), 'dist');
    app.use(express.static(dist));
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
