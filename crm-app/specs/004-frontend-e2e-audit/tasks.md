# Tasks: Frontend End-to-End Audit & Error Remediation

**Input**: Design documents from `specs/004-frontend-e2e-audit/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, contracts/routes.md ✓, quickstart.md ✓

**Tests**: Playwright E2E tests are the primary deliverable of this feature. All routes and modals must be covered.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- All file paths are relative to `crm-app/` repo root

---

## Phase 1: Setup (Playwright Installation & Structure)

**Purpose**: Install Playwright and create the E2E test directory structure before any test writing can begin.

- [X] T001 Add `@playwright/test` to `frontend/package.json` devDependencies (`pnpm add -D @playwright/test` from `frontend/`)
- [X] T002 Install Playwright Chromium browser (`npx playwright install chromium` from `frontend/`)
- [X] T003 Create `frontend/playwright.config.ts` with `testDir: './e2e/tests'`, `baseURL: 'http://localhost:5173'`, and `viewport: { width: 1440, height: 900 }`
- [X] T004 Create directory structure: `frontend/e2e/fixtures/` and `frontend/e2e/tests/`

---

## Phase 2: Foundational (Shared Test Utilities)

**Purpose**: Auth fixture and console error capture helper used by ALL test files. Must exist before any test can be written.

**⚠️ CRITICAL**: No user story test work can begin until this phase is complete.

- [X] T005 Create `frontend/e2e/fixtures/auth.fixture.ts` — exports `loginAs(page, email, password)` helper: navigates to `/login`, fills email + password, clicks submit, waits for URL to contain `/dashboard`
- [X] T006 Create `frontend/e2e/fixtures/console-errors.fixture.ts` — exports `captureConsoleErrors(page)` that attaches `page.on('console')` (type=`error`) and `page.on('pageerror')` listeners and returns `getErrors(): string[]`

**Checkpoint**: Fixtures ready — all user story test phases can now begin.

---

## Phase 3: User Story 1 — Zero Console Errors on Page Load (Priority: P1) 🎯 MVP

**Goal**: Fix all known MUI v9 API violations that produce console errors, verified by TypeScript compile check.

**Independent Test**: Run `npx tsc --noEmit` from `frontend/` → zero errors. Open browser DevTools on each fixed page → zero red console messages.

### Source Code Fixes for User Story 1

- [X] T007 [P] [US1] Fix `frontend/src/modules/dashboard/DashboardPage.tsx` — replace all 12 `<Grid item xs={N} sm={N} md={N} lg={N}>` occurrences with `<Grid size={{ xs: N, sm: N, md: N, lg: N }}>` (MUI v9 Grid v2 API; removes `React does not recognize the 'xs'/'item' prop` warnings)
- [X] T008 [P] [US1] Fix `frontend/src/modules/notifications/NotificationCenter.tsx` — replace `<ListItem button onClick={...} sx={...}>` with `<ListItemButton onClick={...} sx={...}>` and add `ListItemButton` to the import from `@mui/material` (removes `React does not recognize the 'button' prop` warning)
- [X] T009 [P] [US1] Fix `frontend/src/modules/search/SearchPage.tsx` — replace all 5 `<ListItem key={...} button onClick={...} divider>` occurrences with `<ListItemButton key={...} onClick={...} divider>` and add `ListItemButton` to the import from `@mui/material`

### Test for User Story 1

- [X] T010 [US1] Write `frontend/e2e/tests/console-errors.spec.ts` — single test per route that: (1) calls `loginAs(page, 'admin@crm.local', 'Admin@123')`, (2) attaches console error capture, (3) navigates to the route, (4) waits 1 second for async rendering, (5) asserts `getErrors()` is empty. Cover all 18 protected routes from `contracts/routes.md`.
- [X] T011 [US1] Run TypeScript compile check: `cd frontend && npx tsc --noEmit` — must exit with code 0

**Checkpoint**: Zero `console.error` events on DashboardPage, NotificationCenter, and SearchPage. TypeScript compiles cleanly.

---

## Phase 4: User Story 2 — All Routes Render Without Crash (Priority: P1)

**Goal**: Every route produces visible page content. Also covers User Story 4 (session restoration) since both depend on correct page rendering after navigation.

**Independent Test**: `npx playwright test e2e/tests/routes.spec.ts` passes with all routes rendering the expected heading or primary content element.

### Test for User Story 2 (includes US4 — session restoration)

- [X] T012 [P] [US2] Write `frontend/e2e/tests/routes.spec.ts` — for each route in `contracts/routes.md` (Protected Routes table): navigate to route as admin, assert a visible heading or primary container is present, assert no page crash (no error boundary text visible). Use `loginAs` fixture. Group routes by module for readability.
- [X] T013 [P] [US2] Write `frontend/e2e/tests/role-guard.spec.ts` — verify that `salesrep@crm.local` visiting `/audit`, `/settings`, and `/users` is redirected to `/403` or `/dashboard` without a crash or blank page.
- [X] T014 [P] [US4] Write `frontend/e2e/tests/auth.spec.ts` — (1) Login as admin, navigate to `/customers`, call `page.reload()`, assert URL is still `/customers` and page content is visible (not `/login`). (2) Login, navigate to `/dashboard`, navigate directly to `/contacts`, assert contacts page loads without redirect.

### Source Code Fixes for User Story 2/4 (if tests reveal issues)

- [ ] T015 [US2] After running T012–T014, fix any route that produces an error boundary or redirects unexpectedly. Document each fix inline with a comment referencing the console error message. (Conditional — only if tests fail.)

**Checkpoint**: All 18+ routes pass. Session survives `page.reload()`. Role guard redirects work.

---

## Phase 5: User Story 3 — Modal Dialogs Open and Close Without Error (Priority: P2)

**Goal**: All create/edit/delete modals and the notification popover open and close without console errors.

**Independent Test**: `npx playwright test e2e/tests/modals.spec.ts` passes for all modal open/close cycles.

### Test for User Story 3

- [X] T016 [P] [US3] Write `frontend/e2e/tests/modals.spec.ts` — for each page with a create/edit button: (1) navigate to the list page, (2) attach console error capture, (3) click the "Add"/"New" button, (4) assert modal/dialog is visible, (5) click Cancel or the X icon, (6) assert modal is closed, (7) assert `getErrors()` is empty. Cover: CustomerListPage (Add Customer), ContactListPage (Add Contact), OpportunityListPage (Add Opportunity), TaskListPage (Add Task).
- [X] T017 [P] [US3] Extend `frontend/e2e/tests/modals.spec.ts` — add test for notification popover: click the bell icon in AppShell header, assert notification popover is visible, assert no `ListItem button` warning in console errors, click outside to close, assert popover dismissed.

### Source Code Fixes for User Story 3 (if tests reveal issues)

- [ ] T018 [US3] After running T016–T017, fix any modal that produces console errors during open/close. (Conditional — only if tests fail.)

**Checkpoint**: All modals open and close cleanly. Notification popover opens and closes without `button` prop warning.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Full audit run, TypeScript validation, and cleanup.

- [ ] T019 Run full Playwright suite: `cd frontend && npx playwright test` — all tests must pass
- [X] T020 [P] Run TypeScript compile: `cd frontend && npx tsc --noEmit` — zero errors
- [ ] T021 [P] Run ESLint: `cd frontend && npx eslint src/ --ext .ts,.tsx` — zero errors or warnings related to the changed files
- [X] T022 Add `e2e/` and `playwright-report/` and `test-results/` to `frontend/.gitignore` if not present (prevent Playwright output from being committed)
- [ ] T023 Update `specs/004-frontend-e2e-audit/quickstart.md` if any unexpected steps were needed during execution

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (Playwright installed and dirs exist)
- **US1 Source Fixes (Phase 3, T007–T009)**: Can run immediately after Phase 1 (no test dependency)
- **US1 Test (Phase 3, T010)**: Depends on Phase 2 (fixtures exist) and T007–T009 (fixes applied)
- **US2/US4 Tests (Phase 4)**: Depends on Phase 2 (fixtures exist)
- **US3 Tests (Phase 5)**: Depends on Phase 2 (fixtures exist)
- **Polish (Phase 6)**: Depends on all story phases complete

### User Story Dependencies

- **US1 (P1)**: Can start fixing source code (T007–T009) immediately after Phase 1
- **US2 (P1)**: Can write tests after Phase 2; source fixes (T015) are conditional on test results
- **US4 (P1)**: Same as US2 — can write auth.spec.ts after Phase 2
- **US3 (P2)**: Can start after Phase 2; lower priority than US1/US2/US4

### Within Each Phase

- Source code fixes (T007, T008, T009) touch different files — all three run in parallel [P]
- Test files (T010, T012, T013, T014, T016, T017) touch different files — all run in parallel [P]
- TypeScript check (T011) must follow the source code fixes (T007–T009)

---

## Parallel Execution Example: Phase 3

```bash
# Run source code fixes simultaneously (different files, no conflict):
Task T007: Fix DashboardPage.tsx — Grid item → Grid size
Task T008: Fix NotificationCenter.tsx — ListItem button → ListItemButton
Task T009: Fix SearchPage.tsx — ListItem button (×5) → ListItemButton

# After all three complete:
Task T010: Write console-errors.spec.ts
Task T011: TypeScript compile check
```

---

## Implementation Strategy

### MVP First (User Story 1 — Source Fixes Only)

1. Complete Phase 1: Playwright setup
2. Apply T007, T008, T009 (source fixes — no test runner needed)
3. Run `npx tsc --noEmit` → confirm clean compile
4. Open browser manually at `/dashboard`, `/search`, `/notifications` → confirm zero red console errors
5. **STOP and VALIDATE**: Three specific pages are clean

### Full Audit Delivery

1. Complete Phase 1 + Phase 2 → infrastructure ready
2. Apply source fixes (T007–T009) → known issues resolved
3. Write and run Phase 3 tests (T010–T011) → US1 verified
4. Write and run Phase 4 tests (T012–T014) → US2/US4 verified
5. Write and run Phase 5 tests (T016–T017) → US3 verified
6. Run Phase 6 polish → clean bill of health

---

## Notes

- Source code fixes (T007–T009) are mechanical MUI v9 migrations — no logic changes, only component API changes
- US4 (session restore) was already fixed in the prior session via `AppInit.tsx` — T014 verifies it works, not implements it
- The conditional fixes (T015, T018) only apply if Playwright tests reveal issues beyond the known MUI v9 problems
- Playwright output directories (`playwright-report/`, `test-results/`) must be git-ignored (T022)
- Each `[P]` task touches a different file — safe to run in parallel without merge conflicts
