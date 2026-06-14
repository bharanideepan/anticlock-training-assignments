import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,
  retries: 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1440, height: 900 },
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
