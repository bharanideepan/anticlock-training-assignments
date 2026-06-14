import { test, expect } from '../fixtures/test-fixtures';

const BASE = process.env.BASE_URL ?? 'http://localhost:8080';

const ROUTES = [
  { path: '/dashboard', heading: /Dashboard/i },
  { path: '/customers', heading: /Customer/i },
  { path: '/contacts', heading: /Contact/i },
  { path: '/opportunities', heading: /Opportunit/i },
  { path: '/pipeline', heading: /Pipeline/i },
  { path: '/tasks', heading: /Task/i },
];

test.describe('Navigation and Routing', () => {
  for (const { path, heading } of ROUTES) {
    test(`loads ${path} route`, async ({ adminPage }) => {
      await adminPage.goto(`${BASE}${path}`);
      await adminPage.waitForLoadState('networkidle');
      await expect(adminPage.locator('h4, h5, h6').first()).toBeVisible();
    });
  }

  test('shows 404 page for unknown route', async ({ adminPage }) => {
    await adminPage.goto(`${BASE}/this-route-does-not-exist-xyz`);
    await expect(adminPage.locator('body')).toContainText(/not found|404/i);
  });

  test('shows forbidden page at /403', async ({ adminPage }) => {
    await adminPage.goto(`${BASE}/403`);
    await expect(adminPage.locator('body')).toContainText(/forbidden|not authorized|access denied|403/i);
  });

  test('navigation menu is visible when authenticated', async ({ adminPage }) => {
    await adminPage.goto(`${BASE}/dashboard`);
    const nav = adminPage.locator('nav, [role="navigation"], aside').first();
    await expect(nav).toBeVisible();
  });

  test('unauthenticated access to protected route redirects to login', async ({ page }) => {
    await page.goto(`${BASE}/customers`);
    await expect(page).toHaveURL(/\/login/);
  });
});
