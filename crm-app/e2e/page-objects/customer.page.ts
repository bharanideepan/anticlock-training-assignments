import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:8080';

export class CustomerListPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto(`${BASE}/customers`);
    await this.page.waitForLoadState('networkidle');
  }

  async searchFor(term: string) {
    const input = this.page.locator('input[placeholder*="Search"]').first();
    await input.fill(term);
    await this.page.waitForTimeout(600);
  }

  async applyStatusFilter(status: string) {
    const filter = this.page.locator(`[role="option"]:has-text("${status}"), option:has-text("${status}")`).first();
    if (await filter.isVisible()) {
      await filter.click();
    } else {
      const select = this.page.locator('select, [role="combobox"]').first();
      await select.selectOption({ label: status });
    }
    await this.page.waitForTimeout(400);
  }

  async resetFilters() {
    const reset = this.page.locator('button:has-text("Clear"), button:has-text("Reset"), button[aria-label*="clear" i]').first();
    if (await reset.isVisible()) await reset.click();
    await this.page.waitForTimeout(400);
  }

  async expectRowWithText(text: string) {
    await expect(
      this.page.locator(`table tr, [role="row"]`).filter({ hasText: text }).first(),
    ).toBeVisible();
  }

  async expectNoRowWithText(text: string) {
    await expect(
      this.page.locator(`table tr, [role="row"]`).filter({ hasText: text }).first(),
    ).not.toBeVisible();
  }
}

export class CustomerFormPage {
  constructor(private readonly page: Page) {}

  async gotoNew() {
    await this.page.goto(`${BASE}/customers/new`);
  }

  async gotoEdit(id: string) {
    await this.page.goto(`${BASE}/customers/${id}/edit`);
  }

  async fillCompanyName(name: string) {
    await this.page.fill('[name="companyName"]', name);
  }

  async submit() {
    await this.page.click('[type="submit"]');
  }

  async expectSuccessRedirect() {
    await expect(this.page).toHaveURL(/\/customers\/[a-zA-Z0-9-]+$/);
  }

  async expectValidationError() {
    const error = this.page.locator('text=/required|this field/i, p.Mui-error, [role="alert"]').first();
    await expect(error).toBeVisible();
  }
}
