# Tasks: Playwright End-to-End Test Suite

**Input**: Design documents from `specs/006-playwright-e2e-tests/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/test-suite-contract.md ✅, quickstart.md ✅

**Tests**: This feature IS a test suite. Tasks create Playwright spec files — no meta-tests are generated.

**Organization**: Tasks are grouped by user story to enable independent implementation and validation of each story. All tasks target the `e2e/` workspace package.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on sibling tasks)
- **[Story]**: Which user story this task belongs to (US1–US6, maps to spec.md)
- Paths shown are relative to the repo root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new directories and baseline configuration files that all subsequent tasks depend on.

- [X] T001 Create directories `e2e/fixtures/`, `e2e/helpers/`, and `e2e/page-objects/` (use `mkdir -p`)
- [X] T002 Add `.auth/`, `test-results/`, and `playwright-report/` to `e2e/.gitignore` (create the file if it does not exist); ensure `.auth/*.json` auth state files are never committed

**Checkpoint**: Directory structure matches the layout in `plan.md § Source Code`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure — Playwright config, auth state generation, API helper, and shared fixtures — that every test spec depends on. No user story work can begin until this phase is complete.

**⚠️ CRITICAL**: All Phase 2 tasks must complete before any Phase 3+ task can start.

- [X] T003 Update `e2e/playwright.config.ts`: add `['junit', { outputFile: 'test-results/results.xml' }]` to the `reporter` array alongside the existing HTML reporter; set `workers: process.env.CI ? 4 : undefined` (replacing the current `workers: process.env.CI ? 1 : undefined`); add two named projects `admin` and `readonly` under `projects` array, each with a `storageState` pointing to `.auth/admin.json` and `.auth/readonly.json` respectively; keep `fullyParallel: true` and `retries: process.env.CI ? 2 : 0` unchanged
- [X] T004 Update `e2e/global-setup.ts`: authenticate the admin user using credentials from `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` env vars, then call `context.storageState({ path: '.auth/admin.json' })`; authenticate the read-only user using `E2E_READONLY_EMAIL` / `E2E_READONLY_PASSWORD` env vars, then call `context.storageState({ path: '.auth/readonly.json' })`; close both contexts when done; import `chromium` from `@playwright/test`
- [X] T005 Create `e2e/helpers/api.helper.ts`: export a class `ApiHelper` that accepts a `baseURL: string` and a `jwt: string` in its constructor; implement async methods: `createCustomer(name: string): Promise<{ id: string }>` (POST `/api/v1/customers` with `{ companyName: name, status: 'PROSPECT' }`), `deleteCustomer(id: string): Promise<void>` (DELETE `/api/v1/customers/:id`), `createContact(data: { firstName: string, lastName: string, email?: string, customerId: string }): Promise<{ id: string }>` (POST `/api/v1/contacts`), `deleteContact(id: string): Promise<void>`, `createOpportunity(data: { name: string, customerId: string, stageId: string }): Promise<{ id: string }>` (POST `/api/v1/opportunities`), `deleteOpportunity(id: string): Promise<void>`, and `getFirstPipelineStageId(): Promise<string>` (GET `/api/v1/pipeline/stages`, return first item's id); all requests include `Authorization: Bearer ${this.jwt}` and `Content-Type: application/json` headers; use Node's built-in `fetch`
- [X] T006 Create `e2e/helpers/auth.helper.ts`: export an async function `clearSession(page: Page): Promise<void>` that calls `page.evaluate(() => localStorage.clear())` then `page.context().clearCookies()`; import `Page` from `@playwright/test`
- [X] T007 Create `e2e/fixtures/test-fixtures.ts`: extend Playwright's `test` and `expect` using `test.extend<{ adminPage: Page; readonlyPage: Page; api: ApiHelper; workerFixtureName: string }>(...)`; `adminPage` fixture: create a new browser context with `storageState: '.auth/admin.json'` and return its page (close in teardown); `readonlyPage` fixture: same but with `.auth/readonly.json`; `api` fixture: extract the admin JWT from the admin `storageState` file and instantiate `ApiHelper`; `workerFixtureName` fixture: return a string suffix `${test.info().workerIndex}-${Date.now()}` for unique fixture names; export the extended `test` and `expect` from this file so all spec files import from here instead of from `@playwright/test`

**Checkpoint**: Run `pnpm --filter crm-e2e exec tsc --noEmit` — zero TypeScript errors. Auth state files `.auth/admin.json` and `.auth/readonly.json` are generated when global setup runs.

---

## Phase 3: User Story 1 — Authentication Flow Verification (Priority: P1) 🎯 MVP

**Goal**: Verify all authentication scenarios: successful login, invalid credentials, empty fields, protected route access, session expiry redirect, and RBAC denial.

**Independent Test**: `pnpm --filter crm-e2e test tests/auth.spec.ts` passes with no application changes to other modules.

### Implementation for User Story 1

- [X] T008 [US1] Refactor `e2e/tests/auth.spec.ts`: replace the inline `login()` helper with `adminPage` from `test-fixtures.ts`; import `test`, `expect` from `e2e/fixtures/test-fixtures.ts` instead of `@playwright/test`; keep the four existing tests (`redirects unauthenticated users to login`, `shows error on invalid credentials`, `logs in successfully and shows dashboard`, `logs out successfully`); add three new tests: (1) `"shows validation on empty form submission"` — navigate to `/login`, click submit without filling fields, assert that inline validation messages appear and URL stays at `/login`; (2) `"redirects to login with session expired state after clearing session"` — use `adminPage`, navigate to `/dashboard`, call `clearSession(page)`, navigate to `/customers`, assert redirect to `/login` and that a session-expired indication is visible; (3) `"read-only user is denied access to create functionality"` — use `readonlyPage`, navigate to `/customers/new`, assert redirect to `/403` or that an access-denied message is visible; use `test.use({ storageState: '.auth/admin.json' })` for the admin test group and `test.use({ storageState: '.auth/readonly.json' })` for the readonly group

**Checkpoint**: `pnpm --filter crm-e2e test tests/auth.spec.ts` — all 7 tests pass

---

## Phase 4: User Story 2 — Core CRM Entity Workflows (Priority: P1)

**Goal**: Verify full CRUD, search, and filter for Customers, Contacts, and Opportunities using create-from-scratch test data with worker-scoped unique names.

**Independent Test**: `pnpm --filter crm-e2e test tests/customers.spec.ts tests/contacts.spec.ts tests/opportunities.spec.ts` passes; no E2E records remain in the DB after the run.

### Implementation for User Story 2

- [X] T009 [P] [US2] Create `e2e/page-objects/customer.page.ts`: export class `CustomerListPage` with methods `goto()` (navigate to `/customers`), `searchFor(term: string)` (fill search input matching `input[placeholder*="Search"]` and wait for debounce), `applyStatusFilter(status: string)` (select the status filter option), `resetFilters()` (click filter reset/clear button), `getRowCount(): Promise<number>` (count visible data rows), `expectRowWithText(text: string)` (assert a row containing text is visible), `clickNew()` (click the new/create button); export class `CustomerFormPage` with methods `goto()` (navigate to `/customers/new`), `fillCompanyName(name: string)`, `submit()`, `expectSuccessNotification()`, `expectValidationError(fieldName: string)`, `expectDuplicateError()`
- [X] T010 [P] [US2] Create `e2e/page-objects/contact.page.ts`: export class `ContactListPage` with methods `goto()`, `searchFor(term: string)`, `getRowCount(): Promise<number>`, `expectRowWithText(text: string)`; export class `ContactFormPage` with methods `goto(customerId?: string)` (navigate to `/contacts/new`), `fillFirstName(name: string)`, `fillLastName(name: string)`, `fillEmail(email: string)`, `submit()`, `expectSuccessNotification()`, `expectEmailFormatError()`, `expectDuplicateError()`
- [X] T011 [P] [US2] Create `e2e/page-objects/opportunity.page.ts`: export class `OpportunityListPage` with methods `goto()`, `searchFor(term: string)`, `getRowCount(): Promise<number>`, `expectRowWithText(text: string)`; export class `OpportunityFormPage` with methods `goto()` (navigate to `/opportunities/new`), `fillName(name: string)`, `selectCustomer(companyName: string)`, `submit()`, `expectSuccessNotification()`, `expectValidationError(fieldName: string)`
- [X] T012 [US2] Refactor `e2e/tests/customers.spec.ts`: import `test`, `expect` from `e2e/fixtures/test-fixtures.ts`; use `test.use({ storageState: '.auth/admin.json' })`; in `test.beforeAll` use `api` fixture to create a customer named `E2E-Customer-${workerFixtureName}` and store its id; in `test.afterAll` delete it via `api.deleteCustomer(id)`; add tests: `"creates a customer with valid data"` (navigate to `/customers/new`, fill `companyName`, submit, assert success notification and redirect to detail page), `"shows required field error when companyName is empty"` (submit empty form, assert validation message), `"shows duplicate error for existing company name"` (attempt to create with same name as beforeAll fixture, assert duplicate error), `"lists and searches for created customer"` (go to list, search for fixture name, assert row visible), `"filters customers by status"` (apply PROSPECT filter, assert fixture row visible; apply ACTIVE filter, assert PROSPECT fixture not visible), `"resets filters to show all records"` (apply filter, reset, assert fixture visible again), `"updates an existing customer"` (navigate to `/customers/${id}/edit`, change a field, save, assert success notification); remove the old inline `login()` helper
- [X] T013 [US2] Create `e2e/tests/contacts.spec.ts`: import `test`, `expect` from `e2e/fixtures/test-fixtures.ts`; use `test.use({ storageState: '.auth/admin.json' })`; in `beforeAll` create a Customer fixture via `api.createCustomer(...)` (needed as FK for contacts) and create a Contact fixture via `api.createContact({ firstName: 'E2EFirst', lastName: 'E2ELast-${workerFixtureName}', email: 'e2e-${workerFixtureName}@test.invalid', customerId }))`; in `afterAll` delete both; tests: `"creates a contact with valid data"`, `"shows validation error for invalid email format"` (fill email with `not-an-email`, submit, assert format error message), `"shows duplicate error for same email"` (attempt to create second contact with same email, assert duplicate error), `"lists and searches for created contact"`, `"updates an existing contact"`; use `ContactFormPage` and `ContactListPage` page objects from T010
- [X] T014 [US2] Create `e2e/tests/opportunities.spec.ts`: import `test`, `expect` from `e2e/fixtures/test-fixtures.ts`; use `test.use({ storageState: '.auth/admin.json' })`; in `beforeAll` create Customer and Opportunity fixtures via `api`; in `afterAll` delete both; tests: `"creates an opportunity with valid data"` (navigate to `/opportunities/new`, fill name, select customer, submit, assert success notification), `"shows required field error when name is empty"`, `"lists and searches for created opportunity"`, `"updates an existing opportunity"`; use `OpportunityListPage` and `OpportunityFormPage` from T011

**Checkpoint**: `pnpm --filter crm-e2e test tests/customers.spec.ts tests/contacts.spec.ts tests/opportunities.spec.ts` — all tests pass; `SELECT COUNT(*) FROM "Customer" WHERE "companyName" LIKE 'E2E-Customer-%'` returns 0

---

## Phase 5: User Story 3 — Navigation and Routing Integrity (Priority: P2)

**Goal**: Verify that all top-level navigation routes load successfully, the nav menu highlights the active item, invalid routes show a 404 page, and unauthorized routes show a 403 page.

**Independent Test**: `pnpm --filter crm-e2e test tests/navigation.spec.ts` passes without any fixture data requirements.

### Implementation for User Story 3

- [X] T015 [US3] Create `e2e/tests/navigation.spec.ts`: import `test`, `expect` from `e2e/fixtures/test-fixtures.ts`; use `test.use({ storageState: '.auth/admin.json' })`; tests: `"loads dashboard route"` (navigate to `/dashboard`, assert heading contains 'Dashboard'), `"loads customers route"` (navigate to `/customers`, assert heading contains 'Customer'), `"loads contacts route"` (navigate to `/contacts`, assert heading visible), `"loads opportunities route"` (navigate to `/opportunities`, assert heading visible), `"loads pipeline route"` (navigate to `/pipeline`, assert heading contains 'Pipeline'), `"loads tasks route"` (navigate to `/tasks`, assert heading visible), `"shows 404 page for unknown route"` (navigate to `/this-route-does-not-exist-xyz`, assert page contains text matching /not found/i), `"shows 403 page for forbidden route"` (navigate to `/403` directly, assert page contains text matching /forbidden|not authorized|access denied/i), `"navigation menu highlights active item when on dashboard"` (navigate to `/dashboard`, assert the dashboard nav link has an active/selected indicator — check `aria-current="page"` or a highlighted class); use `adminPage` fixture for auth

**Checkpoint**: `pnpm --filter crm-e2e test tests/navigation.spec.ts` — all 9 tests pass

---

## Phase 6: User Story 4 — Dashboard and Data Visualization Integrity (Priority: P2)

**Goal**: Verify the dashboard renders summary widgets, handles the empty-data state gracefully, and shows per-widget error messages when data loading fails.

**Independent Test**: `pnpm --filter crm-e2e test tests/dashboard.spec.ts` passes; dashboard tests do not create or delete CRM records.

### Implementation for User Story 4

- [X] T016 [US4] Create `e2e/tests/dashboard.spec.ts`: import `test`, `expect` from `e2e/fixtures/test-fixtures.ts`; use `test.use({ storageState: '.auth/admin.json' })`; tests: `"dashboard loads and shows summary cards"` (navigate to `/dashboard`, wait for `networkidle`, assert at least one summary card/stat widget is visible using a selector like `[data-testid*="card"], .MuiCard-root`), `"dashboard shows chart components"` (navigate to `/dashboard`, assert chart SVG or canvas element is present), `"dashboard does not show blank sections"` (navigate to `/dashboard`, assert no `section` or `div` with empty text content that would indicate a silent data failure — use `expect(page.locator('.MuiCard-root')).not.toHaveCount(0)`); for the error-state test: `"dashboard widget shows error message when API call fails"` — use `page.route('**/api/v1/dashboard**', route => route.fulfill({ status: 500, body: JSON.stringify({ error: { code: 'SERVER_ERROR', message: 'Internal error' } }) }))` to intercept dashboard data requests, navigate to `/dashboard`, assert that an error message is visible and other sections of the page are still rendered; for the empty-state test: `"dashboard shows empty state messaging when no data exists"` — mock the dashboard API to return empty arrays, navigate to `/dashboard`, assert empty-state placeholder text is visible

**Checkpoint**: `pnpm --filter crm-e2e test tests/dashboard.spec.ts` — all 5 tests pass

---

## Phase 7: User Story 5 — Form Validation and User Feedback (Priority: P2)

**Goal**: Verify that all major forms enforce required fields, reject invalid formats, prevent duplicate entries, and handle server-side submission failures with user-friendly messages and preserved form data.

**Independent Test**: `pnpm --filter crm-e2e test tests/forms.spec.ts` passes; form tests clean up any records they create.

### Implementation for User Story 5

- [X] T017 [US5] Create `e2e/tests/forms.spec.ts`: import `test`, `expect` from `e2e/fixtures/test-fixtures.ts`; use `test.use({ storageState: '.auth/admin.json' })`; create and delete a Customer fixture in `beforeAll`/`afterAll` for the contact duplicate test; tests: `"customer form: shows required field error for empty company name"` (navigate to `/customers/new`, click submit without filling anything, assert `[name="companyName"]` has associated error text visible), `"customer form: shows success notification after valid submission"` (fill unique company name `E2E-FormTest-${workerFixtureName}`, submit, assert `[role="alert"]` with success text is visible, then clean up the created record via `api.deleteCustomer()`), `"contact form: shows email format error for invalid email"` (navigate to `/contacts/new`, fill firstName, lastName, fill email with `invalid-email-format`, submit, assert format error message visible adjacent to email field), `"contact form: shows duplicate entry error for existing email"` (attempt to create a second contact with same email as the beforeAll fixture, assert duplicate error visible and URL has not changed to a detail page), `"contact form: preserves form data after server error"` (use `page.route('**/api/v1/contacts', route => route.fulfill({ status: 500, ... }))` to force a server error, fill form, submit, assert error message visible and firstName field still contains the entered value)

**Checkpoint**: `pnpm --filter crm-e2e test tests/forms.spec.ts` — all 5 tests pass; no residual E2E records in DB

---

## Phase 8: User Story 6 — User Experience Consistency (Priority: P3)

**Goal**: Verify loading indicators appear during async operations, empty-state messages replace blank spaces, and confirmation dialogs gate destructive actions with the option to cancel safely.

**Independent Test**: `pnpm --filter crm-e2e test tests/search.spec.ts tests/ux.spec.ts` passes.

### Implementation for User Story 6

- [X] T018 [P] [US6] Create `e2e/tests/search.spec.ts`: import `test`, `expect` from `e2e/fixtures/test-fixtures.ts`; use `test.use({ storageState: '.auth/admin.json' })`; in `beforeAll` create a Customer fixture via `api`; in `afterAll` delete it; tests: `"global search returns matching results"` (navigate to `/search`, type the fixture's company name into the search input, wait for results, assert a result matching the name is visible), `"global search shows no-results state for unmatched query"` (type a random string that will not match any record like `ZZZNOMATCH${Date.now()}`, assert no-results message is visible), `"global search handles special characters without error"` (type `<script>alert(1)</script>` into the search field, assert no JS error dialog appears and the page remains on the search route — check `page.on('dialog', ...)` does not fire)
- [X] T019 [P] [US6] Create `e2e/tests/ux.spec.ts`: import `test`, `expect` from `e2e/fixtures/test-fixtures.ts`; use `test.use({ storageState: '.auth/admin.json' })`; in `beforeAll` create a Customer fixture via `api`; in `afterAll` delete it (if not already deleted by the delete-cancel test); tests: `"shows loading indicator during slow data fetch"` (use `page.route('**/api/v1/customers**', async route => { await new Promise(r => setTimeout(r, 1500)); route.continue(); })` to delay the customers API, navigate to `/customers`, assert a loading spinner or progress indicator is visible before the response resolves — use `page.locator('[role="progressbar"], .MuiCircularProgress-root')`), `"shows empty state message on a module with no records"` (navigate to a module guaranteed to be empty, e.g., `/activities` if no activities exist, or mock the API to return an empty array via `page.route`, assert empty-state text is visible), `"cancel on confirmation dialog leaves record intact"` (navigate to the customer detail page for the fixture, click the delete button, assert a confirmation `[role="dialog"]` appears, click the cancel/dismiss button, assert the dialog closes and the customer detail page is still showing the fixture's company name)

**Checkpoint**: `pnpm --filter crm-e2e test tests/search.spec.ts tests/ux.spec.ts` — all 6 tests pass

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation of the complete suite and CI readiness checks.

- [X] T020 Verify `e2e/.gitignore` covers `.auth/`, `test-results/`, and `playwright-report/`; run `git status` in the `e2e/` directory after a test run and confirm none of these generated paths appear as untracked files
- [X] T021 Run `CI=true pnpm --filter crm-e2e test` and verify: (1) exit code is 0, (2) `e2e/test-results/results.xml` exists and contains `<testsuites>` XML, (3) `e2e/playwright-report/index.html` exists; if any test fails, check the HTML report for screenshots and fix before proceeding
- [X] T022 Execute all quickstart.md validation scenarios in sequence: auth happy path, customer CRUD cycle with post-run DB check for residual records, RBAC access denial, parallel execution with `--workers=4`, and form validation; confirm all scenarios produce the expected outcomes documented in `quickstart.md`

**Checkpoint**: Full suite passes CI dry-run; both report artifacts generated; no E2E records left in the database

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — **BLOCKS all user story phases**
- **US1 (Phase 3)**: Depends on Phase 2 — can start immediately after Foundational
- **US2 (Phase 4)**: Depends on Phase 2 — page objects T009–T011 can run in parallel with each other; spec files T012–T014 depend on their respective page objects
- **US3 (Phase 5)**: Depends on Phase 2 only — no dependency on US1 or US2
- **US4 (Phase 6)**: Depends on Phase 2 only — no dependency on other user stories
- **US5 (Phase 7)**: Depends on Phase 2 only — has one shared Customer fixture dependency with US2 but creates its own
- **US6 (Phase 8)**: Depends on Phase 2 only — T018 and T019 can run in parallel with each other
- **Polish (Final Phase)**: Depends on all user story phases completing

### User Story Dependencies

- **US1 (P1)**: No story dependency — needs Foundation only
- **US2 (P1)**: No story dependency — needs Foundation only; page objects T009–T011 are parallelizable
- **US3 (P2)**: No story dependency — needs Foundation only
- **US4 (P2)**: No story dependency — needs Foundation only
- **US5 (P2)**: No story dependency — needs Foundation only
- **US6 (P3)**: No story dependency — needs Foundation only; T018 and T019 are parallelizable

### Within Phase 4 (US2)

```
T009 [P] customer.page.ts ─┐
T010 [P] contact.page.ts  ─┤→ T012 customers.spec.ts → T013 contacts.spec.ts → T014 opportunities.spec.ts
T011 [P] opportunity.page.ts─┘
```

---

## Parallel Example: Phase 2 (Foundational)

```bash
# T003, T004, T005, T006, T007 can all run in parallel
Task: "Update playwright.config.ts (T003)"
Task: "Update global-setup.ts (T004)"
Task: "Create api.helper.ts (T005)"
Task: "Create auth.helper.ts (T006)"
Task: "Create test-fixtures.ts (T007)"
```

## Parallel Example: Phase 4 (US2 Page Objects)

```bash
# T009, T010, T011 are fully independent files
Task: "Create customer.page.ts (T009)"
Task: "Create contact.page.ts (T010)"
Task: "Create opportunity.page.ts (T011)"
```

## Parallel Example: Phase 8 (US6 Specs)

```bash
# T018, T019 target different files with no shared state
Task: "Create search.spec.ts (T018)"
Task: "Create ux.spec.ts (T019)"
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T007) — **critical blocker**
3. Complete Phase 3: US1 Authentication (T008)
4. Complete Phase 4: US2 CRM Entities (T009–T014)
5. **STOP and VALIDATE**: Run `pnpm --filter crm-e2e test tests/auth.spec.ts tests/customers.spec.ts tests/contacts.spec.ts tests/opportunities.spec.ts` — all pass, no residual DB records
6. This delivers P1 coverage: authentication + core CRM CRUD = minimum viable test suite

### Incremental Delivery

1. Setup + Foundational → infrastructure ready
2. US1 (P1) → auth confidence
3. US2 (P1) → CRUD confidence (MVP milestone — ship if time-boxed)
4. US3 (P2) → navigation coverage
5. US4 (P2) → dashboard coverage
6. US5 (P2) → form validation coverage
7. US6 (P3) → UX + search coverage
8. Polish → CI validation + cleanup

### Parallel Team Strategy

With two developers after Phase 2 completes:
- **Developer A**: US1 (T008) → US3 (T015) → US4 (T016) → Polish
- **Developer B**: US2 page objects (T009–T011 in parallel) → US2 specs (T012–T014) → US5 (T017) → US6 (T018–T019)

---

## Notes

- `[P]` tasks operate on different files — they can be executed concurrently without conflict
- Every spec file imports `test` and `expect` from `e2e/fixtures/test-fixtures.ts`, **not** from `@playwright/test` — this enables the shared auth fixtures
- Worker-scoped fixture names (`workerFixtureName` = `${workerIndex}-${Date.now()}`) prevent data collisions when running with 4 parallel workers
- All test-created records use the `E2E-` prefix — see `data-model.md` for emergency cleanup SQL if teardown fails
- The `a11y.spec.ts` file is **kept as-is** — it already passes and is not modified by this feature
- Run `pnpm exec tsc --noEmit` inside `e2e/` after each foundational task to catch TypeScript errors early
- Commit after each checkpoint to enable easy rollback if a later spec causes regressions
