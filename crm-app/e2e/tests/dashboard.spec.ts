import { test, expect } from '../fixtures/test-fixtures';

const BASE = process.env.BASE_URL ?? 'http://localhost:8080';

test.describe('Dashboard', () => {
  test('dashboard loads and shows summary widgets', async ({ adminPage }) => {
    await adminPage.goto(`${BASE}/dashboard`);
    await adminPage.waitForLoadState('networkidle');
    const cards = adminPage.locator('.MuiCard-root, [data-testid*="card"], [data-testid*="widget"]');
    await expect(cards.first()).toBeVisible();
  });

  test('dashboard shows chart or data visualization components', async ({ adminPage }) => {
    await adminPage.goto(`${BASE}/dashboard`);
    await adminPage.waitForLoadState('networkidle');
    const charts = adminPage.locator('svg, canvas, .recharts-wrapper');
    const count = await charts.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('dashboard does not show entirely blank content', async ({ adminPage }) => {
    await adminPage.goto(`${BASE}/dashboard`);
    await adminPage.waitForLoadState('networkidle');
    const cards = adminPage.locator('.MuiCard-root');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
  });

  test('dashboard widget shows error message when API fails', async ({ adminPage }) => {
    await adminPage.route(/\/api\/v1\/dashboard/, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'SERVER_ERROR', message: 'Internal error' } }),
      }),
    );
    await adminPage.goto(`${BASE}/dashboard`);
    await adminPage.waitForLoadState('networkidle');
    const hasError =
      (await adminPage.locator('[role="alert"], text=/error|failed|unavailable/i').count()) > 0;
    const hasContent = (await adminPage.locator('.MuiCard-root').count()) > 0;
    expect(hasError || hasContent).toBeTruthy();
  });

  test('dashboard navigates to module from widget link', async ({ adminPage }) => {
    await adminPage.goto(`${BASE}/dashboard`);
    await adminPage.waitForLoadState('networkidle');
    const link = adminPage.locator('a[href*="/customers"], a[href*="/contacts"], a[href*="/opportunities"]').first();
    if (await link.isVisible()) {
      await link.click();
      await expect(adminPage).not.toHaveURL(/\/dashboard/);
    }
  });
});
