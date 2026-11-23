// ABOUTME: M5 e2e: reserve, cart drawer (qty, remove, countdown), sign-in redirect, and a real two-browser lost race.
// ABOUTME: Each test removes what it reserved so later specs see the seeded stock.
import { expect, test } from '@playwright/test';
import { ACCOUNTS } from './accounts.ts';
import { signIn } from './helpers.ts';

test('a signed-out visitor reserving is sent to sign-in and returns to the same product', async ({ page }) => {
  await page.goto('/products/nordic-01');
  await page.getByRole('button', { name: /^Reserve/ }).click();
  await expect(page).toHaveURL(/sign-in\?next=%2Fproducts%2Fnordic-01/);
  await signIn(page, ACCOUNTS.buyer, '/products/nordic-01');
  await expect(page.getByRole('dialog', { name: 'Brutalist Bronze Candle Sconce' })).toBeVisible();
});

test('reserve shows the cart with a ~10:00 hold, quantity stepping and removal', async ({ page }) => {
  await signIn(page, ACCOUNTS.buyer, '/products/nordic-01');
  await page.getByLabel('Quantity').selectOption('2');
  await page.getByRole('button', { name: /^Reserve/ }).click();

  const cart = page.getByRole('dialog', { name: 'Your cart' });
  await expect(cart).toBeVisible();
  await expect(cart.getByText('Brutalist Bronze Candle Sconce')).toBeVisible();
  await expect(cart.getByRole('timer')).toContainText(/\b(9:[3-5]\d|10:00)\b/);
  await expect(cart.getByText('$1,240.00')).toHaveCount(2); // line total and subtotal, 2 x $620 priced by the server
  await expect(page.getByRole('banner').getByRole('link', { name: 'Cart, 2 items' })).toBeVisible();

  await cart.getByRole('button', { name: 'Decrease quantity' }).click();
  await expect(cart.getByText('$620.00')).toHaveCount(2);
  await expect(page.getByRole('banner').getByRole('link', { name: 'Cart, 1 item' })).toBeVisible();

  await cart.getByRole('button', { name: /Remove .* from cart/ }).click();
  await expect(cart.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
});

test('the cart is server-side: it survives a cleared browser (new context, sign in again)', async ({ browser }) => {
  const a = await browser.newContext();
  const pa = await a.newPage();
  await signIn(pa, ACCOUNTS.buyer, '/products/vane-02');
  await pa.getByRole('button', { name: /^Reserve/ }).click();
  await expect(pa.getByRole('dialog', { name: 'Your cart' }).getByText('Subtractive Travertine Incense Bowl')).toBeVisible();
  await a.close();

  const b = await browser.newContext(); // brand new storage: no cookies, no localStorage
  const pb = await b.newPage();
  await signIn(pb, ACCOUNTS.buyer, '/cart');
  const cart = pb.getByRole('dialog', { name: 'Your cart' });
  await expect(cart.getByText('Subtractive Travertine Incense Bowl')).toBeVisible();
  await cart.getByRole('button', { name: /Remove .* from cart/ }).click();
  await expect(cart.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
  await b.close();
});

test('two browsers race for the last unit: the loser gets a "Just taken" notice and nothing is oversold', async ({ browser }) => {
  const slug = 'kanso-basalt'; // seeded with stock 1
  const loserCtx = await browser.newContext();
  const loser = await loserCtx.newPage();
  const email = `racer-${Date.now()}@example.com`;
  await loser.goto('/sign-in');
  await loser.getByRole('tab', { name: 'Create account' }).click();
  await loser.getByLabel('Full name').fill('Late Racer');
  await loser.getByLabel('Email').fill(email);
  await loser.getByLabel('Password').fill('a-long-enough-password');
  await loser.getByRole('button', { name: 'Create account', exact: true }).click();
  await loser.goto(`/products/${slug}`);
  await expect(loser.getByText('1 available')).toBeVisible(); // loser's page is now stale-able

  const winnerCtx = await browser.newContext();
  const winner = await winnerCtx.newPage();
  await signIn(winner, ACCOUNTS.buyer, `/products/${slug}`);
  await winner.getByRole('button', { name: /^Reserve/ }).click();
  await expect(winner.getByRole('dialog', { name: 'Your cart' })).toBeVisible();

  await loser.getByRole('button', { name: /^Reserve/ }).click();
  await expect(loser.getByRole('alert').filter({ hasText: 'Just taken' })).toBeVisible();
  await loser.reload();
  await expect(loser.getByText('Sold out').first()).toBeVisible();

  await winner.getByRole('button', { name: /Remove .* from cart/ }).click(); // release for later specs
  await expect(winner.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
  await loserCtx.close();
  await winnerCtx.close();
});
