// ABOUTME: zod validation middleware for body, query and params; replaces req values with parsed output.
// ABOUTME: Failures become a 400 VALIDATION_ERROR listing each failing path.
import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { HttpError } from './errors.ts';

type Schemas = { body?: ZodType; query?: ZodType; params?: ZodType };

export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    const issues: { path: string; message: string }[] = [];
    for (const part of ['params', 'query', 'body'] as const) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part]);
      if (result.success) {
        // req.query is a getter in Express 5-style typings; assign defensively.
        Object.defineProperty(req, part, { value: result.data, writable: true, configurable: true });
      } else {
        for (const i of result.error.issues) {
          issues.push({ path: [part, ...i.path].join('.'), message: i.message });
        }
      }
    }
    next(issues.length ? new HttpError(400, 'VALIDATION_ERROR', 'Request validation failed', issues) : undefined);
  };
}
