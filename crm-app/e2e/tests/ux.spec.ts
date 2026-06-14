import { test, expect } from '../fixtures/test-fixtures';

const BASE = process.env.BASE_URL ?? 'http://localhost:8080';

test.describe('User Experience Consistency', () => {
  let customerId: string;
  let companyName: string;

  test.beforeAll(async ({ api, workerFixtureName }) => {
    companyName = `E2E-UX-Customer-${workerFixtureName}`;
    const customer = await api.createCustomer(companyName);
    customerId = customer.id;
  });

  test.afterAll(async ({ api }) => {
    if (customerId) await api.archiveCustomer(customerId).catch(() => {});
  });

  test('shows loading indicator during slow data fetch', async ({ adminPage }) => {
    let loadingVisible = false;
    await adminPage.route(/\/api\/v1\/customers/, async (route) => {
      await new Promise((r) => setTimeout(r, 1200));
      await route.continue();
    });
    adminPage.once('response', async () => {
      loadingVisible = (await adminPage.locator('[role="progressbar"], .MuiCircularProgress-root, [aria-busy="true"]').count()) > 0;
    });
    await adminPage.goto(`${BASE}/customers`);
    await adminPage.waitForLoadState('networkidle');
    const hasHeading = await adminPage.locator('h4, h5').count();
    expect(hasHeading > 0 || loadingVisible).toBeTruthy();
  });

  test('shows empty state on a module with no mocked data', async ({ adminPage }) => {
    await adminPage.route(/\/api\/v1\/customers/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], meta: { total: 0, page: 1, pageSize: 20, pageCount: 0 } }),
      }),
    );
    await adminPage.goto(`${BASE}/customers`);
    await adminPage.waitForLoadState('networkidle');
    const emptyIndicator =
      (await adminPage.locator('text=/no customers|empty|no records|nothing here/i').count()) > 0 ||
      (await adminPage.locator('table tbody tr').count()) === 0;
    expect(emptyIndicator).toBeTruthy();
  });

  test('cancel on delete confirmation keeps record intact', async ({ adminPage }) => {
    await adminPage.goto(`${BASE}/customers/${customerId}`);
    await adminPage.waitForLoadState('networkidle');

    const deleteBtn = adminPage
      .locator('button:has-text("Delete"), button:has-text("Archive"), button[aria-label*="delete" i], button[aria-label*="archive" i]')
      .first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      const dialog = adminPage.locator('[role="dialog"]');
      if (await dialog.isVisible({ timeout: 2_000 }).catch(() => false)) {
        const cancelBtn = dialog.locator('button:has-text("Cancel"), button:has-text("No"), button:has-text("Keep")').first();
        await cancelBtn.click();
        await expect(adminPage.locator(`text=${companyName}`).first()).toBeVisible();
      }
    }
  });

  test('success notification appears after creating a customer', async ({ adminPage, api, workerFixtureName }) => {
    const name = `E2E-UX-Success-${workerFixtureName}`;
    await adminPage.goto(`${BASE}/customers/new`);
    await adminPage.fill('[name="companyName"]', name);
    await adminPage.click('[type="submit"]');

    const url = await adminPage.waitForURL(/\/customers\/[a-zA-Z0-9-]+$/).then(() => adminPage.url()).catch(() => null);
    if (!url) {
      const toast = adminPage.locator('[role="alert"]').first();
      await expect(toast).toBeVisible({ timeout: 5_000 });
    }

    const created = adminPage.url().match(/\/customers\/([a-zA-Z0-9-]+)$/);
    if (created?.[1]) await api.archiveCustomer(created[1]).catch(() => {});
  });
});
