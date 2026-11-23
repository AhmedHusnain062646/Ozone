// ABOUTME: Registration and credential checks. Public sign-up can only ever create buyers.
// ABOUTME: Wrong password and unknown email are indistinguishable (same error, equalised timing).
import { HttpError } from '../http/errors.ts';
import { burnVerifyTime, hashPassword, verifyPassword } from '../lib/password.ts';
import * as users from '../repositories/users.ts';

const isUniqueViolation = (e: unknown) =>
  ((e as { cause?: { code?: string } }).cause?.code ?? (e as { code?: string }).code) === '23505';

export async function registerBuyer(input: { email: string; password: string; displayName: string }) {
  const email = input.email.trim().toLowerCase();
  try {
    const row = await users.createBuyer({
      email,
      displayName: input.displayName.trim(),
      passwordHash: await hashPassword(input.password),
    });
    return row.id;
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
    throw err;
  }
}

/** @returns the user id on success. @throws 401 INVALID_CREDENTIALS otherwise. */
export async function authenticate(emailInput: string, password: string): Promise<string> {
  const user = await users.findByEmail(emailInput.trim());
  if (!user) {
    await burnVerifyTime(password);
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }
  if (!(await verifyPassword(user.passwordHash, password))) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }
  return user.id;
}
