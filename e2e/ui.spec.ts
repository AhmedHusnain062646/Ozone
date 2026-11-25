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

test('suspending asks first, and cancelling sends nothing', async ({ page }) => {
  await signIn(page, ACCOUNTS.admin, '/admin?tab=sellers');
  const patches: string[] = [];
  page.on('request', (r) => { if (r.method() === 'PATCH') patches.push(r.url()); });
  const row = page.getByRole('row', { name: /Maison Silt/ });
  await row.getByRole('button', { name: /^Suspend/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Suspend Maison Silt?' });
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(row).toContainText('Active');
  expect(patches).toEqual([]);
});

test('confirming a suspension sends it', async ({ page }) => {
  // The write is intercepted so the shared seed data keeps every atelier active.
  await page.route('**/api/admin/sellers/*', (route) => route.fulfill({ status: 409, json: { error: { code: 'CONFLICT', message: 'intercepted' } } }));
  await signIn(page, ACCOUNTS.admin, '/admin?tab=sellers');
  await page.getByRole('row', { name: /Maison Silt/ }).getByRole('button', { name: /^Suspend/ }).click();
  const sent = page.waitForRequest((r) => r.method() === 'PATCH');
  await page.getByRole('dialog').getByRole('button', { name: 'Suspend atelier' }).click();
  expect((await sent).postDataJSON()).toEqual({ status: 'suspended' });
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('a category in use cannot be deleted, and row inputs have no visible label', async ({ page }) => {
  await signIn(page, ACCOUNTS.admin, '/admin?tab=catalog');
  await expect(page.getByRole('button', { name: 'Delete Interiors' })).toBeDisabled();
  await expect(page.getByRole('row', { name: /Interiors/ })).toContainText('In use');
  const label = page.getByText('Name of Interiors', { exact: true });
  expect((await label.boundingBox())!.width).toBeLessThanOrEqual(1);
});

test('overviews put actionable figures first', async ({ page }) => {
  await signIn(page, ACCOUNTS.admin, '/admin');
  await expect(page.getByRole('term').first()).toHaveText('Pending applications');
  await expect(page.getByRole('term').nth(1)).toHaveText('Open returns');
  await page.getByRole('definition').getByRole('link', { name: /returns/i }).click();
  await expect(page).toHaveURL(/tab=returns/);

  await page.context().clearCookies();
  await signIn(page, ACCOUNTS.vane, '/seller');
  await expect(page.getByRole('term').first()).toHaveText('To fulfil');
  await expect(page.getByRole('term').nth(1)).toHaveText('Available to withdraw');
});

test('products start on the first screen and cards show only useful stock text', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const card = page.getByRole('article').first();
  await expect(card).toBeVisible();
  expect((await card.boundingBox())!.y).toBeLessThan(700);
  await expect(page.getByRole('article').getByText('Available', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('article').getByText('Verified').first()).toBeAttached();
});

test('phone filters are collapsed and report how many are active', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/?sort=price_asc&minPrice=10000');
  const toggle = page.getByRole('button', { name: 'Filters (2)' });
  await expect(toggle).toBeVisible();
  await expect(page.getByLabel('Sort')).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByLabel('Sort')).toBeVisible();
});

test('the footer offers sign-in only to a signed-out visitor', async ({ page }) => {
  const footerSignIn = page.getByRole('contentinfo').getByRole('link', { name: 'Sign in' });
  await page.goto('/');
  await expect(footerSignIn).toBeVisible();
  await signIn(page, ACCOUNTS.buyer, '/');
  await expect(footerSignIn).toHaveCount(0);
});

test('the admin top-ateliers table shows every column beside the sidebar', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, ACCOUNTS.admin, '/admin');
  const region = page.getByRole('region', { name: 'Top ateliers by gross sales' });
  await expect(region).toBeVisible();
  expect(await region.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
});

test('a focused select shows a ring, not only a border colour change', async ({ page }) => {
  await page.goto('/');
  const sort = page.getByLabel('Sort');
  await sort.focus();
  await expect(sort).not.toHaveCSS('box-shadow', 'none');
});
