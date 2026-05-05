import { expect, test } from '@playwright/test';

test('admin can log in and delete an existing image', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());

  await page.goto('/login.html');
  await page.getByLabel('Email Address').fill('admin@example.com');
  await page.getByLabel('Password').fill('Password123!');
  await page.getByRole('button', { name: 'Login to Dashboard' }).click();

  await page.waitForURL('http://127.0.0.1:3101/');
  await expect(page.locator('#auth-status-container')).toContainText('Logged in as');
  await expect(page.locator('#image-gallery .image-card')).toHaveCount(1);

  await page.getByRole('button', { name: 'Delete image' }).click();

  await expect(page.locator('#message')).toContainText('Image deleted.');
  await expect(page.locator('#image-gallery .image-card')).toHaveCount(0);
});
