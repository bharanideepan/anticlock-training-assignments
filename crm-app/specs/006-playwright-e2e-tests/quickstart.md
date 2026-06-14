# Quickstart: Running the E2E Test Suite

**Feature**: 006-playwright-e2e-tests
**Date**: 2026-06-14

---

## Prerequisites

1. **Application running**: Both frontend and backend must be accessible.
   ```bash
   # Start with Docker Compose (recommended)
   docker compose -f docker-compose.dev.yml up -d
   # OR start manually
   cd backend && pnpm start:dev   # NestJS on :3000
   cd frontend && pnpm dev        # Vite on :5173 (proxied to :8080)
   ```

2. **Test user accounts exist** in the database:
   - Admin user: `SYSTEM_ADMINISTRATOR` role
   - Read-only user: `READ_ONLY` role
   - Seed the DB if needed: `cd backend && pnpm seed`

3. **Environment variables set** (create `e2e/.env.test` — gitignored):
   ```
   BASE_URL=http://localhost:8080
   API_URL=http://localhost:3000
   E2E_ADMIN_EMAIL=admin@crm.local
   E2E_ADMIN_PASSWORD=Admin@123
   E2E_READONLY_EMAIL=readonly@crm.local
   E2E_READONLY_PASSWORD=ReadOnly@123
   ```

4. **Playwright browsers installed**:
   ```bash
   cd e2e && pnpm exec playwright install chromium
   ```

---

## Running the Tests

### Full suite (parallel, headless)
```bash
cd e2e && pnpm test
# or from workspace root:
pnpm --filter crm-e2e test
```

### Specific test file
```bash
cd e2e && pnpm test tests/auth.spec.ts
cd e2e && pnpm test tests/customers.spec.ts
```

### Headed mode (watch tests run in browser)
```bash
cd e2e && pnpm test:headed
```

### Interactive UI mode (Playwright UI)
```bash
cd e2e && pnpm exec playwright test --ui
```

### View HTML report from last run
```bash
cd e2e && pnpm report
```

---

## Validation Scenarios (prove the suite works end-to-end)

### 1. Authentication Happy Path
**Command**: `pnpm test tests/auth.spec.ts`
**Expected**: All auth tests pass. Confirm:
- `logs in successfully and shows dashboard` passes
- `redirects unauthenticated users to login` passes
- `shows error on invalid credentials` passes

### 2. Customer CRUD Cycle
**Command**: `pnpm test tests/customers.spec.ts`
**Expected**: All customer tests pass. Confirm:
- A customer is created with a unique `E2E-Customer-*` name
- The customer appears in the list
- The customer is updated
- The customer is deleted in teardown (verify no `E2E-Customer-*` records remain after run)

**Post-run data check**:
```bash
# Connect to the test database and verify no E2E records leaked
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Customer\" WHERE \"companyName\" LIKE 'E2E-Customer-%';"
# Expected: 0
```

### 3. RBAC Access Denial
**Command**: `pnpm test tests/auth.spec.ts --grep "read-only"`
**Expected**: Tests confirm the read-only user cannot access create/edit/delete functionality. The `/403` page or access-denied message is shown.

### 4. Parallel Execution
**Command**: `pnpm test --workers=4`
**Expected**: All tests pass without cross-worker data conflicts. Check that test execution time is under 10 minutes.

### 5. Form Validation
**Command**: `pnpm test tests/forms.spec.ts`
**Expected**:
- Required field errors appear when submitting empty forms
- Email format error appears for invalid email format
- Duplicate entry error appears when creating a duplicate record

### 6. Session Expiry Redirect
**Command**: `pnpm test tests/auth.spec.ts --grep "session"`
**Expected**: After clearing browser storage, navigating to a protected page redirects to `/login` with a session-expired message.

### 7. Full CI Run (simulate CI conditions)
```bash
CI=true pnpm --filter crm-e2e test
```
**Expected**:
- `e2e/test-results/results.xml` is generated (JUnit XML)
- `e2e/playwright-report/index.html` is generated (HTML report)
- Exit code is 0 if all tests pass
- 90%+ pass rate across 5 consecutive runs with no code changes

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `ERR_CONNECTION_REFUSED` on `BASE_URL` | Application not running | Start the app with `docker compose up -d` |
| Auth tests fail with "Invalid credentials" | Test user not seeded | Run `cd backend && pnpm seed` |
| E2E records left in DB after failed run | Teardown not reached (test error) | Run emergency cleanup SQL from `data-model.md` |
| Tests flaky with "element not found" | Parallel workers sharing data | Check that fixture names include `workerIndex` |
| `results.xml` not found after run | `testResultsDir` not set | Verify `playwright.config.ts` has JUnit reporter configured |

---

## File Locations

| Artifact | Path |
|----------|------|
| Playwright config | `e2e/playwright.config.ts` |
| Global setup | `e2e/global-setup.ts` |
| Auth state files (gitignored) | `e2e/.auth/` |
| Shared fixtures | `e2e/fixtures/test-fixtures.ts` |
| API helper | `e2e/helpers/api.helper.ts` |
| Test specs | `e2e/tests/*.spec.ts` |
| JUnit XML output | `e2e/test-results/results.xml` |
| HTML report | `e2e/playwright-report/index.html` |

See `contracts/test-suite-contract.md` for the full API and selector dependency list.
See `data-model.md` for the test data entity definitions and fixture naming conventions.
