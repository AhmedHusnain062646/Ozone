// ABOUTME: argon2id password hashing. Cost is reduced under NODE_ENV=test only, to keep suites fast.
// ABOUTME: verifyPassword never throws on a malformed hash; it returns false and logs.
import argon2 from 'argon2';
import { config } from '../config.ts';
import { logger } from '../http/logger.ts';

// OWASP argon2id minimum: m=19 MiB, t=2, p=1. Tests use a token cost.
const cost = config.isTest
  ? { memoryCost: 1024, timeCost: 2, parallelism: 1 }
  : { memoryCost: 19456, timeCost: 2, parallelism: 1 };
const options = { type: argon2.argon2id, ...cost } as const;

export const hashPassword = (plain: string) => argon2.hash(plain, options);

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch (err) {
    logger.error({ err }, 'password verify failed on malformed hash');
    return false;
  }
}

let dummyHash: Promise<string> | undefined;
/** Verifies against a throwaway hash so unknown-email logins cost the same as wrong-password ones. */
export async function burnVerifyTime(plain: string): Promise<void> {
  dummyHash ??= hashPassword('ozone-timing-equaliser');
  await verifyPassword(await dummyHash, plain);
}
