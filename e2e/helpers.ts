// ABOUTME: Shared e2e helpers: sign in through the real UI as a seeded account.
// ABOUTME: All accounts share E2E_PASSWORD (local _test database only).
import { expect, type Page } from '@playwright/test';
import { E2E_PASSWORD } from './accounts.ts';

export async function signIn(page: Page, email: string, next = '/') {
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out' }).first()).toBeVisible();
}
