import { test, expect } from '../fixtures/test-fixtures';
import { clearSession } from '../helpers/auth.helper';

const BASE = process.env.BASE_URL ?? 'http://localhost:8080';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@crm.local';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Admin@123';

test.describe('Authentication — unauthenticated flows', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await expect(page).toHaveURL(/\/login/);
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('[type="submit"]');
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  test('shows validation on empty form submission', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.click('[type="submit"]');
    await expect(page).toHaveURL(/\/login/);
    const emailField = page.locator('[name="email"]');
    await expect(emailField).toBeVisible();
  });

  test('logs in successfully and shows dashboard', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('[name="email"]', ADMIN_EMAIL);
    await page.fill('[name="password"]', ADMIN_PASSWORD);
    await page.click('[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h5, h4')).toContainText('Dashboard');
  });

  test('logs out successfully', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.fill('[name="email"]', ADMIN_EMAIL);
    await page.fill('[name="password"]', ADMIN_PASSWORD);
    await page.click('[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
    await page.click('text=Out');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Authentication — authenticated admin flows', () => {
  test('authenticated user can access protected pages', async ({ adminPage }) => {
    await adminPage.goto(`${BASE}/dashboard`);
    await expect(adminPage).toHaveURL(/\/dashboard/);
    await expect(adminPage.locator('h5, h4')).toContainText('Dashboard');
  });

  test('redirects to login with cleared session', async ({ adminPage }) => {
    await adminPage.goto(`${BASE}/dashboard`);
    await expect(adminPage).toHaveURL(/\/dashboard/);
    await clearSession(adminPage);
    await adminPage.goto(`${BASE}/customers`);
    await expect(adminPage).toHaveURL(/\/login/);
  });
});

test.describe('Authentication — RBAC denial', () => {
  test('read-only user is denied access to customer creation', async ({ readonlyPage }) => {
    await readonlyPage.goto(`${BASE}/customers/new`);
    const url = readonlyPage.url();
    const isDenied =
      url.includes('/403') ||
      url.includes('/login') ||
      (await readonlyPage.locator('[role="alert"], text=/forbidden|not authorized|access denied/i').isVisible());
    expect(isDenied).toBeTruthy();
  });
});
