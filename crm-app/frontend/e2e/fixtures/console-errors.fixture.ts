import type { Page } from '@playwright/test';

export interface ConsoleErrorCapture {
  getErrors: () => string[];
}

export function captureConsoleErrors(page: Page): ConsoleErrorCapture {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`[console.error] ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => {
    errors.push(`[uncaught] ${err.message}`);
  });

  return { getErrors: () => [...errors] };
}
