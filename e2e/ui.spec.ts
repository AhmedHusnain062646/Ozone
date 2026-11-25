// ABOUTME: UI behaviour: console navigation, table alignment, storefront layout and admin safeguards.
// ABOUTME: Read-only against the shared test database; nothing here changes seeded data.
import { expect, test } from '@playwright/test';
import { ACCOUNTS } from './accounts.ts';
import { signIn } from './helpers.ts';

test('money columns are right-aligned, actions stay on one line, labels are sentence case', async ({ page }) => {
  await signIn(page, ACCOUNTS.vane, '/seller?tab=earnings');
  await expect(page.getByRole('columnheader', { name: 'Net' })).toHaveCSS('text-align', 'right');
  await expect(page.getByRole('columnheader', { name: 'Net' })).toHaveCSS('text-transform', 'none');
  await page.goto('/seller?tab=orders');
  const buttons = page.getByRole('row').getByRole('button');
  await expect(buttons.first()).toBeVisible();
  for (const b of await buttons.all()) expect((await b.boundingBox())!.height).toBeLessThan(45);
});

test('console navigation is links in a sidebar, with no footer', async ({ page }) => {
  await signIn(page, ACCOUNTS.vane, '/seller?tab=nonsense');
  const nav = page.getByRole('navigation', { name: 'Console' });
  await expect(nav.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
  await nav.getByRole('link', { name: /^Products/ }).click();
  await expect(page).toHaveURL(/tab=products/);
  await expect(page.getByRole('heading', { level: 2, name: 'Products' })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toHaveCount(0);
  const box = (await nav.boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(260);
});

test('a queue shows a count only when something is waiting', async ({ page }) => {
  await page.route('**/api/admin/analytics', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    const data = body.data ?? body;
    data.sellersByStatus.pending_approval = 3;
    data.subOrdersByStatus.RETURN_REQUESTED = 0;
    await route.fulfill({ response, json: body });
  });
  await signIn(page, ACCOUNTS.admin, '/admin');
  const nav = page.getByRole('navigation', { name: 'Console' });
  await expect(nav.getByRole('link', { name: /^Ateliers/ })).toHaveAccessibleName(/^Ateliers\s*3\s*waiting$/);
  await expect(nav.getByRole('link', { name: /^Returns/ })).toHaveAccessibleName('Returns');
});

test('a very long console title wraps without sideways scroll on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await signIn(page, ACCOUNTS.vane, '/seller');
  await page.waitForLoadState('networkidle');
  // Set and measure in one step so a re-render cannot restore the name in between. body hides horizontal
  // overflow, so the text itself is measured rather than the page's scroll width.
  const overflow = await page.getByRole('heading', { level: 1 }).evaluate((h) => {
    h.textContent = 'Atelier'.repeat(12);
    const range = document.createRange();
    range.selectNodeContents(h);
    return range.getBoundingClientRect().right - window.innerWidth;
  });
  expect(overflow).toBeLessThanOrEqual(0);
});
