// ABOUTME: HTTP-level tests for the app shell: health, JSON error envelope, validation errors, security headers.
// ABOUTME: Uses supertest against the Express app directly (no port) and the _test database.
import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.ts';
import { closeDb } from '../db/client.ts';

const app = createApp();

describe('app shell', () => {
  afterAll(closeDb);

  it('GET /api/health returns ok and checks the database', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('unknown API routes use the error envelope', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Route not found: GET /api/nope' } });
  });

  it('malformed JSON bodies produce a 400 envelope, not an HTML stack trace', async () => {
    const res = await request(app).post('/api/health').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('sets helmet security headers and hides x-powered-by', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
