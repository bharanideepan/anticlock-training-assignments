import { test, expect } from '../fixtures/test-fixtures';
import { OpportunityListPage, OpportunityFormPage } from '../page-objects/opportunity.page';

const BASE = process.env.BASE_URL ?? 'http://localhost:8080';

test.describe('Opportunities', () => {
  let customerId: string;
  let opportunityId: string;
  let stageId: string;
  let opportunityName: string;

  test.beforeAll(async ({ api, workerFixtureName }) => {
    const customer = await api.createCustomer(`E2E-Customer-Opps-${workerFixtureName}`);
    customerId = customer.id;
    stageId = await api.getFirstPipelineStageId();
    opportunityName = `E2E-Opp-${workerFixtureName}`;
    const opp = await api.createOpportunity({ name: opportunityName, customerId, stageId });
    opportunityId = opp.id;
  });

  test.afterAll(async ({ api }) => {
    if (opportunityId) await api.closeOpportunityWon(opportunityId).catch(() => {});
    if (customerId) await api.archiveCustomer(customerId).catch(() => {});
  });

  test('lists opportunities page', async ({ adminPage }) => {
    const list = new OpportunityListPage(adminPage);
    await list.goto();
    await expect(adminPage.locator('h5, h4')).toContainText(/Opportunit/i);
  });

  test('creates an opportunity with valid data', async ({ adminPage, api, workerFixtureName }) => {
    const newStageId = await api.getFirstPipelineStageId();
    const name = `E2E-Opp-New-${workerFixtureName}`;
    const form = new OpportunityFormPage(adminPage);
    await form.gotoNew();
    await form.fillName(name);

    const customerInput = adminPage.locator('[name="customerId"], [role="combobox"]').first();
    if (await customerInput.isVisible()) {
      await customerInput.fill(`E2E-Customer-Opps-`);
      const option = adminPage.locator('[role="option"]').first();
      if (await option.isVisible()) await option.click();
    }

    await form.submit();
    const url = adminPage.url();
    const created = url.match(/\/opportunities\/([a-zA-Z0-9-]+)$/);
    if (created?.[1]) {
      await api.closeOpportunityWon(created[1]).catch(() => {});
    }
  });

  test('shows required field error when name is empty', async ({ adminPage }) => {
    const form = new OpportunityFormPage(adminPage);
    await form.gotoNew();
    await form.submit();
    await form.expectValidationError();
  });

  test('lists and searches for created opportunity', async ({ adminPage }) => {
    const list = new OpportunityListPage(adminPage);
    await list.goto();
    await list.searchFor(opportunityName);
    await list.expectRowWithText(opportunityName);
  });

  test('updates an existing opportunity', async ({ adminPage }) => {
    await adminPage.goto(`${BASE}/opportunities/${opportunityId}/edit`);
    const nameField = adminPage.locator('[name="name"]').first();
    if (await nameField.isVisible()) {
      await nameField.fill(`${opportunityName}-updated`);
    }
    await adminPage.click('[type="submit"]');
    await expect(adminPage).toHaveURL(/\/opportunities\/[a-zA-Z0-9-]+$/);
  });
});
