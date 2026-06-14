import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth.fixture';

test.describe('US4 — Session restoration and navigation', () => {
  test('authenticated user stays logged in on page reload', async ({ page }) => {
    await loginAs(page, 'admin@crm.local', 'Admin@123');

    // Navigate to customers
    await page.goto('/customers');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Hard refresh — session must be restored via AppInit (httpOnly refresh token cookie)
    await page.reload();
    await page.waitForTimeout(2000); // AppInit takes ~1s to restore

    // Must still be on /customers (or redirected to /dashboard), not /login
    const url = page.url();
    expect(url).not.toContain('/login');
    await expect(page.locator('h4, h5, h6').first()).toBeVisible();
  });

  test('authenticated user can navigate directly to any route', async ({ page }) => {
    await loginAs(page, 'admin@crm.local', 'Admin@123');

    // Navigate directly by URL
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Must stay on /contacts, not redirect to /login
    expect(page.url()).toContain('/contacts');
    await expect(page.getByRole('heading', { name: /contact/i })).toBeVisible();
  });

  test('login page renders without errors for unauthenticated user', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByRole('heading', { name: /sign in|crm|login/i })).toBeVisible();
  });
});
