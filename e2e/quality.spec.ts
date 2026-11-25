// ABOUTME: M10 quality gate: no horizontal scroll at 375/768/1440 and no serious/critical axe violations on every main screen.
// ABOUTME: Also proves server-side persistence from the browser's point of view: clearing cookies and storage loses nothing.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ACCOUNTS } from './accounts.ts';
import { signIn } from './helpers.ts';

const VIEWPORTS = [
  { name: '375', width: 375, height: 812 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 900 },
];

async function audit(page: Page, label: string) {
  await page.waitForLoadState('networkidle');
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(150);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const culprits = overflow > 0
      ? await page.evaluate(() => [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1 && !(el.parentElement && el.parentElement.closest('[class*="overflow-x-auto"]')) && !/overflow-x-auto/.test(String(el.className))).slice(0, 4).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`))
      : [];
    expect(culprits, `${label} @${vp.name}px overflowing elements`).toEqual([]);
    expect(overflow, `${label} @${vp.name}px horizontal overflow`).toBeLessThanOrEqual(0);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(bad.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => `${n.target.join(' ')} [${(n.failureSummary ?? '').split('\n')[1]?.trim() ?? ''}]`).join(' | ')}`), `${label} @${vp.name}px axe`).toEqual([]);
  }
}

test.describe('anonymous screens', () => {
  test('storefront and product detail', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await audit(page, 'storefront');
    await page.goto('/products/vane-01');
    await expect(page.getByRole('dialog')).toBeVisible();
    await audit(page, 'product detail');
  });

  test('sign-in modal', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.getByRole('dialog')).toBeVisible();
    await audit(page, 'sign-in');
  });
});

test.describe('buyer screens', () => {
  test('cart, checkout and orders', async ({ page }) => {
    await signIn(page, ACCOUNTS.buyer, '/');
    await page.goto('/products/nordic-01');
    await page.getByRole('button', { name: /^Reserve/ }).click();
    await expect(page.getByRole('dialog', { name: 'Your cart' })).toBeVisible();
    await audit(page, 'cart');

    await page.goto('/checkout');
    await expect(page.getByRole('dialog', { name: 'Checkout' })).toBeVisible();
    await audit(page, 'checkout address');
    const d = page.getByRole('dialog', { name: 'Checkout' });
    for (const [l, v] of [['Street address', '1 Way'], ['City', 'London'], ['State / region', 'LDN'], ['Postal code', 'N1'], ['Country', 'UK']] as const) await d.getByLabel(l).fill(v);
    await d.getByRole('button', { name: 'Continue to payment' }).click();
    await audit(page, 'checkout payment');
    await d.getByRole('button', { name: 'Review order' }).click();
    await expect(d.getByText('ships as 1 separate parcel')).toBeVisible();
    await audit(page, 'checkout review');

    // release the hold so later specs see untouched stock
    await page.goto('/cart');
    await page.getByRole('dialog', { name: 'Your cart' }).getByRole('button', { name: /Remove .* from cart/ }).click();

    await page.goto('/orders');
    await expect(page.getByRole('heading', { level: 1, name: 'Your orders' })).toBeVisible();
    await audit(page, 'orders list');
    await page.getByRole('link').filter({ hasText: /OZ-/ }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: /^Order / })).toBeVisible();
    await audit(page, 'order detail');
  });

  test('wishlist', async ({ page }) => {
    await signIn(page, ACCOUNTS.buyer, '/wishlist');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await audit(page, 'wishlist');
  });
});

test.describe('console screens', () => {
  test('seller console tabs', async ({ page }) => {
    await signIn(page, ACCOUNTS.vane, '/seller');
    for (const tab of ['Overview', 'Products', 'Orders', 'Earnings']) {
      await page.getByRole('tab', { name: tab }).click();
      await expect(page.getByRole('tabpanel')).toBeVisible();
      await audit(page, `seller ${tab}`);
    }
  });

  test('admin console tabs and lab', async ({ page }) => {
    await signIn(page, ACCOUNTS.admin, '/admin');
    for (const tab of ['Overview', 'Ateliers', 'Catalogue & fees', 'Returns']) {
      await page.getByRole('tab', { name: tab }).click();
      await expect(page.getByRole('tabpanel')).toBeVisible();
      await audit(page, `admin ${tab}`);
    }
    await page.getByRole('button', { name: 'Concurrency Lab' }).click();
    await expect(page.getByRole('dialog', { name: 'Concurrency Lab' })).toBeVisible();
    await audit(page, 'concurrency lab');
  });
});

test('data lives on the server: clearing cookies and browser storage loses no order, cart or wishlist', async ({ page, context }) => {
  await signIn(page, ACCOUNTS.buyer, '/orders');
  await expect(page.getByRole('link').filter({ hasText: /OZ-/ }).first()).toBeVisible();
  const before = await page.getByRole('link').filter({ hasText: /OZ-/ }).count();
  expect(before).toBeGreaterThan(0);
  await context.clearCookies();
  await page.evaluate(() => { window.localStorage.clear(); window.sessionStorage.clear(); });
  await page.goto('/orders');
  await expect(page).toHaveURL(/sign-in/);
  await signIn(page, ACCOUNTS.buyer, '/orders');
  await expect(page.getByRole('link').filter({ hasText: /OZ-/ })).toHaveCount(before);
});
