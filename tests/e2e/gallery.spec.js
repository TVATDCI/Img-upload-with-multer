import { expect, test } from '@playwright/test';

test('guest can browse the gallery landing page', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Uploaded Images' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Admin Login' })).toBeVisible();
  await expect(page.locator('#image-gallery .image-card')).toHaveCount(1);
});
