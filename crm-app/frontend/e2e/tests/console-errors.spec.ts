import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth.fixture';
import { captureConsoleErrors } from '../fixtures/console-errors.fixture';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/customers',
  '/customers/new',
  '/contacts',
  '/contacts/new',
  '/opportunities',
  '/opportunities/new',
  '/pipeline',
  '/tasks',
  '/notifications',
  '/reports',
  '/search',
  '/audit',
  '/users',
  '/users/new',
  '/import-export',
  '/settings',
];

test.describe('US1 — Zero console errors on page load', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin@crm.local', 'Admin@123');
  });

  for (const route of PROTECTED_ROUTES) {
    test(`${route} renders with zero console errors`, async ({ page }) => {
      const capture = captureConsoleErrors(page);

      await page.goto(route);
      // Wait for lazy-loaded content to finish rendering
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(1000);

      const errors = capture.getErrors().filter(
        // Exclude known benign network errors for optional third-party resources
        (e) => !e.includes('favicon') && !e.includes('ERR_ABORTED'),
      );

      expect(errors, `Console errors on ${route}:\n${errors.join('\n')}`).toHaveLength(0);
    });
  }
});
