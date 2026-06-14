# Test Suite Contract

**Feature**: 006-playwright-e2e-tests
**Date**: 2026-06-14

This document defines the interface contract between the E2E test suite and the application. It specifies what the test suite depends on from the application and CI environment.

---

## 1. Application URL Contract

The test suite connects to the application via two configurable base URLs:

| Variable | Default | Purpose |
|----------|---------|---------|
| `BASE_URL` | `http://localhost:8080` | Frontend (Vite dev server or nginx) |
| `API_URL` | `http://localhost:3000` | Backend NestJS API (for programmatic setup/teardown) |

The test suite is URL-agnostic: changing these environment variables targets a different environment (local, staging, production-mirror) with no code changes.

---

## 2. Authentication Contract

### Login Endpoint
```
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "<string>", "password": "<string>" }

→ 200 { "access_token": "<jwt>" }
→ 401 { "error": { "code": "INVALID_CREDENTIALS", "message": "..." } }
```

The global setup authenticates test users against this endpoint and persists the resulting JWT in `storageState` files.

### Auth Guard Behavior
- Unauthenticated requests to any protected route must redirect to `/login`
- The redirect must preserve the originally requested URL in `state.from` (React Router location state)
- Requests with an expired or invalid JWT must redirect to `/login` with a user-visible "session expired" indication

---

## 3. API Endpoints Used for Test Data Setup/Teardown

The `ApiHelper` uses these backend endpoints for create-from-scratch data management. All requests include `Authorization: Bearer <jwt>` from the admin test user's `storageState`.

### Customers
```
POST   /api/v1/customers        → 201 { id, companyName, status, ... }
DELETE /api/v1/customers/:id    → 200 | 204
GET    /api/v1/customers/:id    → 200 { id, companyName, ... }
```

### Contacts
```
POST   /api/v1/contacts         → 201 { id, firstName, lastName, email, customerId, ... }
DELETE /api/v1/contacts/:id     → 200 | 204
```

### Opportunities
```
POST   /api/v1/opportunities    → 201 { id, name, customerId, stageId, ... }
DELETE /api/v1/opportunities/:id → 200 | 204
GET    /api/v1/pipeline/stages  → 200 [{ id, name, order }, ...]
```

### Error Response Format
All API errors must follow the canonical format per Constitution Principle VIII:
```json
{ "error": { "code": "<string>", "message": "<string>" } }
```

---

## 4. UI Selector Contract

The test suite relies on these stable HTML attributes for assertions. The application UI must expose these selectors — if they change, the corresponding test(s) must be updated.

| Element | Expected Selector | Used In |
|---------|------------------|---------|
| Login email field | `[name="email"]` | auth.spec.ts |
| Login password field | `[name="password"]` | auth.spec.ts |
| Login submit button | `[type="submit"]` | auth.spec.ts |
| Error/alert notification | `[role="alert"]` | auth, forms specs |
| Success notification | `[role="alert"]` or `[data-testid="success-toast"]` | all CRUD specs |
| Search input | `input[placeholder*="Search"]` | customers, contacts, search specs |
| Page heading | `h4, h5` | navigation, dashboard specs |
| Confirmation dialog | `[role="dialog"]` | ux.spec.ts |
| 404 page indicator | Text containing "not found" (case-insensitive) | navigation.spec.ts |
| 403 page indicator | Text containing "forbidden" or "not authorized" | navigation.spec.ts |

**Note**: The test suite prefers semantic HTML attributes (`role`, `name`, `type`) over brittle class names or positional selectors. Where semantic attributes are absent, `data-testid` attributes should be added to the application UI.

---

## 5. Test Output Contract

The test runner produces two output artifacts after every run:

| Artifact | Path | Format | Consumed By |
|----------|------|--------|-------------|
| JUnit XML | `e2e/test-results/results.xml` | JUnit XML 1.0 | CI gate, PR annotation |
| HTML Report | `e2e/playwright-report/index.html` | Playwright HTML | Developer review |

Screenshots of failing tests are embedded in the HTML report and stored at `e2e/test-results/`.

These paths are gitignored. CI pipelines must archive them as build artifacts.

---

## 6. CI Environment Contract

The CI pipeline must provide:
- `BASE_URL`: URL of the running application under test
- `API_URL`: URL of the backend API
- `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`: Credentials for the admin test user
- `E2E_READONLY_EMAIL`, `E2E_READONLY_PASSWORD`: Credentials for the read-only test user

The CI pipeline must:
1. Start the application (frontend + backend + database) before running `pnpm --filter crm-e2e test`
2. Archive `e2e/test-results/results.xml` and `e2e/playwright-report/` as build artifacts
3. Fail the build if the Playwright exit code is non-zero

---

## 7. Parallel Worker Contract

Tests run with `fullyParallel: true` and 4 workers in CI. Each worker is identified by `workerIndex` (0–3). All test-created records include `workerIndex` in their name to guarantee uniqueness across parallel workers. Tests must not assert on the total count of records in any list (counts vary based on parallel activity).
