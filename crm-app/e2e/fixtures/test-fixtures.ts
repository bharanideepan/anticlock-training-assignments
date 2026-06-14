import { test as base, expect, type Page } from '@playwright/test';
import { ApiHelper } from '../helpers/api.helper';

type CrmFixtures = {
  adminPage: Page;
  readonlyPage: Page;
  api: ApiHelper;
  workerFixtureName: string;
};

export const test = base.extend<CrmFixtures>({
  adminPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: '.auth/admin.json' });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },

  readonlyPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: '.auth/readonly.json' });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },

  api: async ({}, use) => {
    const helper = await ApiHelper.create();
    await use(helper);
  },

  workerFixtureName: async ({}, use, testInfo) => {
    await use(`${testInfo.workerIndex}-${Date.now()}`);
  },
});

export { expect };
