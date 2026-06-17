import { test, expect } from '@playwright/test';

test.describe('Smoke', () => {
  test('application loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/CRM/i);
  });

  test('displays CRM Application text', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('CRM Application')).toBeVisible();
  });
});
