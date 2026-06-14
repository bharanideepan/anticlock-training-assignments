import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:8080';

export class ContactListPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto(`${BASE}/contacts`);
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

export class ContactFormPage {
  constructor(private readonly page: Page) {}

  async gotoNew() {
    await this.page.goto(`${BASE}/contacts/new`);
  }

  async gotoEdit(id: string) {
    await this.page.goto(`${BASE}/contacts/${id}/edit`);
  }

  async fillFirstName(name: string) {
    await this.page.fill('[name="firstName"]', name);
  }

  async fillLastName(name: string) {
    await this.page.fill('[name="lastName"]', name);
  }

  async fillEmail(email: string) {
    await this.page.fill('[name="email"]', email);
  }

  async submit() {
    await this.page.click('[type="submit"]');
  }

  async expectSuccessRedirect() {
    await expect(this.page).toHaveURL(/\/contacts\/[a-zA-Z0-9-]+$/);
  }

  async expectEmailFormatError() {
    const error = this.page.locator('p.Mui-error, [role="alert"], text=/invalid email/i').first();
    await expect(error).toBeVisible();
  }

  async expectValidationError() {
    const error = this.page.locator('p.Mui-error, [role="alert"]').first();
    await expect(error).toBeVisible();
  }
}
