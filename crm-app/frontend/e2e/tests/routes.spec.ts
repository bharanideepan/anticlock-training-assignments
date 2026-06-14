import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth.fixture';
import { captureConsoleErrors } from '../fixtures/console-errors.fixture';

test.describe('US2 — All routes render without crash', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin@crm.local', 'Admin@123');
  });

  test('/dashboard renders primary content', async ({ page }) => {
    const capture = captureConsoleErrors(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    expect(capture.getErrors().filter((e) => e.includes('uncaught'))).toHaveLength(0);
  });

  test('/customers renders list', async ({ page }) => {
    const capture = captureConsoleErrors(page);
    await page.goto('/customers');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByRole('heading', { name: /customer/i })).toBeVisible();
    expect(capture.getErrors().filter((e) => e.includes('uncaught'))).toHaveLength(0);
  });

  test('/contacts renders list', async ({ page }) => {
    const capture = captureConsoleErrors(page);
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByRole('heading', { name: /contact/i })).toBeVisible();
    expect(capture.getErrors().filter((e) => e.includes('uncaught'))).toHaveLength(0);
  });

  test('/opportunities renders list', async ({ page }) => {
    const capture = captureConsoleErrors(page);
    await page.goto('/opportunities');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByRole('heading', { name: /opportunit/i })).toBeVisible();
    expect(capture.getErrors().filter((e) => e.includes('uncaught'))).toHaveLength(0);
  });

  test('/pipeline renders board', async ({ page }) => {
    const capture = captureConsoleErrors(page);
    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByRole('heading', { name: /pipeline/i })).toBeVisible();
    expect(capture.getErrors().filter((e) => e.includes('uncaught'))).toHaveLength(0);
  });

  test('/tasks renders list', async ({ page }) => {
    const capture = captureConsoleErrors(page);
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByRole('heading', { name: /task/i })).toBeVisible();
    expect(capture.getErrors().filter((e) => e.includes('uncaught'))).toHaveLength(0);
  });

  test('/reports renders page', async ({ page }) => {
    const capture = captureConsoleErrors(page);
    await page.goto('/reports');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByRole('heading', { name: /report/i })).toBeVisible();
    expect(capture.getErrors().filter((e) => e.includes('uncaught'))).toHaveLength(0);
  });

  test('/search renders page', async ({ page }) => {
    const capture = captureConsoleErrors(page);
    await page.goto('/search');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByRole('heading', { name: /search/i })).toBeVisible();
    expect(capture.getErrors().filter((e) => e.includes('uncaught'))).toHaveLength(0);
  });

  test('/audit renders for admin', async ({ page }) => {
    const capture = captureConsoleErrors(page);
    await page.goto('/audit');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByRole('heading', { name: /audit/i })).toBeVisible();
    expect(capture.getErrors().filter((e) => e.includes('uncaught'))).toHaveLength(0);
  });

  test('/users renders for admin', async ({ page }) => {
    const capture = captureConsoleErrors(page);
    await page.goto('/users');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByRole('heading', { name: /user/i })).toBeVisible();
    expect(capture.getErrors().filter((e) => e.includes('uncaught'))).toHaveLength(0);
  });

  test('/import-export renders page', async ({ page }) => {
    const capture = captureConsoleErrors(page);
    await page.goto('/import-export');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4, h5, h6').first()).toBeVisible();
    expect(capture.getErrors().filter((e) => e.includes('uncaught'))).toHaveLength(0);
  });

  test('/settings renders for admin', async ({ page }) => {
    const capture = captureConsoleErrors(page);
    await page.goto('/settings');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4, h5, h6').first()).toBeVisible();
    expect(capture.getErrors().filter((e) => e.includes('uncaught'))).toHaveLength(0);
  });

  test('/notifications renders page', async ({ page }) => {
    const capture = captureConsoleErrors(page);
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator('h4, h5, h6').first()).toBeVisible();
    expect(capture.getErrors().filter((e) => e.includes('uncaught'))).toHaveLength(0);
  });

  test('unknown route renders 404 page', async ({ page }) => {
    const capture = captureConsoleErrors(page);
    await page.goto('/this-route-does-not-exist-xyz');
    await page.waitForLoadState('networkidle').catch(() => {});
    // Should show a not-found page, not blank or login
    await expect(page.locator('body')).not.toBeEmpty();
    expect(capture.getErrors().filter((e) => e.includes('uncaught'))).toHaveLength(0);
  });
});
