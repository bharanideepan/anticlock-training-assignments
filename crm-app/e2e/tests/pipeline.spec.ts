import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:8080';

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.fill('[name="email"]', process.env.E2E_ADMIN_EMAIL ?? 'admin@crm.local');
  await page.fill('[name="password"]', process.env.E2E_ADMIN_PASSWORD ?? 'Admin@123');
  await page.click('[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe('Pipeline Board', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('loads the pipeline board', async ({ page }) => {
    await page.goto(`${BASE}/pipeline`);
    await expect(page.locator('h5, h4')).toContainText(/Pipeline/i);
  });
});
