# Implementation Plan: Frontend End-to-End Audit & Error Remediation

**Branch**: `004-frontend-e2e-audit` | **Date**: 2026-06-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-frontend-e2e-audit/spec.md`

## Summary

Install Playwright in the frontend project, write an end-to-end audit suite that traverses every application route and triggers every modal dialog while capturing all browser console errors. Then fix all confirmed MUI v9 API violations (`ListItem button` prop, `Grid item` prop) and any additional issues surfaced by the audit. Finish with a clean console across all 20+ routes and all user roles.

## Technical Context

**Language/Version**: TypeScript 6.0 / Node 20 LTS

**Primary Dependencies**: React 19, MUI v9.1.1, Vite 8, Playwright (to be added)

**Storage**: N/A (read-only from backend API; no new data model)

**Testing**: Playwright for E2E; existing vitest for unit tests

**Target Platform**: Chromium desktop (≥1024px viewport), localhost dev server

**Project Type**: Web application — frontend only (React SPA)

**Performance Goals**: Each page must paint primary content within 3 seconds on localhost

**Constraints**: Must not break any existing behavior. All fixes must be backward-compatible with the current MUI v9.1.1 API surface.

**Scale/Scope**: 20 routes, 3 dialog components, 6 seeded user roles

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Enterprise Grade Quality | PASS | Playwright audit enforces production-readiness gating |
| II. API First Design | PASS | No backend changes; frontend-only fix |
| III. Security By Default | PASS | No new endpoints or auth changes |
| IV. Role Based Access Control | PASS | Audit covers all 3 primary roles; RoleGuard behavior verified |
| V. Auditability | N/A | No server-side mutations; no audit log changes needed |
| VI. Scalability | PASS | No new unbounded queries introduced |
| VII. Testability | PASS | Playwright suite is the primary deliverable |
| VIII. Consistency | PASS | All fixes follow established MUI v9 migration patterns already applied in this repo |
| IX. Observability | PASS | Console error audit directly improves observable quality |
| X. User Experience | PASS | Zero console errors + correct page rendering = improved UX |

**No violations.** Complexity Tracking table not required.

## Project Structure

### Documentation (this feature)

```text
specs/004-frontend-e2e-audit/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── routes.md        ← Phase 1 output (route inventory + pass criteria)
└── tasks.md             ← Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
frontend/
├── e2e/                          ← NEW: Playwright test directory
│   ├── playwright.config.ts      ← NEW: Playwright configuration
│   ├── fixtures/
│   │   └── auth.fixture.ts       ← NEW: login helper shared across tests
│   └── tests/
│       ├── auth.spec.ts          ← NEW: login / session restore
│       ├── routes.spec.ts        ← NEW: all routes render without crash
│       └── modals.spec.ts        ← NEW: modal open/close cycle
├── src/
│   ├── modules/
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx ← FIX: Grid item → Grid size
│   │   ├── notifications/
│   │   │   └── NotificationCenter.tsx ← FIX: ListItem button → ListItemButton
│   │   └── search/
│   │       └── SearchPage.tsx    ← FIX: ListItem button (5×) → ListItemButton
│   └── ...
└── package.json                  ← ADD: @playwright/test devDependency
```

**Structure Decision**: Single frontend project (Option 2 — web app). Playwright tests live in `frontend/e2e/` to keep E2E separate from unit tests in `frontend/src/`. All source code changes are in-place fixes to existing files.
