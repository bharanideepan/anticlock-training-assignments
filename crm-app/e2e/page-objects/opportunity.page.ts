import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:8080';

export class OpportunityListPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto(`${BASE}/opportunities`);
    await this.page.waitForLoadState('networkidle');
  }

  async searchFor(term: string) {
    const input = this.page.locator('input[placeholder*="Search"]').first();
    await input.fill(term);
    await this.page.waitForTimeout(600);
  }

  async expectRowWithText(text: string) {
    await expect(
      this.page.locator(`table tr, [role="row"]`).filter({ hasText: text }).first(),
    ).toBeVisible();
  }
}

export class OpportunityFormPage {
  constructor(private readonly page: Page) {}

  async gotoNew() {
    await this.page.goto(`${BASE}/opportunities/new`);
  }

  async fillName(name: string) {
    await this.page.fill('[name="name"]', name);
  }

  async submit() {
    await this.page.click('[type="submit"]');
  }

  async expectSuccessRedirect() {
    await expect(this.page).toHaveURL(/\/opportunities\/[a-zA-Z0-9-]+$/);
  }

  async expectValidationError() {
    const error = this.page.locator('p.Mui-error, [role="alert"]').first();
    await expect(error).toBeVisible();
  }
}
