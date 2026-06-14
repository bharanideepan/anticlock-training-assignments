import { request, chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8080';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@crm.local';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Admin@123';
const READONLY_EMAIL = process.env.E2E_READONLY_EMAIL ?? 'readonly@crm.local';
const READONLY_PASSWORD = process.env.E2E_READONLY_PASSWORD ?? 'ReadOnly@123';

async function authenticateUser(
  email: string,
  password: string,
  stateFile: string,
): Promise<void> {
  // Step 1: Login via API to capture the crm_refresh httpOnly cookie
  const apiContext = await request.newContext({ baseURL: API_URL });
  const loginRes = await apiContext.post('/api/v1/auth/login', {
    data: { email, password },
  });

  if (!loginRes.ok()) {
    const body = await loginRes.text();
    throw new Error(`Login failed for ${email} (${loginRes.status()}): ${body}`);
  }

  const loginBody = await loginRes.json() as { data: { accessToken: string } };
  const accessToken = loginBody.data.accessToken;

  // Step 2: Grab cookies captured by the API context (includes crm_refresh)
  const apiState = await apiContext.storageState();
  await apiContext.dispose();

  // Step 3: Open a browser context, inject the cookies + token, navigate once
  // so AppInit fires and the Zustand store is hydrated before we save state.
  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL: BASE_URL,
    storageState: {
      cookies: apiState.cookies,
      origins: [
        {
          origin: BASE_URL,
          localStorage: [
            // Persist the access token so the Zustand store picks it up on hydration.
            // (The store uses in-memory state; AppInit will refresh it anyway via
            // the crm_refresh cookie, but this avoids an extra round-trip on first load.)
            { name: 'crm_access_token', value: accessToken },
          ],
        },
      ],
    },
  });

  const page = await context.newPage();
  await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 20_000 });

  await context.storageState({ path: stateFile });
  await browser.close();
}

async function globalSetup(_config: FullConfig) {
  const authDir = path.resolve('.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  await Promise.all([
    authenticateUser(ADMIN_EMAIL, ADMIN_PASSWORD, '.auth/admin.json'),
    authenticateUser(READONLY_EMAIL, READONLY_PASSWORD, '.auth/readonly.json'),
  ]);
}

export default globalSetup;
