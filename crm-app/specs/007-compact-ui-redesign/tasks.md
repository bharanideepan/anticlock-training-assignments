---
description: "Task list for Compact Professional UI Redesign"
---

# Tasks: Compact Professional UI Redesign

**Input**: Design documents from `specs/007-compact-ui-redesign/`

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contracts**: [contracts/ui-size-contracts.md](./contracts/ui-size-contracts.md)

**Tests**: No test tasks — this feature has no new backend logic. Validation is done via the manual scenarios in [quickstart.md](./quickstart.md).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- All paths are relative to the repository root

---

## Phase 1: Setup

**Purpose**: Establish a clean baseline before making any visual changes.

- [x] T001 Start the frontend dev server (`cd frontend && pnpm dev`) and open the app in a browser at 1280×768 — screenshot or note current state as before-baseline for comparison at the end

**Checkpoint**: Dev server running, app accessible, baseline noted.

---

## Phase 2: Foundational — MUI Theme Overrides

**Purpose**: Update `frontend/src/theme/theme.ts` with the compact design token values. **All user story phases depend on this phase being complete first** — theme changes cascade to every MUI component in the app.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 Add compact typography scale to `createTheme` in `frontend/src/theme/theme.ts`: set `typography.fontSize: 13`, `body1.fontSize: '0.8125rem'`, `body2.fontSize: '0.8125rem'`, `caption.fontSize: '0.6875rem'`, `h6.fontSize: '1rem'`, `h5.fontSize: '1.125rem'`, `h4.fontSize: '1.25rem'`, `button.fontSize: '0.8125rem'`

- [x] T003 Add MUI component size overrides to `frontend/src/theme/theme.ts`: (a) `MuiButton` — `sizeSmall: { minHeight: 28, fontSize: '0.8125rem' }`, `sizeMedium: { minHeight: 32, fontSize: '0.8125rem' }`; (b) `MuiCardContent` — `root: { padding: 12, '&:last-child': { paddingBottom: 12 } }`; (c) `MuiListItemButton` — `root: { minHeight: 34, paddingTop: 4, paddingBottom: 4, paddingLeft: 12, paddingRight: 12 }`

**Checkpoint**: Run `pnpm dev` — the app should immediately show smaller body text, smaller buttons, and tighter card padding across all pages with no code changes needed to individual page files.

---

## Phase 3: User Story 2 — Slim, Icon-Label Sidebar (Priority: P1)

**Goal**: Replace the 220px wide light-background sidebar with a 168px dark `#1e293b` sidebar showing icons + labels, with RBAC preserved and responsive overlay behaviour at < 1280px.

**Independent Test (from spec)**: Measure sidebar width — must be ≤ 180px. Verify icon and label visible per nav item. Verify active item has distinct highlighted background. Log in as non-admin — admin-only items must not appear. Resize viewport to < 1280px — sidebar must switch to overlay drawer with hamburger trigger.

- [x] T004 [US2] Reduce `DRAWER_WIDTH` constant from `220` to `168` in `frontend/src/shared/components/AppShell.tsx` and add `PaperProps={{ sx: { backgroundColor: '#1e293b', borderRight: 'none' } }}` to the `<Drawer>` component

- [x] T005 [US2] Style sidebar nav items in `frontend/src/shared/components/AppShell.tsx`: set inactive `ListItemIcon` and `ListItemText` color to `#94a3b8`; set active `ListItemButton` (`selected` prop) with `sx={{ bgcolor: 'rgba(25,118,210,0.15)', '&:hover': { bgcolor: 'rgba(25,118,210,0.2)' } }}` and override icon/text color to `#ffffff` when selected

- [x] T006 [US2] Add a `<Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 0.5 }} />` between the primary nav items and the admin-only items section in the sidebar nav list in `frontend/src/shared/components/AppShell.tsx`

- [x] T007 [US2] Implement responsive drawer in `frontend/src/shared/components/AppShell.tsx`: at ≥ 1280px use `variant="permanent"` (current behaviour); at < 1280px switch to `variant="temporary"` with `open={mobileOpen}` state; add a hamburger `<IconButton>` (`MenuIcon`) to the left of the header `Toolbar` that toggles `mobileOpen`; ensure main content area uses `ml: { xs: 0, xl: '168px' }` so it expands to full width on small screens when drawer is closed

**Checkpoint**: Sidebar is 168px, dark background, icons + labels visible, active item highlighted, admin items hidden for non-admin, hamburger works at < 1280px.

---

## Phase 4: User Story 1 — Compact, Glanceable Interface (Priority: P1)

**Goal**: At 1280×768, show ≥ 4 KPI widgets + full sidebar + header without scrolling. KPI labels are not uppercase.

**Independent Test (from spec)**: Open Dashboard at 1280×768 — count KPI widgets above the fold. Count table rows on a list page above the fold.

- [x] T008 [P] [US1] Update `frontend/src/modules/dashboard/MetricCard.tsx`: change the metric value `Typography` from `variant="h5"` to `variant="h4"` (20px via theme); change the label/title `Typography` from `variant` that uses uppercase to `variant="caption"`; remove `textTransform: 'uppercase'` or `sx={{ textTransform: 'uppercase' }}` from the label Typography element

- [x] T009 [P] [US1] Update `frontend/src/modules/dashboard/DashboardPage.tsx`: change outer `<Box sx={{ p: 3 }}>` to `<Box sx={{ p: 2 }}>` (16px); verify the KPI grid uses `Grid` with `xs={12} sm={6} md={3}` so that 4 columns render at ≥1280px — adjust column breakpoints if currently set to fewer columns

**Checkpoint**: Dashboard at 1280×768 shows ≥ 4 compact KPI cards with readable (non-uppercase) labels above the fold.

---

## Phase 5: User Story 3 — Compact, Centred Header Bar (Priority: P2)

**Goal**: Search input ≤ 280px wide, avatar and bell right-aligned, header height ≤ 48px (already met via Toolbar dense).

**Independent Test (from spec)**: Measure header height (must be ≤ 48px — already confirmed). Measure search input width (must be ≤ 280px). Confirm avatar and notification bell are right-aligned.

- [x] T010 [US3] Wrap the `<Autocomplete>` in `frontend/src/modules/search/GlobalSearchBar.tsx` in a `<Box sx={{ width: '100%', maxWidth: 280 }}>` container (replacing any existing fixed-width wrapper) so the search field is capped at 280px and the Autocomplete fills it with `sx={{ width: '100%' }}`

**Checkpoint**: Search field measures ≤ 280px; header height stays 48px; no layout shift when typing.

---

## Phase 6: User Story 4 — Compact, Legible Typography (Priority: P2)

**Goal**: All list pages show text truncation + hover tooltip for long values, keeping row height ≤ 40px.

**Independent Test (from spec)**: Open Customers list — verify row height ≤ 40px and that a long company name is truncated with ellipsis; hover over it to confirm tooltip shows full value.

> **Note**: These tasks all touch different files and can be executed in parallel.

- [x] T011 [P] [US4] In `frontend/src/modules/customers/CustomerListPage.tsx`: wrap company name `TableCell` content with `<Tooltip title={row.name}><Typography noWrap sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</Typography></Tooltip>`; apply same pattern to email column

- [x] T012 [P] [US4] In `frontend/src/modules/contacts/ContactListPage.tsx`: apply Tooltip + `noWrap` truncation to the contact name and email `TableCell` columns (same pattern as T011)

- [x] T013 [P] [US4] In `frontend/src/modules/opportunities/OpportunityListPage.tsx`: apply Tooltip + `noWrap` truncation to the opportunity name and customer/account name `TableCell` columns

- [x] T014 [P] [US4] In `frontend/src/modules/tasks/TaskListPage.tsx`: apply Tooltip + `noWrap` truncation to the task title `TableCell` column

- [x] T015 [P] [US4] In `frontend/src/modules/activities/ActivitiesPage.tsx`: apply Tooltip + `noWrap` truncation to subject/description `TableCell` columns

- [x] T016 [P] [US4] In `frontend/src/modules/users/UserListPage.tsx`: apply Tooltip + `noWrap` truncation to the user name and email `TableCell` columns

- [x] T017 [P] [US4] In `frontend/src/modules/audit/AuditLogPage.tsx`: apply Tooltip + `noWrap` truncation to message/resource identifier `TableCell` columns that can carry long values

**Checkpoint**: All list pages — table rows ≤ 40px, long text truncates with ellipsis, full value visible on hover.

---

## Phase 7: User Story 5 — Cohesive Visual Theme Across All Pages (Priority: P3)

**Goal**: Every page uses `p: 2` (16px) outer padding, consistent with the compact theme.

**Independent Test (from spec)**: Navigate to each of the 13 major sections and verify the header, sidebar, and content padding look identical — no page feels visually disconnected.

> **Note**: All tasks in this phase are in different files and can be executed in parallel. If a file was also edited in Phase 6 (T011–T017), combine both edits in one file save to avoid redundant changes.

- [x] T018 [P] [US5] Change `<Box sx={{ p: 3 }}>` to `<Box sx={{ p: 2 }}>` in `frontend/src/modules/customers/CustomerListPage.tsx`, `CustomerDetailPage.tsx`, and `CustomerFormPage.tsx`

- [x] T019 [P] [US5] Change `<Box sx={{ p: 3 }}>` to `<Box sx={{ p: 2 }}>` in `frontend/src/modules/contacts/ContactListPage.tsx`, `ContactDetailPage.tsx`, and `ContactFormPage.tsx`

- [x] T020 [P] [US5] Change `<Box sx={{ p: 3 }}>` to `<Box sx={{ p: 2 }}>` in `frontend/src/modules/opportunities/OpportunityListPage.tsx`, `OpportunityDetailPage.tsx`, and `OpportunityFormPage.tsx`

- [x] T021 [P] [US5] Change `<Box sx={{ p: 3 }}>` to `<Box sx={{ p: 2 }}>` in `frontend/src/modules/pipeline/PipelineBoardPage.tsx` and `frontend/src/modules/tasks/TaskListPage.tsx`

- [x] T022 [P] [US5] Change `<Box sx={{ p: 3 }}>` to `<Box sx={{ p: 2 }}>` in `frontend/src/modules/activities/ActivitiesPage.tsx` and `frontend/src/modules/reports/ReportsPage.tsx`

- [x] T023 [P] [US5] Change `<Box sx={{ p: 3 }}>` to `<Box sx={{ p: 2 }}>` in `frontend/src/modules/users/UserListPage.tsx`, `UserDetailPage.tsx`, and `UserFormPage.tsx`

- [x] T024 [P] [US5] Change `<Box sx={{ p: 3 }}>` to `<Box sx={{ p: 2 }}>` in `frontend/src/modules/audit/AuditLogPage.tsx`, `frontend/src/modules/import-export/ImportExportPage.tsx`, and `frontend/src/modules/admin/AdminSettingsPage.tsx`

- [x] T025 [P] [US5] Change `<Box sx={{ p: 3 }}>` to `<Box sx={{ p: 2 }}>` in `frontend/src/modules/notifications/NotificationCenterPage.tsx`

**Checkpoint**: Open each of the 13 sections in sequence — padding, font sizes, and sidebar/header appear consistent across all pages with no visual outliers.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, contrast check, and functional regression.

- [x] T026 Run all 7 validation scenarios from `specs/007-compact-ui-redesign/quickstart.md` at 1280×768 in a browser — note any contract violations and fix before marking done

- [x] T027 Verify WCAG AA contrast compliance for the dark sidebar: (a) inactive nav text `#94a3b8` on `#1e293b` background — must meet 3:1 minimum for large text (18px+); (b) active nav text `#ffffff` on the active item background — must exceed 4.5:1; use browser DevTools accessibility panel or contrast checker

- [x] T028 Functional regression check per SC-008 — verify all CRUD operations, navigation, and RBAC controls still work: create a Customer, edit a Contact, move an Opportunity stage in Pipeline, create a Task, run a Report, verify admin-only pages (Users, Audit Log) are visible to admin and hidden from non-admin

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)        → No dependencies
Phase 2 (Foundation)   → Depends on Phase 1 — BLOCKS all user story phases
Phase 3 (US2 Sidebar)  → Depends on Phase 2
Phase 4 (US1 Dashboard)→ Depends on Phase 2 (can run in parallel with Phase 3)
Phase 5 (US3 Header)   → Depends on Phase 2 (can run in parallel with Phase 3/4)
Phase 6 (US4 Truncate) → Depends on Phase 2 (can run in parallel with Phase 3/4/5)
Phase 7 (US5 Padding)  → Depends on Phase 2; best after Phase 6 to batch file edits
Phase 8 (Polish)       → Depends on all prior phases
```

### User Story Dependencies

- **US1 (P1)** and **US2 (P1)**: Both depend on Phase 2; can be worked in parallel (different files)
- **US3 (P2)**: Can start after Phase 2; `GlobalSearchBar.tsx` is independent of AppShell
- **US4 (P2)**: All truncation tasks are independent — 7 files, all [P] within the phase
- **US5 (P3)**: Padding sweep — all 8 tasks are independent; combine with any US4 file edits to avoid re-opening same file

### Within Each Phase

- Phase 2: T002 before T003 (same file — sequential)
- Phase 3: T004 → T005 → T006 → T007 (same file — sequential; each builds on previous)
- Phase 4: T008 and T009 are [P] (different files — can run in parallel)
- Phase 6: T011–T017 are all [P] (different files — can all run in parallel)
- Phase 7: T018–T025 are all [P] (different files — can all run in parallel)

---

## Parallel Execution Examples

### Phase 3 (US2 - Sidebar) — sequential in AppShell.tsx
```
T004 → T005 → T006 → T007  (single file, one developer)
```

### Phase 4 + Phase 5 + Phase 6 — true parallel (different files)
```
Parallel:
  T008  frontend/src/modules/dashboard/MetricCard.tsx
  T009  frontend/src/modules/dashboard/DashboardPage.tsx
  T010  frontend/src/modules/search/GlobalSearchBar.tsx
  T011  frontend/src/modules/customers/CustomerListPage.tsx
  T012  frontend/src/modules/contacts/ContactListPage.tsx
  T013  frontend/src/modules/opportunities/OpportunityListPage.tsx
  T014  frontend/src/modules/tasks/TaskListPage.tsx
  T015  frontend/src/modules/activities/ActivitiesPage.tsx
  T016  frontend/src/modules/users/UserListPage.tsx
  T017  frontend/src/modules/audit/AuditLogPage.tsx
```

### Phase 7 (US5 - Padding) — all parallel
```
Parallel: T018, T019, T020, T021, T022, T023, T024, T025  (all different files)
```

---

## Implementation Strategy

### MVP First (US1 + US2 only — both P1)

1. Complete Phase 1: Setup baseline
2. Complete Phase 2: Foundation (theme.ts) — **critical, blocks everything**
3. Complete Phase 3: US2 sidebar (AppShell.tsx)
4. Complete Phase 4: US1 dashboard (MetricCard + DashboardPage)
5. **STOP and VALIDATE**: Run quickstart.md Scenarios 1–2 and 5
6. App now has compact sidebar and compact dashboard — MVP shippable

### Incremental Delivery

1. Phases 1–2 → Foundation ready
2. Phase 3 → US2 (Sidebar) ✓ — validate independently
3. Phase 4 → US1 (Dashboard) ✓ — validate independently
4. Phase 5 → US3 (Header) ✓ — validate independently
5. Phase 6 → US4 (Truncation) ✓ — validate independently
6. Phase 7 → US5 (All pages) ✓ — full visual consistency
7. Phase 8 → Polish & regression check ✓

### Parallel Team Strategy (if 2+ developers)

- **Dev A**: Phase 2 (theme.ts) → Phase 3 (AppShell) → Phase 5 (GlobalSearchBar)
- **Dev B**: Wait for Phase 2 → then Phase 4 (Dashboard) + Phase 6 (all truncation tasks) + Phase 7 (padding tasks)

---

## Notes

- [P] tasks = different files, no shared dependencies within the phase
- [Story] label maps task to spec user story for traceability
- Each user story phase is independently completable and testable
- Phases 6 and 7 touch some of the same files (list pages) — combine edits when possible to avoid re-opening files
- No new npm packages required — `Tooltip` is already part of MUI v9
- Theme changes (Phase 2) are compile-time; no runtime performance cost
- The `MuiButton` `sizeSmall`/`sizeMedium` override syntax in MUI v9 uses the `styleOverrides` key with size-specific nested keys
