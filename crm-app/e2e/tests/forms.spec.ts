import { test, expect } from '../fixtures/test-fixtures';

const BASE = process.env.BASE_URL ?? 'http://localhost:8080';

test.describe('Form Validation', () => {
  let customerId: string;

  test.beforeAll(async ({ api, workerFixtureName }) => {
    const customer = await api.createCustomer(`E2E-Customer-Forms-${workerFixtureName}`);
    customerId = customer.id;
  });

  test.afterAll(async ({ api }) => {
    if (customerId) await api.archiveCustomer(customerId).catch(() => {});
  });

  test('customer form: required field error for empty companyName', async ({ adminPage }) => {
    await adminPage.goto(`${BASE}/customers/new`);
    await adminPage.click('[type="submit"]');
    const error = adminPage.locator('p.Mui-error, [role="alert"], text=/required/i').first();
    await expect(error).toBeVisible();
    await expect(adminPage).toHaveURL(/\/customers\/new/);
  });

  test('customer form: valid submission shows success and redirects', async ({ adminPage, api, workerFixtureName }) => {
    const name = `E2E-FormTest-${workerFixtureName}`;
    await adminPage.goto(`${BASE}/customers/new`);
    await adminPage.fill('[name="companyName"]', name);
    await adminPage.click('[type="submit"]');
    await expect(adminPage).toHaveURL(/\/customers\/[a-zA-Z0-9-]+$/, { timeout: 8_000 });
    const created = adminPage.url().match(/\/customers\/([a-zA-Z0-9-]+)$/);
    if (created?.[1]) await api.archiveCustomer(created[1]).catch(() => {});
  });

  test('contact form: email format error for invalid email', async ({ adminPage }) => {
    await adminPage.goto(`${BASE}/contacts/new`);
    await adminPage.fill('[name="firstName"]', 'E2EFirst');
    await adminPage.fill('[name="lastName"]', 'E2ELast');
    await adminPage.fill('[name="email"]', 'not-a-valid-email');
    await adminPage.click('[type="submit"]');
    const error = adminPage.locator('p.Mui-error, text=/invalid email/i, [role="alert"]').first();
    await expect(error).toBeVisible();
  });

  test('contact form: preserves data after server error', async ({ adminPage }) => {
    await adminPage.route(/\/api\/v1\/contacts$/, (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'SERVER_ERROR', message: 'Something went wrong' } }),
      }),
    );
    await adminPage.goto(`${BASE}/contacts/new`);
    await adminPage.fill('[name="firstName"]', 'E2EPreserve');
    await adminPage.fill('[name="lastName"]', 'TestLast');
    await adminPage.click('[type="submit"]');
    const firstNameField = adminPage.locator('[name="firstName"]');
    if (await firstNameField.isVisible()) {
      await expect(firstNameField).toHaveValue('E2EPreserve');
    }
    const errorVisible =
      (await adminPage.locator('[role="alert"], text=/error|failed|wrong/i').count()) > 0;
    const stayedOnPage = adminPage.url().includes('/contacts/new');
    expect(errorVisible || stayedOnPage).toBeTruthy();
  });
});
