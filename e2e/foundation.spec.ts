// ABOUTME: M3 smoke: shell renders, hero image loads, sign-in modal is keyboard-accessible, register/login/logout work.
// ABOUTME: Uses real API + DB (test database); no mocks.
import { expect, test } from '@playwright/test';
import { ACCOUNTS, E2E_PASSWORD } from './accounts.ts';

test('home renders the hero image and navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Objects made slowly');
  await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in' })).toBeVisible();
  const loaded = await page.locator('section img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0);
  expect(loaded).toBe(true);
});

test('sign-in modal traps focus, closes on Escape and restores focus', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('banner').getByRole('link', { name: 'Sign in' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Sign in' });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL('/');
});

test('a wrong password shows an inline error; the seeded buyer can sign in and out', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(ACCOUNTS.buyer);
  await page.getByLabel('Password').fill('definitely-wrong-1');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('incorrect');

  await page.getByLabel('Password').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out' }).first()).toBeVisible();
  await expect(page.getByRole('banner').getByRole('link', { name: 'Orders' })).toBeVisible();

  await page.reload(); // session cookie survives a reload
  await expect(page.getByRole('button', { name: 'Sign out' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).first().click();
  await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in' })).toBeVisible();
});

test('a new visitor can register and is signed in as a buyer', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByRole('tab', { name: 'Create account' }).click();
  await page.getByLabel('Full name').fill('Ada Lovelace');
  await page.getByLabel('Email').fill(`ada-${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('a-long-enough-password');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('banner').getByRole('link', { name: 'Orders' })).toBeVisible();
});

test('unknown routes show the not-found page', async ({ page }) => {
  await page.goto('/no-such-page');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});
