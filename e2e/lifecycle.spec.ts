// ABOUTME: M7 e2e: a buyer cancels one parcel of a two-atelier order (other parcel untouched) and a delivered parcel gets a return request.
// ABOUTME: Seller/admin steps are driven through the API with their own sessions until their consoles exist.
import { expect, test, type Page } from '@playwright/test';

async function registerBuyer(page: Page) {
  await page.goto('/sign-in');
  await page.getByRole('tab', { name: 'Create account' }).click();
  await page.getByLabel('Full name').fill('Lifecycle Buyer');
  await page.getByLabel('Email').fill(`life-${Date.now()}-${Math.floor(Math.random() * 1e5)}@example.com`);
  await page.getByLabel('Password').fill('a-long-enough-password');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('banner').getByRole('link', { name: 'Orders' })).toBeVisible();
}

async function buy(page: Page, slugs: string[]) {
  for (const slug of slugs) {
    await page.goto(`/products/${slug}`);
    await page.getByRole('button', { name: /^Reserve/ }).click();
    await expect(page.getByRole('dialog', { name: 'Your cart' })).toBeVisible();
  }
  await page.goto('/checkout');
  const d = page.getByRole('dialog', { name: 'Checkout' });
  await d.getByLabel('Street address').fill('1 Way');
  await d.getByLabel('City').fill('London');
  await d.getByLabel('State / region').fill('LDN');
  await d.getByLabel('Postal code').fill('N1');
  await d.getByLabel('Country').fill('UK');
  await d.getByRole('button', { name: 'Continue to payment' }).click();
  await d.getByRole('button', { name: 'Review order' }).click();
  await d.getByRole('button', { name: /^Place order/ }).click();
  await expect(page).toHaveURL(/\/orders\/OZ-/);
}

test('cancelling one parcel leaves the other parcel live and shows the history', async ({ page }) => {
  await registerBuyer(page);
  await buy(page, ['kanso-basalt', 'homage-01']);
  const parcels = page.getByRole('region', { name: /^Sub-order/ });
  await expect(parcels).toHaveCount(2);
  await parcels.first().getByRole('button', { name: 'Cancel this parcel' }).click();
  await page.getByRole('dialog', { name: 'Cancel this parcel?' }).getByRole('button', { name: 'Cancel parcel' }).click();
  await expect(parcels.first().getByText('Cancelled').first()).toBeVisible();
  await expect(parcels.nth(1).getByRole('button', { name: 'Cancel this parcel' })).toBeVisible();
  await expect(parcels.first().getByRole('button', { name: 'Cancel this parcel' })).toHaveCount(0);
});

test('a return request needs a reason and moves the parcel to Return requested', async ({ page }) => {
  await registerBuyer(page);
  await buy(page, ['silt-01']);
  const code = page.url().split('/').pop()!;
  // Only the atelier can ship: drive it through the API with the seeded seller account.
  const { ACCOUNTS, E2E_PASSWORD } = await import('./accounts.ts');
  const seller = await page.context().browser()!.newContext();
  const api = seller.request;
  const base = new URL(page.url()).origin;
  const login = await api.post(`${base}/api/auth/login`, { data: { email: ACCOUNTS.silt, password: E2E_PASSWORD }, headers: { origin: base } });
  expect(login.ok()).toBeTruthy();
  const sub = `${code}-A`;
  for (const body of [{ to: 'PACKED' }, { to: 'SHIPPED', trackingNumber: 'E2E-TRACK-1' }, { to: 'DELIVERED' }]) {
    const r = await api.post(`${base}/api/sub-orders/${sub}/transitions`, { data: body, headers: { origin: base } });
    expect(r.ok(), JSON.stringify(await r.json())).toBeTruthy();
  }
  await seller.close();

  await page.reload();
  const parcel = page.getByRole('region', { name: /^Sub-order/ });
  await expect(parcel.getByText('Delivered').first()).toBeVisible();
  await parcel.getByRole('button', { name: 'Request a return' }).click();
  const dialog = page.getByRole('dialog', { name: 'Request a return' });
  await dialog.getByRole('button', { name: 'Send request' }).click();
  await expect(dialog.getByText('Tell the atelier why')).toBeVisible();
  await dialog.getByLabel('Reason for the return').fill('Wrong size');
  await dialog.getByRole('button', { name: 'Send request' }).click();
  await expect(parcel.getByText('Return requested').first()).toBeVisible();
  await expect(parcel.getByText('Return reason: Wrong size')).toBeVisible();
});
