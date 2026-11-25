// ABOUTME: M8 e2e: an applicant becomes a pending atelier, drafts a piece with a photo, cannot publish; an active atelier ships a parcel.
// ABOUTME: The approval step of the full apply->approve->publish flow lives in the M9 spec once the admin console exists.
import { expect, test, type Page } from '@playwright/test';
import { ACCOUNTS } from './accounts.ts';
import { signIn } from './helpers.ts';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function apply(page: Page, atelier: string) {
  await page.goto('/sign-in');
  await page.getByRole('tab', { name: 'Sell on Ozone' }).click();
  await page.getByLabel('Full name').fill('Mira Costa');
  await page.getByLabel('Atelier name').fill(atelier);
  await page.getByLabel('Location (optional)').fill('Lisbon');
  await page.getByLabel('Email').fill(`mira-${Date.now()}-${Math.floor(Math.random() * 1e5)}@example.com`);
  await page.getByLabel('Password').fill('a-long-enough-password');
  await page.getByRole('button', { name: 'Submit application' }).click();
  await expect(page).toHaveURL(/\/seller/);
}

test('an applicant sees the pending banner, drafts a piece with a photo, and cannot publish it', async ({ page }) => {
  const atelier = `Mira Studio ${Date.now()}`;
  await apply(page, atelier);
  await expect(page.getByRole('heading', { level: 1, name: atelier })).toBeVisible();
  await expect(page.getByText('Awaiting approval').first()).toBeVisible();
  await expect(page.getByText('an Ozone admin must activate you', { exact: false })).toBeVisible();

  await page.getByRole('navigation', { name: 'Console' }).getByRole('link', { name: /^Products/ }).click();
  await expect(page.getByText('No pieces yet')).toBeVisible();
  await page.getByRole('button', { name: 'Create a piece' }).click();
  const editor = page.getByRole('dialog', { name: 'New piece' });
  await editor.getByLabel('Title').fill('Glazed Bowl');
  await editor.getByLabel('Category').selectOption({ index: 1 });
  await editor.getByLabel('Base price (USD)').fill('120.50');
  await editor.getByLabel('SKU').fill(`BOWL-${Date.now()}`);
  await editor.getByRole('button', { name: 'Create draft' }).click();

  const row = page.getByRole('row', { name: /Glazed Bowl/ });
  await expect(row).toBeVisible();
  await expect(row.getByText('Draft')).toBeVisible();
  await expect(row.getByRole('button', { name: /Publish/ })).toBeDisabled();

  await row.getByRole('button', { name: /Edit/ }).click();
  await page.getByRole('dialog', { name: /Edit Glazed Bowl/ }).getByLabel(/Add a photo/).setInputFiles({ name: 'bowl.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('button', { name: /Remove\s+photo 1/ })).toBeVisible();

});

test('an active atelier packs and ships a parcel with a tracking number; the buyer sees it', async ({ page, browser }) => {
  // Buyer places an order from Silt & Stone (seeded active atelier).
  const buyer = await browser.newContext();
  const bp = await buyer.newPage();
  await bp.goto('/sign-in');
  await bp.getByRole('tab', { name: 'Create account' }).click();
  await bp.getByLabel('Full name').fill('Parcel Buyer');
  await bp.getByLabel('Email').fill(`pb-${Date.now()}-${Math.floor(Math.random() * 1e5)}@example.com`);
  await bp.getByLabel('Password').fill('a-long-enough-password');
  await bp.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(bp.getByRole('banner').getByRole('link', { name: 'Orders' })).toBeVisible();
  await bp.goto('/products/silt-01');
  await bp.getByRole('button', { name: /^Reserve/ }).click();
  await bp.goto('/checkout');
  const d = bp.getByRole('dialog', { name: 'Checkout' });
  for (const [l, v] of [['Street address', '1 Way'], ['City', 'London'], ['State / region', 'LDN'], ['Postal code', 'N1'], ['Country', 'UK']] as const) await d.getByLabel(l).fill(v);
  await d.getByRole('button', { name: 'Continue to payment' }).click();
  await d.getByRole('button', { name: 'Review order' }).click();
  await d.getByRole('button', { name: /^Place order/ }).click();
  await expect(bp).toHaveURL(/\/orders\/OZ-/);
  const orderCode = bp.url().split('/').pop()!;

  await signIn(page, ACCOUNTS.silt, '/seller?tab=orders');
  const row = page.getByRole('row', { name: new RegExp(orderCode) });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Mark packed' }).click();
  await row.getByRole('button', { name: 'Ship' }).click();
  const dialog = page.getByRole('dialog', { name: 'Ship this parcel' });
  await dialog.getByRole('button', { name: 'Mark shipped' }).click();
  await expect(dialog.getByText('A tracking number is required')).toBeVisible();
  await dialog.getByLabel('Tracking number').fill('1Z-E2E-77');
  await dialog.getByRole('button', { name: 'Mark shipped' }).click();
  await expect(row.getByText('Tracking 1Z-E2E-77')).toBeVisible();
  await expect(row.getByRole('button', { name: 'Mark delivered' })).toBeVisible();

  await bp.reload();
  await expect(bp.getByText('Shipped').first()).toBeVisible();
  await expect(bp.getByText('Tracking:')).toBeVisible();
  await buyer.close();
});
