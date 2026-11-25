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
