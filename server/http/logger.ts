// ABOUTME: Shared pino logger. Silent under test; redacts cookies and password fields everywhere.
// ABOUTME: Log key=value style fields at boundaries; never log secrets or full request bodies.
import pino from 'pino';
import { config } from '../config.ts';

export const logger = pino({
  level: config.isTest ? 'silent' : (process.env.LOG_LEVEL ?? 'info'),
  redact: ['req.headers.cookie', 'password', '*.password', 'passwordHash', '*.passwordHash'],
});
