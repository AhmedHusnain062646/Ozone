// ABOUTME: M4 e2e against seeded data: search/filter/sort/pagination, product modal, wishlist, and reviews.
// ABOUTME: Server-side behaviour is asserted through the visible UI and the URL, not by mocking the API.
import { expect, test } from '@playwright/test';
import { ACCOUNTS } from './accounts.ts';
import { signIn } from './helpers.ts';

const cards = (page: import('@playwright/test').Page) => page.locator('article');

test('the storefront lists the six published seeded works and hides the pending atelier', async ({ page }) => {
  await page.goto('/');
  await expect(cards(page)).toHaveCount(6);
  await expect(page.getByText('Kurogane Forge')).toHaveCount(0);
});

test('search, category and sort are applied by the server and reflected in the URL', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Search').fill('travertine');
  await page.getByLabel('Search').press('Enter');
  await expect(cards(page)).toHaveCount(2);
  await expect(page).toHaveURL(/q=travertine/);

  await page.getByLabel('Sort').selectOption('price_asc');
  await expect(cards(page).first()).toContainText('Subtractive Travertine Incense Bowl');
  await page.getByLabel('Sort').selectOption('price_desc');
  await expect(cards(page).first()).toContainText('Monolithic Travertine Vessel');

  await page.getByLabel('Search').fill('');
  await page.getByLabel('Search').press('Enter');
  await page.getByLabel('Category').selectOption({ label: 'Fashion (1)' });
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first()).toContainText('Flax Kimono');
});

test('a search with no results shows the empty state and Clear filters restores the list', async ({ page }) => {
  await page.goto('/?q=zzzz-no-match');
  await expect(page.getByRole('heading', { name: 'No works match your search' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(cards(page)).toHaveCount(6);
});

test('the product modal deep-links, shows editions, and Escape returns to the catalog with filters kept', async ({ page }) => {
  await page.goto('/?q=bronze');
  await cards(page).first().getByRole('link').click();
  const dialog = page.getByRole('dialog', { name: 'Brutalist Bronze Candle Sconce' });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/products\/nordic-01\?q=bronze/);
  await expect(dialog.getByText('Batch IV')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/\?q=bronze/);

  await page.goto('/products/vane-01'); // direct deep link
  await expect(page.getByRole('dialog', { name: /Travertine Vessel/ })).toBeVisible();
  await expect(page.getByText('Sold out')).toBeVisible(); // the exhausted Calacatta edition
});

test('an unknown product slug shows an error state, not a blank modal', async ({ page }) => {
  await page.goto('/products/no-such-work');
  await expect(page.getByRole('alert')).toContainText('Product not found');
});

test('the wishlist heart sends a signed-out visitor to sign-in, then saves and lists the work', async ({ page }) => {
  await page.goto('/');
  await cards(page).first().getByRole('button', { name: /Save .* to wishlist/ }).click();
  await expect(page).toHaveURL(/sign-in\?next=/);
  await signIn(page, ACCOUNTS.buyer);
  const heart = cards(page).first().getByRole('button', { name: /wishlist/ });
  await heart.click();
  await expect(heart).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('banner').getByRole('link', { name: 'Wishlist' }).click();
  await expect(cards(page)).toHaveCount(1);
  await cards(page).first().getByRole('button', { name: /Remove .* from wishlist/ }).click();
  await expect(page.getByRole('heading', { name: 'Nothing saved yet' })).toBeVisible();
});

test('the wishlist route requires sign-in', async ({ page }) => {
  await page.goto('/wishlist');
  await expect(page).toHaveURL(/sign-in\?next=%2Fwishlist/);
});

test('a buyer with a delivered purchase can review once; others see no form', async ({ page }) => {
  await page.goto('/products/vane-02');
  await expect(page.getByRole('form', { name: 'Write a review' })).toHaveCount(0);
  await signIn(page, ACCOUNTS.buyer, '/products/vane-02');
  const form = page.getByRole('form', { name: 'Write a review' });
  await expect(form).toBeVisible();
  await form.getByLabel('Title').fill('Quietly perfect');
  await form.getByLabel('Comment').fill('Heavy, calm, and exactly as described.');
  await form.getByText('4', { exact: true }).click();
  await expect(form.getByRole('radio', { name: '4' })).toBeChecked();
  await form.getByRole('button', { name: 'Publish review' }).click();
  await expect(page.getByText('Quietly perfect')).toBeVisible();
  await expect(page.getByText('Verified purchase').first()).toBeVisible();
  await expect(page.getByRole('form', { name: 'Write a review' })).toHaveCount(0);
});
