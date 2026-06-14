import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:8080';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@crm.local';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Admin@123';

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.fill('[name="email"]', ADMIN_EMAIL);
  await page.fill('[name="password"]', ADMIN_PASSWORD);
  await page.click('[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);
}

const PAGES_TO_CHECK = [
  { name: 'Login page', path: '/login', needsAuth: false },
  { name: 'Dashboard', path: '/dashboard', needsAuth: true },
  { name: 'Customer list', path: '/customers', needsAuth: true },
  { name: 'Pipeline board', path: '/pipeline', needsAuth: true },
  { name: 'Task list', path: '/tasks', needsAuth: true },
];

for (const { name, path, needsAuth } of PAGES_TO_CHECK) {
  test(`A11y: ${name} passes WCAG 2.1 AA`, async ({ page }) => {
    if (needsAuth) await login(page);
    await page.goto(`${BASE}${path}`);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}
