import { test, expect } from '../fixtures/test-fixtures';
import { CustomerListPage, CustomerFormPage } from '../page-objects/customer.page';

const BASE = process.env.BASE_URL ?? 'http://localhost:8080';

test.describe('Customers', () => {
  let customerId: string;
  let companyName: string;

  test.beforeAll(async ({ api, workerFixtureName }) => {
    companyName = `E2E-Customer-${workerFixtureName}`;
    const customer = await api.createCustomer(companyName);
    customerId = customer.id;
  });

  test.afterAll(async ({ api }) => {
    if (customerId) {
      await api.archiveCustomer(customerId).catch(() => {});
    }
  });

  test('lists customers page', async ({ adminPage }) => {
    const list = new CustomerListPage(adminPage);
    await list.goto();
    await expect(adminPage.locator('h5, h4')).toContainText(/Customer/i);
  });

  test('creates a customer with valid data', async ({ adminPage, api, workerFixtureName }) => {
    const name = `E2E-Customer-New-${workerFixtureName}`;
    const form = new CustomerFormPage(adminPage);
    await form.gotoNew();
    await form.fillCompanyName(name);
    await form.submit();
    await form.expectSuccessRedirect();
    const created = adminPage.url().match(/\/customers\/([a-zA-Z0-9-]+)$/);
    if (created?.[1]) await api.archiveCustomer(created[1]).catch(() => {});
  });

  test('shows required field error when companyName is empty', async ({ adminPage }) => {
    const form = new CustomerFormPage(adminPage);
    await form.gotoNew();
    await form.submit();
    await form.expectValidationError();
    await expect(adminPage).toHaveURL(/\/customers\/new/);
  });

  test('searches for created customer', async ({ adminPage }) => {
    const list = new CustomerListPage(adminPage);
    await list.goto();
    await list.searchFor(companyName);
    await list.expectRowWithText(companyName);
  });

  test('updates an existing customer', async ({ adminPage }) => {
    await adminPage.goto(`${BASE}/customers/${customerId}/edit`);
    await adminPage.fill('[name="industry"]', 'Technology');
    await adminPage.click('[type="submit"]');
    await expect(adminPage).toHaveURL(/\/customers\/[a-zA-Z0-9-]+$/);
  });
});
