import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth.fixture';

test.describe('US2 — Role guard redirects unauthorized access gracefully', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'salesrep@crm.local', 'SalesRep@123');
  });

  test('/audit redirects sales rep without crash', async ({ page }) => {
    await page.goto('/audit');
    await page.waitForLoadState('networkidle').catch(() => {});
    const url = page.url();
    // Must redirect to /403 or /dashboard — not crash or stay on /audit
    expect(url).toMatch(/\/(403|dashboard|forbidden)/);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('/settings redirects sales rep without crash', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle').catch(() => {});
    const url = page.url();
    expect(url).toMatch(/\/(403|dashboard|forbidden)/);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('/users redirects sales rep without crash', async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('networkidle').catch(() => {});
    const url = page.url();
    expect(url).toMatch(/\/(403|dashboard|forbidden)/);
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
