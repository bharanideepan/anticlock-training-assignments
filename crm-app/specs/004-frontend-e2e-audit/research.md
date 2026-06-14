# Research: Frontend E2E Audit & Error Remediation

**Date**: 2026-06-13
**Feature**: `specs/004-frontend-e2e-audit`

---

## Decision 1: E2E Framework Selection

**Decision**: Use Playwright (`@playwright/test`)

**Rationale**:
- Native browser console log capture via `page.on('console', ...)` and `page.on('pageerror', ...)` — the primary requirement
- Chromium bundled; no browser installation dependency on CI
- First-class TypeScript support
- Does not require a running test server — can point at the already-running Vite dev server
- Already common in the React ecosystem alongside Vite

**Alternatives considered**:
- Cypress: no first-class `console.error` capture without plugins; heavier install
- Puppeteer: lower-level, requires more boilerplate for test assertions

---

## Decision 2: MUI v9 `ListItem button` Migration

**Decision**: Replace `<ListItem button onClick={...}>` with `<ListItemButton onClick={...}>` and move inner `<ListItemText>` and other children inside `<ListItemButton>`.

**Rationale**:
- The `button` prop was removed entirely from `ListItem` in MUI v9. Passing it causes a React unknown-prop warning: `React does not recognize the 'button' prop on a DOM element`.
- `ListItemButton` is the canonical MUI v9 component for clickable list rows. It renders as a `<div role="button">` by default and accepts `onClick`, `sx`, and all standard MUI props.
- Migration is mechanical: wrap children in `<ListItemButton>` instead of adding `button` to `<ListItem>`.

**Files affected**:
- `frontend/src/modules/notifications/NotificationCenter.tsx` — 1 instance (line 70)
- `frontend/src/modules/search/SearchPage.tsx` — 5 instances (lines 113, 137, 161, 185, 209)

**Alternatives considered**:
- Keep `<ListItem>` and add `component="div" role="button" onClick={...} style={{cursor:'pointer'}}`: works but non-idiomatic and still generates the unknown-prop warning.

---

## Decision 3: MUI v9 `Grid item` Migration

**Decision**: Replace `<Grid item xs={N} sm={N} md={N} lg={N}>` with `<Grid size={{ xs: N, sm: N, md: N, lg: N }}>`.

**Rationale**:
- MUI v9 ships Grid v2 as the default `Grid` export from `@mui/material`. In Grid v2, the `item` prop is removed and individual breakpoint props (`xs`, `sm`, `md`, `lg`) are no longer accepted directly.
- Instead, all responsive size information goes into the `size` prop as a responsive object.
- The MUI v9.x type definition for `Grid` (confirmed in `node_modules/@mui/material/Grid/Grid.d.ts`) shows `size?: ResponsiveStyleValue<GridSize>` and no `item` prop.
- Using the old API generates console warnings (`React does not recognize the 'xs' prop on a DOM element`).

**Migration pattern**:
```tsx
// Before (MUI v5 Grid v1 / legacy)
<Grid item xs={6} sm={4} md={3} lg={2}>...</Grid>

// After (MUI v9 Grid v2)
<Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>...</Grid>

// Simple full-width
<Grid item xs={12} md={8}> → <Grid size={{ xs: 12, md: 8 }}>
```

**Files affected**:
- `frontend/src/modules/dashboard/DashboardPage.tsx` — 12 Grid item instances

**Alternatives considered**:
- Import from `@mui/material/Unstable_Grid2`: not needed — `@mui/material/Grid` in v9 already IS Grid v2.

---

## Decision 4: Playwright Configuration

**Decision**: Place Playwright config at `frontend/playwright.config.ts`, tests at `frontend/e2e/tests/`, fixtures at `frontend/e2e/fixtures/`. Target `http://localhost:5173` (Vite dev server, started separately).

**Rationale**:
- Keeping config at the `frontend/` root makes it discoverable by `npx playwright test` run from `frontend/`.
- Separating `e2e/` from `src/` prevents Vite from processing test files during the build.
- Not using `webServer` in Playwright config because the dev server is expected to be running (matching the project's manual startup model).

**Auth fixture strategy**: A shared `auth.fixture.ts` performs `page.goto('/login')`, fills credentials, submits, and waits for `/dashboard`. This fixture is used by all protected-route tests. Tests are organized to run with `admin@crm.local` (full access) for route coverage and `salesrep@crm.local` (restricted access) for role-guard verification.

---

## Decision 5: Console Error Capture Strategy

**Decision**: Collect all `page.on('console')` events with level `error` and all `page.on('pageerror')` events into an array. Assert the array is empty at the end of each test.

**Rationale**:
- `page.on('pageerror')` captures uncaught exceptions (the most severe case — crashes).
- `page.on('console', msg => msg.type() === 'error')` captures `console.error(...)` calls including React's unknown-prop warnings and MUI deprecation errors.
- Assertions at test teardown produce a clear failure message listing every error captured during the test.

**Known false positives to filter**:
- `Failed to load resource: net::ERR_CONNECTION_REFUSED` for optional third-party resources that are not available locally — these should be excluded by URL pattern if they arise.
- React DevTools info messages — these have type `info`, not `error`, and are naturally excluded.
