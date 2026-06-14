# Quickstart Validation Guide: Compact Professional UI Redesign

## Purpose

This guide describes how to manually validate that the compact theme redesign meets the contracts
defined in [`contracts/ui-size-contracts.md`](./contracts/ui-size-contracts.md). Run these checks
after completing the implementation tasks in `tasks.md`.

## Prerequisites

- Frontend dev server running: `cd frontend && pnpm dev`
- Browser DevTools available (Chrome or Firefox)
- Viewport set to **1280 × 768** (DevTools → Device toolbar → custom size)
- Logged in as an admin user (to see all sidebar items)

---

## Scenario 1: Header Contract (C-001)

1. Open any page (e.g., Dashboard).
2. Open DevTools → Console.
3. Run:
   ```js
   const header = document.querySelector('header') || document.querySelector('[data-testid="app-header"]');
   console.log('Header height:', header.getBoundingClientRect().height);
   ```
   **Expected**: ≤ 48

4. Run:
   ```js
   const search = document.querySelector('input[placeholder*="Search"], input[type="search"]');
   console.log('Search width:', search?.getBoundingClientRect().width);
   ```
   **Expected**: ≤ 280

5. Verify avatar is visible in the top-right corner as a circular element.

**Pass criteria**: Header height ≤ 48px, search width ≤ 280px, avatar visible right-aligned.

---

## Scenario 2: Sidebar Contract (C-002)

1. Open any page. The sidebar should be expanded.
2. Open DevTools → Console:
   ```js
   const drawer = document.querySelector('.MuiDrawer-paper');
   console.log('Sidebar width:', drawer.getBoundingClientRect().width);
   ```
   **Expected**: ≤ 180 (target 168)

3. Measure a nav item height:
   ```js
   const item = document.querySelector('.MuiListItemButton-root');
   console.log('Nav item height:', item.getBoundingClientRect().height);
   ```
   **Expected**: ≤ 36

4. Click a nav item and verify it gets a distinct highlighted background.
5. Verify icons AND text labels are both visible for all nav items.
6. Log out, log in as non-admin — verify Users, Audit Log, Settings are hidden.

**Pass criteria**: Width ≤ 180px, items ≤ 36px, active item highlighted, icons+labels visible, admin-only items hidden for non-admins.

---

## Scenario 3: Typography Contract (C-003)

1. Open the Customers list page.
2. Inspect a table cell:
   ```js
   const td = document.querySelector('td');
   console.log('Table cell font size:', getComputedStyle(td).fontSize);
   ```
   **Expected**: `13px` or `14px`

3. Open the Dashboard. Inspect a KPI metric value:
   ```js
   const kpiValue = document.querySelector('[data-testid="kpi-value"]') || document.querySelector('.MuiTypography-h5');
   console.log('KPI value size:', getComputedStyle(kpiValue).fontSize);
   ```
   **Expected**: 18–24px

4. Inspect a KPI label for uppercase:
   ```js
   const kpiLabel = document.querySelector('[data-testid="kpi-label"]');
   console.log('KPI label transform:', getComputedStyle(kpiLabel).textTransform);
   ```
   **Expected**: NOT `uppercase`

**Pass criteria**: Body/table text 13–14px, KPI value 18–24px, KPI labels not all-caps.

---

## Scenario 4: Spacing & Layout Contract (C-004)

1. Open the Customers list page.
2. Measure a table row height:
   ```js
   const tr = document.querySelector('tbody tr');
   console.log('Row height:', tr.getBoundingClientRect().height);
   ```
   **Expected**: ≤ 40

3. Measure a primary button:
   ```js
   const btn = document.querySelector('button[class*="contained"]') || document.querySelector('.MuiButton-contained');
   console.log('Button height:', btn.getBoundingClientRect().height);
   ```
   **Expected**: ≤ 32

4. Inspect page wrapper padding:
   ```js
   const main = document.querySelector('main') || document.querySelector('[data-testid="page-content"]');
   console.log('Padding:', getComputedStyle(main).padding);
   ```
   **Expected**: Approximately 16px

**Pass criteria**: Row height ≤ 40px, button height ≤ 32px, padding 16–20px.

---

## Scenario 5: Viewport Fit at 1280×768 (C-005)

1. Set DevTools device toolbar to 1280×768.
2. Navigate to Dashboard.
3. Without scrolling, count visible KPI widgets.
   **Expected**: ≥ 4 KPI cards fully visible.
4. Verify sidebar nav items and header are all visible without scrolling.

5. Navigate to Customers list page.
6. Without scrolling, count visible table rows.
   **Expected**: ≥ 8 rows.

**Pass criteria**: Dashboard shows ≥ 4 KPIs above fold; list pages show ≥ 8 rows above fold.

---

## Scenario 6: Cross-Page Consistency (C-007) ✅ VALIDATED 2026-06-14

Navigate to each page in sequence:
- [x] Dashboard
- [x] Customers list
- [x] Contacts list
- [x] Opportunities list
- [x] Pipeline board
- [x] Tasks list
- [x] Activities list
- [x] Reports
- [x] Users list (admin)
- [x] Audit Log (admin)
- [x] Import/Export
- [x] Settings
- [x] Notification Center

For each page, verify:
- Header appears identical (same height, same elements)
- Sidebar appears identical (same width, same style)
- Fonts and spacing feel consistent with other pages
- No page looks visually disconnected

**Result**: All 13 sections navigate correctly. Header, sidebar, and content area are visually consistent across all pages. No routing errors or layout breaks observed.

**Pass criteria**: All 13 sections styled consistently with no visual outliers.

---

## Scenario 7: Functional Regression Check (SC-008)

After visual review, verify that all core CRUD operations still work:

- [ ] Create a new Customer → form submits and record appears in list
- [ ] Edit a Contact → changes saved and reflected in detail view
- [ ] Change an Opportunity's pipeline stage → board updates
- [ ] Create a Task → task appears in task list
- [ ] Log an Activity → appears in Activities list
- [ ] Search for a record using the global search → results appear
- [ ] Admin: view Users list and Audit Log
- [ ] Non-admin: Users and Audit Log items hidden from sidebar

**Pass criteria**: All operations work without errors; RBAC respected.

---

## Quick Reference: Key Files to Implement

| Artifact | Location | What Changes |
|----------|----------|-------------|
| Theme | `frontend/src/theme/theme.ts` | Typography scale, button size, card padding, ListItemButton height |
| AppShell | `frontend/src/shared/components/AppShell.tsx` | Sidebar width (168px), sidebar background (`#1e293b`), active item style |
| GlobalSearchBar | `frontend/src/modules/search/GlobalSearchBar.tsx` | `maxWidth: 280` on container Box |
| MetricCard | `frontend/src/modules/dashboard/MetricCard.tsx` | Remove uppercase label, adjust variant sizes |
| All page components | `frontend/src/modules/*/` | Change `p: 3` → `p: 2` on outer Box wrappers |

See `data-model.md` for the full token reference table with exact pixel values.
