# Tasks: Enterprise UI Enhancement & Application Quality Improvement

**Input**: Design documents from `specs/005-enterprise-ui-enhancement/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: Not requested — no test tasks generated.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)

---

## Phase 1: Setup (No new setup required)

**Purpose**: This is a frontend quality improvement with no new project scaffolding. The existing React + MUI + Recharts + React Router stack is already in place.

> No setup tasks — proceed directly to Foundational phase.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Theme and design-system changes that affect every screen. Must be complete before story-level work begins, as downstream components inherit these tokens.

**⚠️ CRITICAL**: All listing page empty states, chart polish, and component improvements inherit from theme overrides. Complete this phase first.

- [x] T001 Enhance `frontend/src/theme/theme.ts` — add `MuiTableHead` style override (`background: grey[50]`, `fontWeight: 600`), `MuiTableCell` padding override (`6px 12px`), reduce `MuiCard` borderRadius from 12 to 8, add `MuiLinearProgress` colour variant

**Checkpoint**: Theme updated — run `pnpm --filter frontend dev` and inspect any listing page; table headers should be bold with tighter row padding.

---

## Phase 3: User Story 1 — Professional Enterprise Dashboard Experience (Priority: P1) 🎯 MVP

**Goal**: Fix the critical Recharts `ResponsiveContainer` rendering bug so all three dashboard charts are visible, then polish KPI cards and TeamPerformanceTable to enterprise quality.

**Independent Test**: Navigate to `/dashboard`; all three charts (Revenue Trend, Pipeline Funnel, Activity Trend) render with visible data; KPI cards are compact; TeamPerformanceTable shows progress bars. No console warnings about unrecognized `sx` prop.

### Implementation for User Story 1

- [x] T002 [P] [US1] Fix `ResponsiveContainer` prop bug in `frontend/src/modules/dashboard/charts/RevenueTrendChart.tsx` — wrap chart in `<Box sx={{ height: 260, width: '100%' }}>` and change `<ResponsiveContainer>` to use `width="100%" height="100%"` instead of `sx={{height, width}}`
- [x] T003 [P] [US1] Fix `ResponsiveContainer` prop bug in `frontend/src/modules/dashboard/charts/ActivityTrendChart.tsx` — same pattern as T002 (wrap in Box, use native height/width props)
- [x] T004 [P] [US1] Fix `ResponsiveContainer` prop bug AND `YAxis` `sx` prop bug in `frontend/src/modules/dashboard/charts/PipelineFunnelChart.tsx` — wrap in Box, use `width="100%" height="100%"` on ResponsiveContainer, change `YAxis sx={{width: 80}}` to `width={80}`
- [x] T005 [US1] Upgrade `frontend/src/modules/dashboard/MetricCard.tsx` — change value typography from `variant="h4"` to `variant="h5"`, add `sx={{ p: '12px 16px', '&:last-child': { pb: '12px' } }}` to CardContent for tighter padding, ensure `valueColor` prop is used via `sx` color not deprecated `color` prop
- [x] T006 [US1] Improve `frontend/src/modules/dashboard/charts/TeamPerformanceTable.tsx` — convert to a styled MUI `Table size="small"` with columns (Rank, Name, Deals Won, Revenue, Win Rate bar); add a `LinearProgress` bar in the Win Rate column representing win percentage (0–100%)
- [x] T007 [US1] Polish `frontend/src/modules/dashboard/DashboardPage.tsx` — change page title from `variant="h5"` to use `PageHeader` shared component (or consistent `Typography variant="h6" fontWeight={700}`), tighten chart paper padding from `p: 2` to `p: '12px 16px'`, ensure section headings use `variant="subtitle2"` consistently

**Checkpoint**: Navigate to `/dashboard`. All three charts render with data. KPI cards are compact (h5 value size). TeamPerformanceTable shows a progress bar per row. No console errors.

---

## Phase 4: User Story 2 — Consistent Enterprise UI Across All Screens (Priority: P1)

**Goal**: Create the `UserAvatarMenu` shared component and integrate it into AppShell, replacing the prototype-grade "Out" logout button with a professional user avatar menu.

**Independent Test**: Look at AppBar top-right — shows user initials in an avatar. Clicking the avatar opens a dropdown with user name, role, and "Sign out" option. Clicking "Sign out" logs out.

### Implementation for User Story 2

- [x] T008 [US2] Create `frontend/src/shared/components/UserAvatarMenu.tsx` — renders a 28×28px MUI `Avatar` with user initials (first letter of firstName + lastName), clicking it opens a MUI `Menu` anchored below with: user fullName (non-clickable `MenuItem` with `Typography variant="body2" fontWeight={600}`), role name (non-clickable `MenuItem` with `Typography variant="caption" color="text.secondary"`), `Divider`, and "Sign out" `MenuItem` (calls `onLogout` prop); include TypeScript `UserAvatarMenuProps` interface matching the contract in `contracts/ui-component-contracts.md`
- [x] T009 [US2] Update `frontend/src/shared/components/AppShell.tsx` — import `UserAvatarMenu`, replace the `<Tooltip title="Logout"><IconButton size="small" onClick={logout}><Typography variant="caption" color="error">Out</Typography></IconButton></Tooltip>` block with `<UserAvatarMenu user={user} onLogout={logout} />`

**Checkpoint**: AppBar shows user initials avatar (not "Out"). Clicking opens menu. "Sign out" logs out correctly.

---

## Phase 5: User Story 3 — Reliable Navigation and Routing (Priority: P2)

**Goal**: Create the missing `ActivitiesPage` and register the `/activities` route so the sidebar nav item works. Verify all other routes load correctly.

**Independent Test**: Click "Activities" in the sidebar — the Activities page loads (not 404). Navigate to `http://localhost:5173/activities` directly — same result.

### Implementation for User Story 3

- [x] T010 [US3] Create `frontend/src/modules/activities/ActivitiesPage.tsx` — page with `Typography variant="h6"` title "Activities", a filter row (`Select` for activity type: CALL, EMAIL, MEETING, FOLLOW_UP, INTERNAL_ACTION; `TextField` for search), a `Table size="small"` inside `TableContainer + Paper` with columns (Type chip, Subject, Related To, Due Date, Assigned To, Created), `TablePagination`, loading state (`CircularProgress` in table row when `isLoading`), and empty state using `EmptyState` component when results are empty and not loading; consume `useActivities({ page, pageSize, type, search })` hook
- [x] T011 [US3] Update `frontend/src/router/routes.tsx` — add lazy import `const ActivitiesPage = lazy(() => import('../modules/activities/ActivitiesPage'))` and add route `<Route path="/activities" element={<AuthGuard><AppShell><ActivitiesPage /></AppShell></AuthGuard>} />`

**Checkpoint**: Sidebar "Activities" link loads `ActivitiesPage`. All other existing routes still load correctly (spot-check `/customers`, `/opportunities`, `/pipeline`).

---

## Phase 6: User Story 4 — Complete and Unblocked User Workflows (Priority: P2)

**Goal**: Replace the unusable raw-UUID "Owner ID filter" text field on the Pipeline Board with a proper user-name Select dropdown, ensuring the owner filter workflow is functional end-to-end.

**Independent Test**: Navigate to `/pipeline`. The owner filter shows a dropdown of team member names. Selecting a name filters the board. Selecting blank shows all opportunities.

### Implementation for User Story 4

- [x] T012 [US4] Update `frontend/src/modules/pipeline/PipelineBoardPage.tsx` — import `useUsers` hook (from `../../api/users.api` or equivalent), replace the "Owner ID filter" `<TextField>` with a `<Select size="small">` populated from users data; the Select should have a blank option ("All owners"), and each `MenuItem` should show `user.fullName` with `value={user.id}`; keep the filter wired to the `ownerId` state variable so the pipeline board query filters correctly

**Checkpoint**: Pipeline board shows a "All owners / [Name] / [Name]…" dropdown. Selecting a name filters the board to that rep's opportunities. Selecting blank resets.

---

## Phase 7: User Story 5 — Empty, Loading, and Error States (Priority: P3)

**Goal**: Create the shared `EmptyState` component and apply it to all major listing pages so first-time users and zero-result searches see a professional, informative empty state rather than a blank table.

**Independent Test**: On `/contacts`, search "zzzzzzz" — a centered empty state with icon, message "No contacts found", and "Add contact" button appears. Repeat on `/customers`, `/opportunities`, `/tasks`.

### Implementation for User Story 5

- [x] T013 [US5] Create `frontend/src/shared/components/EmptyState.tsx` — accepts props `{ icon?: ReactNode, title: string, description?: string, action?: { label: string, onClick: () => void } }`; renders a centered `Box` with `InboxIcon` (48px, `color="text.disabled"`) or custom icon, `Typography variant="body1" fontWeight={600} color="text.secondary"` for title, optional `Typography variant="body2" color="text.disabled"` for description, optional `Button variant="contained" size="small"` for action; include exported TypeScript interface matching `contracts/ui-component-contracts.md`
- [x] T014 [P] [US5] Update `frontend/src/modules/customers/CustomerListPage.tsx` — after the `TableBody`, add: when `!isLoading && data?.data.length === 0`, render `<EmptyState title="No customers found" description="Try adjusting your search or filters" action={canCreate ? { label: 'Add customer', onClick: () => navigate('/customers/new') } : undefined} />` inside a `TableRow > TableCell` spanning all columns (or as a sibling to `TableContainer`)
- [x] T015 [P] [US5] Update `frontend/src/modules/contacts/ContactListPage.tsx` — same EmptyState pattern: `title="No contacts found"`, `action` for canCreate pointing to `/contacts/new`
- [x] T016 [P] [US5] Update `frontend/src/modules/opportunities/OpportunityListPage.tsx` — same EmptyState pattern: `title="No opportunities found"`, `action` for canCreate pointing to `/opportunities/new`
- [x] T017 [P] [US5] Update `frontend/src/modules/tasks/TaskListPage.tsx` — same EmptyState pattern: `title="No tasks found"`, `description="Try clearing filters or create a new task"`, `action` pointing to open the task dialog (`setDialogOpen(true)`)

**Checkpoint**: Search "zzzzzzz" on each of the four listing pages — each shows the EmptyState component with a friendly message and CTA button.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final visual consistency pass and quickstart validation across all screens.

- [x] T018 [P] Audit `frontend/src/modules/reports/ReportsPage.tsx` for visual consistency — confirm page title uses consistent `Typography variant="h6"` or `h5`, filter controls match sizing on other pages, chart containers use the fixed `Box + ResponsiveContainer` pattern (not `sx` on ResponsiveContainer)
- [x] T019 [P] Audit `frontend/src/modules/search/SearchPage.tsx` and `frontend/src/modules/notifications/NotificationCenterPage.tsx` for visual consistency — confirm page titles, empty states, and layout match the rest of the application
- [x] T020 [P] Audit `frontend/src/modules/users/UserListPage.tsx` and `frontend/src/modules/audit/AuditLogPage.tsx` for table density and empty state consistency — apply `EmptyState` component if missing
- [x] T021 Run the full quickstart validation checklist from `specs/005-enterprise-ui-enhancement/quickstart.md` — verify all 8 scenarios pass; document any remaining issues

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: Start immediately — no dependencies. BLOCKS all story phases.
- **US1 Dashboard (Phase 3)**: Depends on Foundational (T001). Tasks T002–T004 can run in parallel, T005–T006 can run in parallel after T001.
- **US2 Consistent UI (Phase 4)**: Depends on Foundational (T001). T008 must complete before T009.
- **US3 Navigation (Phase 5)**: Depends on US5 EmptyState (T013) for `ActivitiesPage` empty state. T013 should be done before T010, or T010 can stub the empty state and be updated after T013.
- **US4 Workflows (Phase 6)**: Depends on Foundational only. Fully independent.
- **US5 Empty States (Phase 7)**: T013 must complete before T014–T017. T014–T017 are parallel.
- **Polish (Phase 8)**: Depends on all story phases complete.

### Recommended Execution Order (Single Developer)

```
T001 → T002+T003+T004 (parallel) → T005+T006 (parallel) → T007
     → T008 → T009
     → T013 → T010 → T011
     → T012
     → T014+T015+T016+T017 (parallel)
     → T018+T019+T020 (parallel) → T021
```

### User Story Dependencies

- **US1 (P1)**: After T001 (foundational) — independent
- **US2 (P1)**: After T001 (foundational) — independent
- **US3 (P2)**: After T013 (EmptyState component for ActivitiesPage) — soft dependency
- **US4 (P2)**: After T001 (foundational) — fully independent
- **US5 (P3)**: After T001 (foundational) — independent internally (T013 before T014–T017)

### Parallel Opportunities

Within US1: T002, T003, T004 are fully parallel (different files)
Within US1: T005, T006 are parallel (different files)
Within US5: T014, T015, T016, T017 are fully parallel (different files)
Within Polish: T018, T019, T020 are fully parallel

---

## Parallel Example: User Story 1 (Dashboard)

```bash
# Run in parallel after T001 (theme):
Task T002: "Fix RevenueTrendChart.tsx ResponsiveContainer props"
Task T003: "Fix ActivityTrendChart.tsx ResponsiveContainer props"
Task T004: "Fix PipelineFunnelChart.tsx ResponsiveContainer + YAxis props"

# Run in parallel after T002/T003/T004:
Task T005: "Upgrade MetricCard.tsx typography and padding"
Task T006: "Improve TeamPerformanceTable.tsx with LinearProgress bars"
```

## Parallel Example: User Story 5 (Empty States)

```bash
# Run in parallel after T013 (EmptyState component):
Task T014: "Add EmptyState to CustomerListPage.tsx"
Task T015: "Add EmptyState to ContactListPage.tsx"
Task T016: "Add EmptyState to OpportunityListPage.tsx"
Task T017: "Add EmptyState to TaskListPage.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 + Critical Fixes Only)

1. Complete Phase 2: T001 (theme)
2. Complete Phase 3: T002 → T004 (chart bug fixes), T005 (MetricCard), T006 (TeamPerformance), T007 (layout)
3. **STOP and VALIDATE**: Open `/dashboard` — all charts render, KPIs are compact
4. Ship/demo the chart-fixed dashboard as MVP

### Incremental Delivery

1. Foundation (T001) → Dashboard fixed (US1) → Consistent header (US2) → **Demo 1**
2. Activities route (US3) → Pipeline filter (US4) → **Demo 2**
3. Empty states (US5) → Polish pass → **Final release**

### Parallel Team Strategy (2 developers)

- **Dev A**: T001 → T002+T003+T004 → T005+T006 → T007 → T013 → T014–T017
- **Dev B**: T008 → T009 → T010 → T011 → T012 → T018–T021

---

## Notes

- [P] tasks operate on different files — safe to run concurrently
- [Story] label maps each task to its user story for traceability
- T002–T004 are the highest-priority tasks; they fix a critical invisible bug that breaks all dashboard charts
- T013 (EmptyState) is a shared component — complete it before the listing page tasks (T014–T017) and before ActivitiesPage (T010)
- Commit after each logical group (e.g., after all three chart fixes, after EmptyState + all listing page updates)
- Run `pnpm --filter frontend build` after T001 to verify no TypeScript errors from theme changes
