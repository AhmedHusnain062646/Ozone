// ABOUTME: Tests the zod validation helper maps failures to a 400 VALIDATION_ERROR with field details.
// ABOUTME: Pure Express (no database): a throwaway app mounts one validated route.
import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { validate } from '../http/validate.ts';
import { errorHandler } from '../http/errors.ts';

const app = express();
app.use(express.json());
app.post('/x', validate({ body: z.object({ qty: z.number().int().positive() }) }), (req, res) => {
  res.json({ data: req.body });
});
app.use(errorHandler);

describe('validate', () => {
  it('passes valid input through', async () => {
    const res = await request(app).post('/x').send({ qty: 2 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { qty: 2 } });
  });

  it('returns VALIDATION_ERROR with the failing path', async () => {
    const res = await request(app).post('/x').send({ qty: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].path).toBe('body.qty');
  });
});
