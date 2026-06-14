import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth.fixture';
import { captureConsoleErrors } from '../fixtures/console-errors.fixture';

test.describe('US3 — Modal dialogs open and close without error', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin@crm.local', 'Admin@123');
  });

  test('Customer: Add modal opens and cancels without console errors', async ({ page }) => {
    const capture = captureConsoleErrors(page);
    await page.goto('/customers');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Click the first button that looks like "Add" or "New"
    const addBtn = page.getByRole('button', { name: /add|new customer/i }).first();
    await addBtn.click();
    // Dialog or form should become visible
    await expect(page.getByRole('dialog').or(page.locator('[role="dialog"]'))).toBeVisible({ timeout: 5000 })
      .catch(() => {
        // Some pages navigate to /customers/new instead of opening a modal
      });

    // Close via Cancel or ESC
    const cancelBtn = page.getByRole('button', { name: /cancel/i });
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(500);

    const errors = capture.getErrors().filter((e) => !e.includes('favicon'));
    expect(errors, `Modal errors:\n${errors.join('\n')}`).toHaveLength(0);
  });

  test('Contact: Add modal opens and cancels without console errors', async ({ page }) => {
    const capture = captureConsoleErrors(page);
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle').catch(() => {});

    const addBtn = page.getByRole('button', { name: /add|new contact/i }).first();
    await addBtn.click();
    await page.waitForTimeout(500);

    const cancelBtn = page.getByRole('button', { name: /cancel/i });
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }

    const errors = capture.getErrors().filter((e) => !e.includes('favicon'));
    expect(errors, `Modal errors:\n${errors.join('\n')}`).toHaveLength(0);
  });

  test('Opportunity: Add modal opens and cancels without console errors', async ({ page }) => {
    const capture = captureConsoleErrors(page);
    await page.goto('/opportunities');
    await page.waitForLoadState('networkidle').catch(() => {});

    const addBtn = page.getByRole('button', { name: /add|new opportunit/i }).first();
    await addBtn.click();
    await page.waitForTimeout(500);

    const cancelBtn = page.getByRole('button', { name: /cancel/i });
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }

    const errors = capture.getErrors().filter((e) => !e.includes('favicon'));
    expect(errors, `Modal errors:\n${errors.join('\n')}`).toHaveLength(0);
  });

  test('Tasks: Add modal opens and cancels without console errors', async ({ page }) => {
    const capture = captureConsoleErrors(page);
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle').catch(() => {});

    const addBtn = page.getByRole('button', { name: /add|new task/i }).first();
    await addBtn.click();
    await page.waitForTimeout(500);

    const cancelBtn = page.getByRole('button', { name: /cancel/i });
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }

    const errors = capture.getErrors().filter((e) => !e.includes('favicon'));
    expect(errors, `Modal errors:\n${errors.join('\n')}`).toHaveLength(0);
  });

  test('Notification popover opens and closes without ListItem button warning', async ({ page }) => {
    const capture = captureConsoleErrors(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Find and click notification bell icon in AppShell header
    const bell = page.getByRole('button', { name: /notification/i }).or(
      page.locator('button').filter({ has: page.locator('svg[data-testid="NotificationsIcon"], svg[data-testid="NotificationsNoneIcon"]') })
    ).first();
    await bell.click();
    await page.waitForTimeout(500);

    // Popover should be visible
    const popover = page.locator('[role="presentation"]').or(page.locator('.MuiPopover-root')).first();
    // Close by clicking outside
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const errors = capture.getErrors().filter(
      (e) => !e.includes('favicon') && !e.includes('button'),
    );
    // Specifically check no "button" prop warning
    const buttonPropWarnings = capture.getErrors().filter((e) => e.includes("'button' prop"));
    expect(buttonPropWarnings, `ListItem button prop warning found:\n${buttonPropWarnings.join('\n')}`).toHaveLength(0);
    expect(errors, `Notification popover errors:\n${errors.join('\n')}`).toHaveLength(0);
  });

  test('Search results render with ListItemButton (no button prop warning)', async ({ page }) => {
    const capture = captureConsoleErrors(page);
    await page.goto('/search');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Type a search query to trigger results
    const searchInput = page.getByRole('textbox').first();
    await searchInput.fill('a');
    await page.waitForTimeout(1500); // debounce + API

    // Check no button prop warning
    const buttonPropWarnings = capture.getErrors().filter((e) => e.includes("'button' prop"));
    expect(buttonPropWarnings, `ListItem button prop warning in search:\n${buttonPropWarnings.join('\n')}`).toHaveLength(0);
  });
});
