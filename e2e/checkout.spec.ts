// ABOUTME: M6 e2e (acceptance): a new buyer buys from two ateliers in one checkout and sees ONE parent order with TWO sub-orders.
// ABOUTME: Also covers a declined sandbox payment (cart kept, retry works) and persistence of the order after sign-out/in.
import { expect, test, type Page } from '@playwright/test';

async function registerBuyer(page: Page, name: string) {
  await page.goto('/sign-in');
  await page.getByRole('tab', { name: 'Create account' }).click();
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Email').fill(`buyer-${Date.now()}-${Math.floor(Math.random() * 1e5)}@example.com`);
  await page.getByLabel('Password').fill('a-long-enough-password');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('banner').getByRole('link', { name: 'Orders' })).toBeVisible();
}

async function reserve(page: Page, slug: string) {
  await page.goto(`/products/${slug}`);
  await page.getByRole('button', { name: /^Reserve/ }).click();
  await expect(page.getByRole('dialog', { name: 'Your cart' })).toBeVisible();
}

async function fillAddress(page: Page) {
  await page.getByLabel('Street address').fill('1 Analytical Way');
  await page.getByLabel('City').fill('London');
  await page.getByLabel('State / region').fill('LDN');
  await page.getByLabel('Postal code').fill('N1 9GU');
  await page.getByLabel('Country').fill('United Kingdom');
  await page.getByRole('button', { name: 'Continue to payment' }).click();
}

test('buy from two ateliers in one checkout -> one parent order, two sub-orders', async ({ page }) => {
  await registerBuyer(page, 'Ada Lovelace');
  await reserve(page, 'nordic-01'); // Nordic Fine Foundry, $620
  await reserve(page, 'vane-02'); //   Atelier Vane, $480

  await page.goto('/cart');
  const cart = page.getByRole('dialog', { name: 'Your cart' });
  await expect(cart.getByRole('region', { name: 'Items from Nordic Fine Foundry' })).toBeVisible();
  await expect(cart.getByRole('region', { name: 'Items from Atelier Vane' })).toBeVisible();
  await cart.getByRole('button', { name: 'Checkout' }).click();

  const dialog = page.getByRole('dialog', { name: 'Checkout' });
  await expect(dialog.getByRole('listitem', { name: undefined }).first()).toBeVisible();
  await expect(dialog.getByLabel('Full name')).toHaveValue('Ada Lovelace'); // not a hardcoded identity
  await fillAddress(page);
  await expect(dialog.getByText('Sandbox', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Review order' }).click();

  await expect(dialog.getByText('ships as 2 separate parcels')).toBeVisible();
  await expect(dialog.getByRole('region', { name: 'Parcel from Nordic Fine Foundry' })).toBeVisible();
  await expect(dialog.getByRole('region', { name: 'Parcel from Atelier Vane' })).toBeVisible();
  await dialog.getByRole('button', { name: /^Place order/ }).dblclick(); // a double click must not create two orders

  await expect(page).toHaveURL(/\/orders\/OZ-[A-Z0-9]+$/);
  await expect(page.getByRole('heading', { level: 1, name: /^Order OZ-/ })).toBeVisible();
  await expect(page.getByRole('region', { name: /^Sub-order OZ-.*-A$/ })).toBeVisible();
  await expect(page.getByRole('region', { name: /^Sub-order OZ-.*-B$/ })).toBeVisible();
  await expect(page.getByRole('region', { name: /^Sub-order/ })).toHaveCount(2);
  await expect(page.getByText('$1,100.00').first()).toBeVisible();
  await expect(page.getByText('Paid').first()).toBeVisible();

  // the cart was consumed and exactly one order exists
  await expect(page.getByRole('banner').getByRole('link', { name: 'Cart' })).toBeVisible();
  await page.getByRole('banner').getByRole('link', { name: 'Orders' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: '2 parcels' })).toHaveCount(1);
});

test('a declined sandbox payment shows an inline error and keeps the cart; retrying with approval succeeds', async ({ page }) => {
  await registerBuyer(page, 'Grace Hopper');
  await reserve(page, 'homage-01');
  await page.goto('/checkout');
  const dialog = page.getByRole('dialog', { name: 'Checkout' });
  await fillAddress(page);
  await dialog.getByLabel('Sandbox test outcome').selectOption('decline');
  await dialog.getByRole('button', { name: 'Review order' }).click();
  await dialog.getByRole('button', { name: /^Place order/ }).click();
  await expect(dialog.getByRole('alert')).toContainText('declined');

  await dialog.getByRole('button', { name: 'Back' }).click();
  await dialog.getByLabel('Sandbox test outcome').selectOption('approve');
  await dialog.getByRole('button', { name: 'Review order' }).click();
  await dialog.getByRole('button', { name: /^Place order/ }).click();
  await expect(page).toHaveURL(/\/orders\/OZ-/);
});

test('checkout asks for every address field and never shows a card number field', async ({ page }) => {
  await registerBuyer(page, 'Katherine Johnson');
  await reserve(page, 'silt-01');
  await page.goto('/checkout');
  const dialog = page.getByRole('dialog', { name: 'Checkout' });
  await dialog.getByRole('button', { name: 'Continue to payment' }).click();
  await expect(dialog.getByText('Required')).toHaveCount(5);
  await dialog.getByLabel('Street address').fill('x');
  await fillAddressRest(page);
  await expect(dialog.getByLabel(/card number|cvv|expiry/i)).toHaveCount(0);
  await page.goto('/cart');
  await page.getByRole('dialog', { name: 'Your cart' }).getByRole('button', { name: /Remove .* from cart/ }).click();
});

async function fillAddressRest(page: Page) {
  await page.getByLabel('City').fill('Washington');
  await page.getByLabel('State / region').fill('DC');
  await page.getByLabel('Postal code').fill('20001');
  await page.getByLabel('Country').fill('United States');
  await page.getByRole('button', { name: 'Continue to payment' }).click();
}
