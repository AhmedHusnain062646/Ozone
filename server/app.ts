// ABOUTME: Builds the Express app: security middleware, JSON parsing, routes, error envelope.
// ABOUTME: In production the built SPA in dist/ is served with an index.html fallback for client routes.
import express, { type Express } from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { config } from './config.ts';
import { errorHandler, notFoundHandler } from './http/errors.ts';
import { healthRouter } from './routes/health.ts';

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  // Product images may be remote https URLs, so img-src allows https: (default is 'self' data: only).
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { 'img-src': ["'self'", 'data:', 'https:'] } },
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/health', healthRouter);
  app.use('/api', notFoundHandler);

  if (config.isProduction) {
    const dist = path.resolve(process.cwd(), 'dist');
    app.use(express.static(dist));
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
