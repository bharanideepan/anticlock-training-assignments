# Quickstart Validation Guide: Enterprise UI Enhancement

## Prerequisites

- Docker + Docker Compose installed
- Project dependencies installed: `pnpm install` from repo root
- Seed data loaded: `docker-compose up -d && pnpm --filter backend db:seed`
- Application running: `docker-compose -f docker-compose.dev.yml up` (or `pnpm dev`)
- Browser at `http://localhost:5173`

---

## Validation Scenario 1: Charts Render Correctly

**Goal**: Confirm the `ResponsiveContainer` prop bug fix causes all dashboard charts to be visible.

**Steps**:
1. Log in as any user.
2. Navigate to `/dashboard`.
3. Open browser DevTools → Console.

**Expected outcomes**:
- No React prop warning about unrecognized `sx` prop on `ResponsiveContainer`.
- All three charts (Revenue Trend, Pipeline Funnel, Activity Trend) render with visible bars/lines.
- Charts fill their container width (not 0×0 or invisible).
- TeamPerformanceTable shows performance bars next to rep names.

**Failure indicator**: Chart area is blank/white, or console shows "Warning: React does not recognize the `sx` prop".

---

## Validation Scenario 2: Dashboard KPI Density

**Goal**: Confirm MetricCard is compact and enterprise-grade.

**Steps**:
1. Navigate to `/dashboard`.
2. Observe the 8 KPI cards in the top grid.

**Expected outcomes**:
- Card values use `h5` size (≈24px), not oversized `h4` (34px).
- Cards are vertically compact — all 8 fit in a single row at 1280px wide viewport without overflow.
- Cards show trend indicators or colour coding where applicable.

---

## Validation Scenario 3: Activities Route Works

**Goal**: Confirm the `/activities` route loads and the nav item works.

**Steps**:
1. In the left sidebar, click "Activities".
2. Observe the page that loads.
3. Optionally navigate directly to `http://localhost:5173/activities`.

**Expected outcomes**:
- Page loads with "Activities" heading (not 404).
- Activity list renders with type, subject, related-to columns.
- Type filter dropdown shows activity types (CALL, EMAIL, MEETING, etc.).
- Empty state shows a friendly message if no activities exist.

**Failure indicator**: Page shows 404/NotFound or a blank white screen.

---

## Validation Scenario 4: AppShell Header — User Menu

**Goal**: Confirm the logout "Out" text is replaced by a professional user avatar menu.

**Steps**:
1. Look at the top-right of the AppBar.
2. Click the avatar/user icon.
3. Inspect the dropdown menu.

**Expected outcomes**:
- An avatar with user initials appears (not "Out" in red).
- Clicking the avatar opens a menu showing: user's name, role badge, divider, "Sign out" option.
- Clicking "Sign out" logs out and redirects to `/login`.

---

## Validation Scenario 5: Pipeline Board Owner Filter

**Goal**: Confirm the owner filter is a user name selector, not a UUID text field.

**Steps**:
1. Navigate to `/pipeline`.
2. Observe the filter controls at the top.
3. Click the Owner dropdown.

**Expected outcomes**:
- A Select dropdown shows team member names (not "Owner ID filter" free-text input).
- Selecting a name filters the pipeline board to show only that owner's opportunities.
- Selecting the blank/empty option shows all opportunities.

---

## Validation Scenario 6: Empty States on Listing Pages

**Goal**: Confirm all listing pages show a professional empty state when no records exist.

**Steps**:
1. Navigate to `/contacts` with a search that returns no results (e.g., type "zzzzz").
2. Repeat for `/customers`, `/opportunities`, `/tasks`.

**Expected outcomes**:
- An empty state component appears with an icon, message ("No contacts found"), and optionally a CTA button.
- No raw empty table body (blank rows or no rows with no message).

---

## Validation Scenario 7: Visual Consistency Audit

**Goal**: Confirm consistent typography, spacing, and table density across all screens.

**Steps**:
1. Visit in sequence: `/dashboard`, `/customers`, `/contacts`, `/opportunities`, `/tasks`, `/reports`.
2. On each page, check: page title size, table row density, button sizing, padding.

**Expected outcomes**:
- All page titles use the same `h5` variant with consistent weight.
- All tables use `size="small"` with compact cell padding (≤12px vertical).
- All "Add X" buttons have consistent size (`"medium"` default) and placement (top-right of page header).
- Section headings in cards/papers use `subtitle1` or `subtitle2` consistently.

---

## Validation Scenario 8: All Routes Load

**Goal**: Confirm no broken routes exist.

**Routes to test** (visit each by clicking nav items or entering URL directly):
- `/dashboard`
- `/customers`, `/customers/new`, `/customers/:id`, `/customers/:id/edit`
- `/contacts`, `/contacts/new`, `/contacts/:id`, `/contacts/:id/edit`
- `/opportunities`, `/opportunities/new`, `/opportunities/:id`, `/opportunities/:id/edit`
- `/pipeline`
- `/tasks`
- `/activities` ← was broken, now fixed
- `/reports`
- `/search`
- `/notifications`
- `/users`, `/users/new`, `/users/:id`, `/users/:id/edit` (admin only)
- `/audit` (admin only)
- `/import-export` (admin/manager)
- `/settings` (admin only)
- `/some-nonexistent-path` → should show 404

**Expected outcome for each**: Page renders with content, no blank screen, no React error boundary, no console errors about unmatched routes.
