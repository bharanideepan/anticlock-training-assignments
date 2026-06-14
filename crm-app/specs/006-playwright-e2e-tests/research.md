# Research: Playwright E2E Test Suite

**Phase**: 0 — Research
**Date**: 2026-06-14
**Feature**: 006-playwright-e2e-tests

---

## Decision 1: Test Framework Version & Configuration

**Decision**: Use the existing `@playwright/test` ^1.48.0 in the `e2e/` package (already installed). No version upgrade required.

**Rationale**: The `e2e/` package already has Playwright installed and a working `playwright.config.ts`. Building on the existing setup avoids bootstrap overhead and keeps pnpm workspace dependencies consistent.

**Alternatives considered**:
- Upgrade to 1.60.x (also installed in frontend devDeps): Not needed; 1.48.x has all required features (storageState, JUnit reporter, parallel workers, screenshots-on-failure).
- Migrate tests into the `frontend/` package: Rejected — keeping `e2e/` as a dedicated package maintains clean separation between application code and E2E tests.

---

## Decision 2: Authentication State Strategy

**Decision**: Use Playwright's `storageState` mechanism. A global setup script authenticates both test users (admin and read-only) once per test run and saves their browser storage state to `.auth/admin.json` and `.auth/readonly.json`. Individual test files declare which stored state to use via project fixtures — no per-test login required.

**Rationale**: Re-logging in for every test adds 1–3 seconds per test and increases flakiness. `storageState` is the Playwright-recommended pattern for sharing sessions across tests; it is secure (files are gitignored), fast, and well-supported.

**Alternatives considered**:
- Per-test login helper (current approach in existing specs): Slow and redundant; creates shared global state via browser cookies that can bleed between parallel workers.
- Cookie injection via API: More complex setup; `storageState` achieves the same result with less code.

---

## Decision 3: Test Data Strategy (Confirmed in Spec Clarification Q1)

**Decision**: Create-from-scratch isolation. Every test that requires CRM records creates them via the application API during test setup (`test.beforeEach` or `test.beforeAll` at worker scope) and deletes them in teardown. No pre-seeded baseline dataset is assumed.

**Implementation approach**: A shared `ApiHelper` class wraps the backend REST API endpoints with authenticated HTTP calls (using the test user's JWT from `storageState`). Each test receives its own uniquely-named fixtures (e.g., `E2E-Customer-${workerIndex}-${Date.now()}`).

**Rationale**: Ensures full independence between tests and CI runs. Eliminates flakiness caused by stale seed data or records left by previous failed runs. Aligns with FR-010, FR-012, and SC-007.

**Alternatives considered**:
- Database-level seed + teardown via Prisma: Requires database access from the test runner; couples tests to DB implementation. Rejected per spec assumption ("API-level mocking or stubbing is not required").
- Pre-seeded read-only dataset: Tests reading from shared data cannot mutate it safely in parallel workers. Rejected for full isolation.

---

## Decision 4: Parallel Execution Configuration (Confirmed in Spec Clarification Q5)

**Decision**: Enable `fullyParallel: true` (already set). Increase CI workers from the current value of `1` to `4` to meet the SC-003 10-minute execution target. Worker-scoped test data (unique names per `workerIndex`) prevents cross-worker data conflicts.

**Rationale**: `workers: 1` in CI negates the `fullyParallel` setting and will cause the suite to exceed the 10-minute target as coverage grows. `workerIndex` is a Playwright built-in that provides a stable per-worker integer, enabling safe parallel record creation without coordination.

**Alternatives considered**:
- Shard-based parallelism across multiple CI jobs: More infrastructure complexity; 4 workers per runner is sufficient given the expected test count.
- `test.serial()` mode: Defeats the purpose of parallel execution; only appropriate for tests that cannot be isolated (none in this suite given the create-from-scratch strategy).

---

## Decision 5: CI Reporting Format (Confirmed in Spec Clarification Q3)

**Decision**: Configure two reporters in `playwright.config.ts`:
1. `['junit', { outputFile: 'test-results/results.xml' }]` — machine-readable CI gate format
2. `['html', { outputFolder: 'playwright-report', open: 'never' }]` — human-readable failure report with screenshots

**Rationale**: JUnit XML is natively consumed by GitHub Actions, GitLab CI, and Jenkins for PR annotations and pass/fail gates. HTML report provides developers a clickable failure summary with attached screenshots. Both are produced in a single test run at no performance cost.

**Alternatives considered**:
- `@playwright/test` default reporter only: No structured output; CI cannot parse pass/fail counts or annotate PRs.
- Third-party reporters (Allure, etc.): Additional dependency with no meaningful advantage over built-in HTML for this use case.

---

## Decision 6: Application Entity Mapping (Spec vs. Codebase)

**Decision**: Map the spec's entity terminology to actual application entities:

| Spec Term | Application Entity | Route Prefix | Uniqueness Key |
|-----------|-------------------|--------------|----------------|
| Accounts / Leads | Customer (status=PROSPECT for leads) | `/customers` | `companyName` |
| Contacts | Contact | `/contacts` | `email` (nullable in DB; validation enforced at form level) |
| Deals | Opportunity | `/opportunities` | `name` (per customer) |

**Rationale**: The CRM uses "Customers" (not "Accounts") and has no separate "Leads" entity — a Customer in PROSPECT status fulfills the lead concept. Tests must target the real route and field names.

**Note on Contact email uniqueness**: `email` is `String?` (nullable) in the Prisma schema, meaning DB-level uniqueness is not enforced. The duplicate-entry test for Contacts should verify that the *form validation* or *API layer* returns an error for duplicate emails, not rely on a DB constraint.

---

## Decision 7: Roles for RBAC Tests

**Decision**: Use two test accounts:
- Admin user: `SYSTEM_ADMINISTRATOR` role — full access for positive CRUD scenarios
- Restricted user: `READ_ONLY` role — used for access-restriction tests (cannot create/edit/delete)

**Rationale**: `READ_ONLY` is the most restrictive named role and cleanly tests the denial path for create/edit/delete operations. Additional role tests (e.g., SALES_REPRESENTATIVE vs SALES_MANAGER) are deferred to a future iteration as they require understanding per-module permission matrices.

---

## Decision 8: Page Object Model Adoption

**Decision**: Use lightweight page objects for the three primary entity modules (Customer, Contact, Opportunity). Navigation and auth tests use direct Playwright API without page objects due to lower complexity.

**Rationale**: Page objects centralize selector definitions — when the UI changes, only the page object needs updating, not every test. Given 3 entity modules with list/form/detail views each, the maintenance benefit outweighs the setup cost. Full page-object coverage (dashboard, pipeline, etc.) is deferred to keep initial scope manageable.

**Alternatives considered**:
- No page objects (current approach): Works for small suites; becomes a maintenance burden when selectors change across many files.
- Full page object coverage: High upfront cost; add incrementally as the suite grows.

---

## Decision 9: Session Expiry Test Strategy

**Decision**: Simulate session expiry by clearing the browser's storage (localStorage and cookies) mid-test via `page.evaluate()` and then triggering a navigation action. Assert that the application redirects to `/login` with a session-expired message.

**Rationale**: True server-side session expiry is time-based and impractical to wait for in a test. Clearing client-side auth tokens (JWT stored in localStorage) is functionally equivalent from the UI's perspective — the next API call will receive a 401 and the AuthGuard will redirect to login. This avoids test timers while validating the same user-visible behavior.
