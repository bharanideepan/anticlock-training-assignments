import type { Page } from '@playwright/test';

export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|login/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}
