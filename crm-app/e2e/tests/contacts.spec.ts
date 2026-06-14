import { test, expect } from '../fixtures/test-fixtures';
import { ContactListPage, ContactFormPage } from '../page-objects/contact.page';

const BASE = process.env.BASE_URL ?? 'http://localhost:8080';

test.describe('Contacts', () => {
  let customerId: string;
  let contactId: string;
  let contactEmail: string;
  let lastName: string;

  test.beforeAll(async ({ api, workerFixtureName }) => {
    const customer = await api.createCustomer(`E2E-Customer-Contacts-${workerFixtureName}`);
    customerId = customer.id;
    contactEmail = `e2e-${workerFixtureName}@test.invalid`;
    lastName = `E2ELast-${workerFixtureName}`;
    const contact = await api.createContact({
      firstName: 'E2EFirst',
      lastName,
      email: contactEmail,
      customerId,
    });
    contactId = contact.id;
  });

  test.afterAll(async ({ api }) => {
    if (contactId) await api.deleteContact(contactId).catch(() => {});
    if (customerId) await api.archiveCustomer(customerId).catch(() => {});
  });

  test('lists contacts page', async ({ adminPage }) => {
    const list = new ContactListPage(adminPage);
    await list.goto();
    await expect(adminPage.locator('h5, h4')).toContainText(/Contact/i);
  });

  test('creates a contact with valid data', async ({ adminPage, api, workerFixtureName }) => {
    const newEmail = `e2e-new-${workerFixtureName}@test.invalid`;
    const form = new ContactFormPage(adminPage);
    await form.gotoNew();
    await form.fillFirstName('E2EFirst');
    await form.fillLastName(`E2ENew-${workerFixtureName}`);
    await form.fillEmail(newEmail);

    const customerSelect = adminPage.locator('[name="customerId"], select[name="customerId"]').first();
    if (await customerSelect.isVisible()) {
      await customerSelect.selectOption({ value: customerId });
    }

    await form.submit();
    const url = adminPage.url();
    const created = url.match(/\/contacts\/([a-zA-Z0-9-]+)$/);
    if (created?.[1]) await api.deleteContact(created[1]).catch(() => {});
  });

  test('shows email format error for invalid email', async ({ adminPage }) => {
    const form = new ContactFormPage(adminPage);
    await form.gotoNew();
    await form.fillFirstName('E2EFirst');
    await form.fillLastName('E2ETest');
    await form.fillEmail('not-an-email-format');
    await form.submit();
    await form.expectEmailFormatError();
  });

  test('searches for created contact', async ({ adminPage }) => {
    const list = new ContactListPage(adminPage);
    await list.goto();
    await list.searchFor(lastName);
    await list.expectRowWithText('E2EFirst');
  });

  test('updates an existing contact', async ({ adminPage }) => {
    await adminPage.goto(`${BASE}/contacts/${contactId}/edit`);
    await adminPage.fill('[name="designation"]', 'Test Engineer');
    await adminPage.click('[type="submit"]');
    await expect(adminPage).toHaveURL(/\/contacts\/[a-zA-Z0-9-]+$/);
  });
});
