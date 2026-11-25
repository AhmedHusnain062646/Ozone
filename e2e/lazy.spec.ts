// ABOUTME: Route-level code splitting: screens a visitor has not opened must not be downloaded.
// ABOUTME: Watches module requests (the dev server serves one per source file).
import { expect, test } from '@playwright/test';
import { ACCOUNTS } from './accounts.ts';
import { signIn } from './helpers.ts';

const SPLIT = /(SellerDashboard|AdminDashboard|CheckoutModal|OrderTrackingView|WishlistView|ConcurrencyLabModal)\.tsx/;

test('the storefront does not download console, checkout or order screens', async ({ page }) => {
  const loaded: string[] = [];
  page.on('request', (r) => { const m = r.url().match(SPLIT); if (m) loaded.push(m[1]); });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(loaded).toEqual([]);
});

test('a screen is downloaded when opened, including on a direct visit', async ({ page }) => {
  const loaded: string[] = [];
  page.on('request', (r) => { const m = r.url().match(SPLIT); if (m) loaded.push(m[1]); });
  await signIn(page, ACCOUNTS.vane, '/seller');
  await expect(page.getByRole('heading', { level: 1, name: 'Atelier Vane' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Atelier Vane' })).toBeVisible();
  expect(loaded).toContain('SellerDashboard');
  expect(loaded).not.toContain('AdminDashboard');
});
