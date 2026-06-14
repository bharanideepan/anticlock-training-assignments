# Implementation Plan: Playwright End-to-End Test Suite

**Branch**: `006-playwright-e2e-tests` | **Date**: 2026-06-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-playwright-e2e-tests/spec.md`

## Summary

Expand the existing skeleton Playwright E2E suite (`e2e/`) into a comprehensive functional test suite covering authentication, RBAC, navigation, Customer/Contact/Opportunity CRUD, dashboard, forms validation, search/filtering, and UX consistency. The suite runs in parallel with worker-scoped test data isolation, produces JUnit XML and HTML reports for CI, and meets the 10-minute execution target. No new packages or infrastructure are introduced — the implementation builds entirely on the existing `e2e/` pnpm workspace package and `@playwright/test` 1.48.

## Technical Context

**Language/Version**: TypeScript 5.6 / Node.js 20.x

**Primary Dependencies**: `@playwright/test` ^1.48.0 (e2e package), pnpm workspace

**Storage**: PostgreSQL (via backend API — tests do not access DB directly)

**Testing**: Playwright Test runner (`pnpm --filter crm-e2e test`)

**Target Platform**: Desktop Chrome (Chromium) at 1280×720 viewport

**Project Type**: E2E test suite for a React/NestJS web application (pnpm monorepo)

**Performance Goals**: Full suite completes in under 10 minutes on a 4-worker CI runner (SC-003)

**Constraints**: Tests must be independently executable; no pre-seeded database required; credentials via environment variables only

**Scale/Scope**: ~40–60 test cases across 10 spec files; 4 parallel workers in CI

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status | Notes |
|-----------|------|--------|-------|
| I. Enterprise Grade Quality | Test suite must be CI-ready, reliable, and maintainable | ✅ PASS | JUnit XML output, 90% reliability target (SC-006), parallel execution |
| II. API First Design | N/A — tests consume the UI; API used only for setup/teardown | ✅ PASS | ApiHelper uses versioned `/api/v1/` endpoints per the existing contract |
| III. Security By Default | No credentials hardcoded; secrets via env vars | ✅ PASS | `.auth/` files gitignored; env var contract defined in `data-model.md` |
| IV. RBAC | RBAC enforcement tested (FR-013) | ✅ PASS | Admin and READ_ONLY test users; denial path covered in `auth.spec.ts` |
| V. Auditability | N/A — audit logging is an app concern, not a test-suite concern | ✅ PASS | Tests validate that audit-triggering operations succeed, not the logs themselves |
| VI. Scalability | Parallel workers; no unbounded shared state | ✅ PASS | 4 workers, worker-scoped fixtures, no global mutable data |
| VII. Testability | This feature IS the testability implementation | ✅ PASS | Covers auth, CRUD, navigation, dashboard, forms, search, UX (FR-001–FR-015) |
| VIII. Consistency | Shared fixtures and helpers enforce consistent test patterns | ✅ PASS | `ApiHelper`, `test-fixtures.ts`, page objects for primary entities |
| IX. Observability | Test failure output is structured and actionable | ✅ PASS | JUnit XML + HTML report with screenshots on failure (FR-011, SC-005) |
| X. User Experience | UX consistency tested: loading, empty states, confirmations | ✅ PASS | `ux.spec.ts` covers loading indicators, empty states, confirmation dialogs |

**Post-Phase 1 Re-check**: All gates remain green. No constitution violations introduced by design artifacts.

## Project Structure

### Documentation (this feature)

```text
specs/006-playwright-e2e-tests/
├── plan.md                          # This file
├── research.md                      # Phase 0 output
├── data-model.md                    # Phase 1 output
├── quickstart.md                    # Phase 1 output
├── contracts/
│   └── test-suite-contract.md       # Phase 1 output
└── tasks.md                         # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
e2e/
├── package.json                     # Existing — no changes needed
├── playwright.config.ts             # MODIFY: add JUnit reporter, increase CI workers to 4
├── global-setup.ts                  # MODIFY: authenticate both test users, save storageState
├── .auth/                           # GENERATED at runtime — gitignored
│   ├── admin.json
│   └── readonly.json
├── fixtures/
│   └── test-fixtures.ts             # NEW: shared Playwright fixtures (authed pages, ApiHelper)
├── helpers/
│   ├── api.helper.ts                # NEW: REST API wrapper for test setup/teardown
│   └── auth.helper.ts               # NEW: session clearing utility for expiry tests
├── page-objects/
│   ├── customer.page.ts             # NEW: CustomerListPage and CustomerFormPage selectors
│   ├── contact.page.ts              # NEW: ContactListPage and ContactFormPage selectors
│   └── opportunity.page.ts          # NEW: OpportunityListPage and OpportunityFormPage selectors
└── tests/
    ├── auth.spec.ts                 # REFACTOR: add session expiry, empty fields, RBAC denial
    ├── navigation.spec.ts           # NEW: routes load, 404 page, 403 page, nav menu
    ├── customers.spec.ts            # REFACTOR: full CRUD + search + filter + validation
    ├── contacts.spec.ts             # NEW: full CRUD + search + filter + duplicate email
    ├── opportunities.spec.ts        # NEW: full CRUD + status filter
    ├── dashboard.spec.ts            # NEW: widgets present, empty state, error state
    ├── forms.spec.ts                # NEW: required fields, invalid format, duplicate, server error
    ├── search.spec.ts               # NEW: global search, no results, special chars
    ├── ux.spec.ts                   # NEW: loading indicator, empty state, confirmation dialog
    └── a11y.spec.ts                 # KEEP AS-IS: WCAG 2.1 AA
```

**Structure Decision**: Single `e2e/` package (existing). No new workspace packages. All new files are additions within the existing structure. Three new directories (`fixtures/`, `helpers/`, `page-objects/`) are introduced for shared infrastructure. Existing test files (`auth.spec.ts`, `customers.spec.ts`, `pipeline.spec.ts`, `a11y.spec.ts`) are refactored in place; new spec files are additive.

## Complexity Tracking

> No constitution violations requiring justification.
