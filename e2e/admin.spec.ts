// ABOUTME: M9/M10 e2e flows 2 and 3: (2) ship -> return -> admin refund with a ledger refund_debit; (3) seller apply -> admin approve -> publish -> storefront.
// ABOUTME: Plus the admin-only Concurrency Lab. All steps go through the real UI as separate browser contexts (separate sessions).
import { expect, test, type Browser, type Page } from '@playwright/test';
import { ACCOUNTS } from './accounts.ts';
import { signIn } from './helpers.ts';

async function asUser(browser: Browser, email: string, next: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await signIn(page, email, next);
  return page;
}

async function buyerOrders(browser: Browser, slug: string) {
  const page = await (await browser.newContext()).newPage();
  await page.goto('/sign-in');
  await page.getByRole('tab', { name: 'Create account' }).click();
  await page.getByLabel('Full name').fill('Refund Buyer');
  await page.getByLabel('Email').fill(`rb-${Date.now()}-${Math.floor(Math.random() * 1e5)}@example.com`);
  await page.getByLabel('Password').fill('a-long-enough-password');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('banner').getByRole('link', { name: 'Orders' })).toBeVisible();
  await page.goto(`/products/${slug}`);
  await page.getByRole('button', { name: /^Reserve/ }).click();
  await page.goto('/checkout');
  const d = page.getByRole('dialog', { name: 'Checkout' });
  for (const [l, v] of [['Street address', '1 Way'], ['City', 'London'], ['State / region', 'LDN'], ['Postal code', 'N1'], ['Country', 'UK']] as const) await d.getByLabel(l).fill(v);
  await d.getByRole('button', { name: 'Continue to payment' }).click();
  await d.getByRole('button', { name: 'Review order' }).click();
  await d.getByRole('button', { name: /^Place order/ }).click();
  await expect(page).toHaveURL(/\/orders\/OZ-/);
  return { page, code: page.url().split('/').pop()! };
}

test('flow 2: ship, deliver, return request, admin approves -> refunded, stock back, ledger shows refund_debit', async ({ browser }) => {
  const buyer = await buyerOrders(browser, 'homage-01');
  const seller = await asUser(browser, ACCOUNTS.homage, '/seller?tab=orders');
  const row = seller.getByRole('row', { name: new RegExp(buyer.code) });
  await row.getByRole('button', { name: 'Mark packed' }).click();
  await row.getByRole('button', { name: 'Ship' }).click();
  await seller.getByRole('dialog', { name: 'Ship this parcel' }).getByLabel('Tracking number').fill('REFUND-FLOW-1');
  await seller.getByRole('dialog', { name: 'Ship this parcel' }).getByRole('button', { name: 'Mark shipped' }).click();
  await row.getByRole('button', { name: 'Mark delivered' }).click();
  await expect(row.getByText('Delivered')).toBeVisible();

  await buyer.page.reload();
  await buyer.page.getByRole('button', { name: 'Request a return' }).click();
  await buyer.page.getByLabel('Reason for the return').fill('Arrived damaged');
  await buyer.page.getByRole('button', { name: 'Send request' }).click();
  await expect(buyer.page.getByText('Return requested').first()).toBeVisible();

  const admin = await asUser(browser, ACCOUNTS.admin, '/admin?tab=returns');
  const ret = admin.getByRole('row', { name: new RegExp(buyer.code) });
  await expect(ret).toContainText('Arrived damaged');
  await ret.getByRole('button', { name: /Approve/ }).click();
  await expect(ret).toHaveCount(0);

  await buyer.page.reload();
  await expect(buyer.page.getByText('Refunded').first()).toBeVisible();
  await expect(buyer.page.getByText('Return reason: Arrived damaged')).toBeVisible();

  await seller.goto('/seller?tab=earnings');
  const refunds = seller.getByRole('row', { name: new RegExp(`Refund.*${buyer.code}`) });
  await expect(refunds).toHaveCount(1);
  await expect(refunds).toContainText('-$');
});

test('flow 3: apply -> pending -> admin approves in the console -> publish -> appears in the storefront', async ({ browser }) => {
  const title = `Lisbon Tile ${Date.now()}`;
  const atelier = `Mira Studio ${Date.now()}`;
  const applicant = await (await browser.newContext()).newPage();
  await applicant.goto('/sign-in');
  await applicant.getByRole('tab', { name: 'Sell on Ozone' }).click();
  await applicant.getByLabel('Full name').fill('Mira Costa');
  await applicant.getByLabel('Atelier name').fill(atelier);
  await applicant.getByLabel('Email').fill(`mira-${Date.now()}-${Math.floor(Math.random() * 1e5)}@example.com`);
  await applicant.getByLabel('Password').fill('a-long-enough-password');
  await applicant.getByRole('button', { name: 'Submit application' }).click();
  await expect(applicant).toHaveURL(/\/seller/);
  await applicant.getByRole('navigation', { name: 'Console' }).getByRole('link', { name: /^Products/ }).click();
  await applicant.getByRole('button', { name: 'Create a piece' }).click();
  const editor = applicant.getByRole('dialog', { name: 'New piece' });
  await editor.getByLabel('Title').fill(title);
  await editor.getByLabel('Category').selectOption({ index: 1 });
  await editor.getByLabel('Base price (USD)').fill('88');
  await editor.getByLabel('SKU').fill(`TILE-${Date.now()}`);
  await editor.getByLabel('Stock', { exact: true }).fill('3');
  await editor.getByRole('button', { name: 'Create draft' }).click();
  await expect(applicant.getByRole('row', { name: new RegExp(title) }).getByRole('button', { name: /Publish/ })).toBeDisabled();

  // not in the storefront yet
  const guest = await (await browser.newContext()).newPage();
  await guest.goto(`/?q=${encodeURIComponent(title)}`);
  await expect(guest.getByRole('link', { name: new RegExp(title) })).toHaveCount(0);

  const admin = await asUser(browser, ACCOUNTS.admin, '/admin?tab=sellers');
  const sellerRow = admin.getByRole('row', { name: new RegExp(atelier) });
  await expect(sellerRow).toContainText('Pending');
  await sellerRow.getByRole('button', { name: /Approve/ }).click();
  await expect(sellerRow).toContainText('Active');

  await applicant.reload();
  await applicant.getByRole('navigation', { name: 'Console' }).getByRole('link', { name: /^Products/ }).click();
  await applicant.getByRole('row', { name: new RegExp(title) }).getByRole('button', { name: /^Publish/ }).click();
  await expect(applicant.getByRole('row', { name: new RegExp(title) }).getByText('Published')).toBeVisible();

  await guest.goto(`/?q=${encodeURIComponent(title)}`);
  await expect(guest.getByRole('button', { name: new RegExp(title) }).or(guest.getByRole('link', { name: new RegExp(title) })).first()).toBeVisible();

  // Leave the shared test catalogue as found: other specs assert on the seeded six works.
  await applicant.getByRole('row', { name: new RegExp(title) }).getByRole('button', { name: /^Unpublish/ }).click();
  await expect(applicant.getByRole('row', { name: new RegExp(title) }).getByText('Draft')).toBeVisible();
  await guest.goto(`/?q=${encodeURIComponent(title)}`);
  await expect(guest.getByRole('button', { name: new RegExp(title) }).or(guest.getByRole('link', { name: new RegExp(title) }))).toHaveCount(0);
});

test('the Concurrency Lab runs real parallel reservations without overselling and is admin-only', async ({ browser, page }) => {
  await signIn(page, ACCOUNTS.buyer, '/admin');
  await expect(page.getByRole('heading', { name: /not allowed|forbidden|access/i }).first()).toBeVisible();

  const admin = await asUser(browser, ACCOUNTS.admin, '/admin');
  await admin.getByRole('button', { name: 'Concurrency Lab' }).click();
  const dialog = admin.getByRole('dialog', { name: 'Concurrency Lab' });
  const select = dialog.getByLabel('Edition');
  await select.selectOption({ index: 1 });
  await dialog.getByLabel('Parallel requests').fill('25');
  await dialog.getByRole('button', { name: 'Run test' }).click();
  await expect(dialog.getByText('Not oversold')).toBeVisible();
  await expect(dialog.getByText(/all 25 requests finished/)).toBeVisible();
  const granted = Number(await dialog.locator('dt:has-text("Granted") + dd').innerText());
  const conflicts = Number(await dialog.locator('dt:has-text("Conflicts") + dd').innerText());
  expect(granted + conflicts).toBe(25);
  await expect(dialog.locator('dt:has-text("Released after") + dd')).toHaveText(String(granted));
});
