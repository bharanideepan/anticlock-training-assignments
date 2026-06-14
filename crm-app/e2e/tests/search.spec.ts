import { test, expect } from '../fixtures/test-fixtures';

const BASE = process.env.BASE_URL ?? 'http://localhost:8080';

test.describe('Search', () => {
  let customerId: string;
  let companyName: string;

  test.beforeAll(async ({ api, workerFixtureName }) => {
    companyName = `E2E-Search-${workerFixtureName}`;
    const customer = await api.createCustomer(companyName);
    customerId = customer.id;
  });

  test.afterAll(async ({ api }) => {
    if (customerId) await api.archiveCustomer(customerId).catch(() => {});
  });

  test('global search returns matching results', async ({ adminPage }) => {
    await adminPage.goto(`${BASE}/search`);
    const input = adminPage.locator('input[placeholder*="Search"], input[type="search"]').first();
    await input.fill(companyName);
    await adminPage.waitForTimeout(800);
    await expect(adminPage.locator(`text=${companyName}`).first()).toBeVisible({ timeout: 5_000 });
  });

  test('global search shows no-results state for unmatched query', async ({ adminPage }) => {
    await adminPage.goto(`${BASE}/search`);
    const input = adminPage.locator('input[placeholder*="Search"], input[type="search"]').first();
    await input.fill(`ZZZNOMATCH${Date.now()}`);
    await adminPage.waitForTimeout(800);
    const noResults = adminPage.locator('text=/no results|nothing found|empty/i').first();
    const hasNoResults = (await noResults.count()) > 0;
    const rowCount = await adminPage.locator('table tr[role="row"], [role="row"]').count();
    expect(hasNoResults || rowCount === 0).toBeTruthy();
  });

  test('global search handles special characters without error', async ({ adminPage }) => {
    let dialogFired = false;
    adminPage.on('dialog', () => { dialogFired = true; });
    await adminPage.goto(`${BASE}/search`);
    const input = adminPage.locator('input[placeholder*="Search"], input[type="search"]').first();
    await input.fill('<script>alert(1)</script>');
    await adminPage.waitForTimeout(800);
    expect(dialogFired).toBeFalsy();
    await expect(adminPage).toHaveURL(/\/search/);
  });

  test('customer module search returns matching results', async ({ adminPage }) => {
    await adminPage.goto(`${BASE}/customers`);
    const input = adminPage.locator('input[placeholder*="Search"]').first();
    await input.fill(companyName);
    await adminPage.waitForTimeout(600);
    await expect(
      adminPage.locator(`table tr, [role="row"]`).filter({ hasText: companyName }).first(),
    ).toBeVisible();
  });

  test('customer module search shows empty state for no matches', async ({ adminPage }) => {
    await adminPage.goto(`${BASE}/customers`);
    const input = adminPage.locator('input[placeholder*="Search"]').first();
    await input.fill(`ZZZNOMATCH${Date.now()}`);
    await adminPage.waitForTimeout(600);
    const noData =
      (await adminPage.locator('text=/no results|no customers|empty/i').count()) > 0 ||
      (await adminPage.locator('table tbody tr').count()) === 0;
    expect(noData).toBeTruthy();
  });
});
