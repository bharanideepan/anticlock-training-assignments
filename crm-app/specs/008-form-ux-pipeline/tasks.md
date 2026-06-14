# Tasks: Form UX & Pipeline Improvements

**Input**: Design documents from `/specs/008-form-ux-pipeline/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Not requested — UI-only feature; quickstart.md provides manual validation scenarios.

**Organization**: Tasks grouped by user story. US1 (searchable dropdowns) has a shared prerequisite in Phase 2 (AsyncAutocomplete component). Each subsequent story is independently implementable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Exact file paths included in each task description

---

## Phase 1: Setup

**Purpose**: Verify environment and confirm no new dependencies are needed.

- [x] T001 Verify `@dnd-kit/core` exports `DragOverlay` by checking `node_modules/@dnd-kit/core/dist/index.js` or running `cd frontend && grep -r "DragOverlay" node_modules/@dnd-kit/core/dist/index.d.ts`

**Checkpoint**: DragOverlay is available in existing @dnd-kit/core installation (no new package needed).

---

## Phase 2: Foundational (Blocking Prerequisite for US1)

**Purpose**: Create the shared `AsyncAutocomplete` component that all reference-field replacements in US1 depend on.

**⚠️ CRITICAL**: Phase 3 (US1 form replacements) cannot begin until T002 is complete.

- [x] T002 Create reusable `AsyncAutocomplete` component in `frontend/src/shared/components/AsyncAutocomplete.tsx` implementing:
  - Props: `label`, `value` (UUID|null), `onChange(id|null)`, `fetchOptions(search, page)→{items,hasMore}`, `getInitialLabel?()→string|null`, `placeholder?`, `error?`, `helperText?`, `required?`, `disabled?`, `size?`
  - `OptionItem` interface: `{ id: string; label: string; subtitle?: string }`
  - Debounced search (300ms) via `useEffect` + `useRef` timeout on `inputValue` change
  - Infinite scroll via `ListboxProps={{ onScroll: handler }}` — triggers next page when `scrollTop + clientHeight >= scrollHeight - 50`
  - Edit-mode pre-population: on mount when `value` is set and `getInitialLabel` provided, call it and set `displayLabel` state
  - `filterOptions={(x) => x}` (server-side filtering)
  - `isOptionEqualToValue={(opt, val) => opt.id === val.id}`
  - `getOptionLabel={(opt) => typeof opt === 'string' ? opt : opt.label}`
  - `renderOption` showing label + subtitle in a two-line layout
  - Loading spinner inside dropdown via `loading` prop
  - Clear button enabled via `clearOnEscape` / MUI default clear icon

**Checkpoint**: `AsyncAutocomplete` renders, searches, paginates, and emits UUID on selection. Can be validated in isolation by temporarily adding to any page.

---

## Phase 3: User Story 1 — Searchable Reference Dropdowns (Priority: P1) 🎯 MVP

**Goal**: Replace all raw UUID text fields and static selects with the `AsyncAutocomplete` dropdown across all forms.

**Independent Test**: Open "Add Opportunity", click Customer field, type partial name, see paginated results, select — form submits with correct UUID. Repeat for Contact, Owner. Same on ContactFormPage and TaskFormDialog.

### Implementation for User Story 1

- [x] T003 [US1] Replace `customerId` TextField in `frontend/src/modules/opportunities/OpportunityFormPage.tsx` with `Controller` + `AsyncAutocomplete` (label="Customer *", fetchOptions calls `useCustomers` API with `{search, page, pageSize:10}`, getInitialLabel returns `existing?.customer?.companyName`)

- [x] T004 [P] [US1] Replace `contactId` TextField in `frontend/src/modules/opportunities/OpportunityFormPage.tsx` with `Controller` + `AsyncAutocomplete` (label="Contact", fetchOptions calls `useContacts` API with `{search, page, pageSize:10, customerId: watchedCustomerId}`, getInitialLabel returns `existing?.contact?.firstName + ' ' + existing?.contact?.lastName`)

- [x] T005 [P] [US1] Replace `ownerId` TextField in `frontend/src/modules/opportunities/OpportunityFormPage.tsx` with `Controller` + `AsyncAutocomplete` (label="Owner", fetchOptions calls `useUsers` API with `{search, page, pageSize:10}`, getInitialLabel returns `existing?.owner?.firstName + ' ' + existing?.owner?.lastName`)

- [x] T006 [US1] Replace `customerId` TextField in `frontend/src/modules/contacts/ContactFormPage.tsx` with `Controller` + `AsyncAutocomplete` (label="Customer *", fetchOptions calls `useCustomers` API with `{search, page, pageSize:10}`, getInitialLabel returns `existing?.customer?.companyName`)

- [x] T007 [P] [US1] Replace `assigneeId` `TextField select` in `frontend/src/modules/tasks/TaskFormDialog.tsx` with `Controller` + `AsyncAutocomplete` (label="Assignee", fetchOptions calls `useUsers` API with `{search, page, pageSize:10}`, getInitialLabel returns `task?.assignee?.firstName + ' ' + task?.assignee?.lastName`); remove `useUsers({ pageSize: 100 })` import

- [x] T008 [P] [US1] Replace `customerId` `TextField select` in `frontend/src/modules/tasks/TaskFormDialog.tsx` with `Controller` + `AsyncAutocomplete` (label="Customer (optional)", fetchOptions calls `useCustomers` API with `{search, page, pageSize:10}`, getInitialLabel returns customer name from task data); remove `useCustomers({ pageSize: 100 })` import

- [x] T009 [US1] Replace the `FormControl/Select` owner filter in `frontend/src/modules/pipeline/PipelineBoardPage.tsx` with `AsyncAutocomplete` (uncontrolled ID, label="Owner", fetchOptions calls `useUsers` API with `{search, page, pageSize:10, status:'ACTIVE'}`); remove `useUsers({ pageSize: 100, status: 'ACTIVE' })` import; update `ownerId` state to use `string | null`

**Checkpoint**: All forms use `AsyncAutocomplete`. No form has a raw UUID TextField or a `useUsers/useCustomers({ pageSize: 100 })` call. Edit mode shows names, not UUIDs.

---

## Phase 4: User Story 2 — Fix Global Search Crash (Priority: P2)

**Goal**: Eliminate the React crash/error in `GlobalSearchBar` caused by the invalid `listbox.footer` slot prop.

**Independent Test**: Type 2+ characters in the global search bar. No crash, no console error. Results appear. Footer "View all" item navigates correctly.

### Implementation for User Story 2

- [x] T010 [US2] Fix `frontend/src/modules/search/GlobalSearchBar.tsx`:
  1. Remove `slotProps.listbox` block entirely (the `// @ts-expect-error footer slot` hack)
  2. Define `FOOTER_ID = '__view_all__'` constant
  3. Append a footer sentinel to the options array when `inputValue.length >= 2 && actualResults.length > 0`: `{ type: '__footer__', id: FOOTER_ID, label: '' }`
  4. In `onChange` / `handleSelect`: if `option.id === FOOTER_ID`, call `handleViewAll()` and return early
  5. In `renderOption`: if `option.id === FOOTER_ID`, render `<Box onClick={handleViewAll} sx={{...}}>View all results for "{inputValue}"</Box>` with primary color text instead of standard option layout
  6. In `getOptionLabel`: return empty string for footer sentinel
  7. Keep all other existing logic (keyboard shortcut, navigation, chips) unchanged

**Checkpoint**: Type "ac" in global search — results appear without any React error in console. Click "View all results" → navigates to `/search?q=ac`. Click a result → navigates to record detail.

---

## Phase 5: User Story 3 — Pipeline Drag Overlay (Priority: P3)

**Goal**: Add `DragOverlay` so dragged cards float above all elements instead of rendering under them.

**Independent Test**: Drag an opportunity card — a floating clone appears above header and columns. Drop on a new stage — card moves there. Drop outside — card returns.

### Implementation for User Story 3

- [x] T011 [US3] Update `frontend/src/modules/pipeline/OpportunityCard.tsx`: When `isDragging === true`, apply `sx={{ visibility: 'hidden' }}` on the outer `Box` instead of the current `opacity: 0.5` in the `style` prop. Remove the `transform: translate3d(...)` from the element's `style` (the overlay handles positioning). Keep `useDraggable` hook and all props unchanged.

- [x] T012 [US3] Update `frontend/src/modules/pipeline/PipelineBoardPage.tsx` to add DragOverlay:
  1. Import `DragOverlay, DragStartEvent` from `@dnd-kit/core`
  2. Add state: `const [activeCard, setActiveCard] = useState<{ id: string; name: string; expectedRevenue?: string; expectedCloseDate?: string; owner?: {...}; stageId: string } | null>(null)`
  3. Add `onDragStart` handler: `(event: DragStartEvent) => { const data = event.active.data.current as {...}; setActiveCard({ id: String(event.active.id), ...data }) }`
  4. Add `onDragCancel` handler: `() => setActiveCard(null)`
  5. Update `onDragEnd`: call existing `handleDragEnd(event)` then `setActiveCard(null)`
  6. Add `DragOverlay` inside `DndContext`, after the columns `Stack`: `<DragOverlay>{activeCard && <OpportunityCard {...activeCard} stageId={activeCard.stageId} />}</DragOverlay>`
  7. Pass `onDragStart`, `onDragCancel` to `DndContext`

**Checkpoint**: Drag an opportunity card — the card at origin becomes invisible (space preserved), a floating clone appears above everything including the header. Drop or cancel restores normal state.

---

## Phase 6: User Story 4 — Pipeline Stage Color Coding (Priority: P4)

**Goal**: Give each stage column a distinct color indicator in its header.

**Independent Test**: Open Pipeline board — each column header has a unique left-border color from the palette.

### Implementation for User Story 4

- [x] T013 [P] [US4] Update `frontend/src/modules/pipeline/StageColumn.tsx`: Add `stageColor: string` to `StageColumnProps`; apply `borderLeft: \`4px solid ${stageColor}\`` on the outer `Paper` `sx` prop alongside existing styles (the colored border should be visible on all states including `isOver`).

- [x] T014 [P] [US4] Update `frontend/src/modules/pipeline/PipelineBoardPage.tsx`: Add `STAGE_PALETTE` constant array of 10 hex colors (`['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#f97316','#ec4899','#14b8a6','#6366f1']`); pass `stageColor={STAGE_PALETTE[index % STAGE_PALETTE.length]}` to each `StageColumn` in the `columns?.map((col, index) => ...)` call.

**Checkpoint**: Pipeline board shows 10 distinct colored left borders across stage columns (cycling if >10 stages).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: TypeScript verification and final consistency check.

- [x] T015 Run TypeScript check in `frontend/` with `cd frontend && pnpm tsc --noEmit` and fix any type errors introduced by the new `AsyncAutocomplete` usage or `DragOverlay` additions

- [x] T016 [P] Verify `AsyncAutocomplete` exports are clean: ensure `frontend/src/shared/components/AsyncAutocomplete.tsx` has a proper `export default` and the `OptionItem` interface is exported for reuse in form files

- [x] T017 [P] Remove any leftover unused imports in edited files (e.g., `useUsers`, `useCustomers`, `FormControl`, `InputLabel`, `Select`, `MenuItem` imports removed from `TaskFormDialog.tsx` and `PipelineBoardPage.tsx` if no longer needed)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS Phase 3 (US1)
- **Phase 3 (US1)**: Depends on Phase 2 (AsyncAutocomplete must exist); tasks T003–T009 can run in parallel after T002
- **Phase 4 (US2)**: Independent — can start after Phase 1; no dependency on Phase 2 or 3
- **Phase 5 (US3)**: Independent — can start after Phase 1; T011 and T012 are sequential (T011 first)
- **Phase 6 (US4)**: Independent — T013 and T014 must both complete but can be done in parallel
- **Polish (Phase 7)**: Depends on all previous phases

### User Story Dependencies

- **US1 (P1)**: Requires AsyncAutocomplete (T002) — sequential within story, parallel across forms
- **US2 (P2)**: Fully independent — single file fix
- **US3 (P3)**: Partially sequential — T011 (OpportunityCard ghost) before T012 (DragOverlay in board)
- **US4 (P4)**: Parallel — T013 (StageColumn prop) and T014 (PipelineBoardPage color pass) can run simultaneously

### Within Each User Story

- US1: T002 → T003 → [T004, T005 in parallel] → T006 → [T007, T008 in parallel] → T009
- US2: T010 (single task)
- US3: T011 → T012
- US4: [T013, T014 in parallel]

---

## Parallel Opportunities

```bash
# After T002 (AsyncAutocomplete complete), these can run in parallel:
T003  # OpportunityFormPage - Customer
T004  # OpportunityFormPage - Contact  [P]
T005  # OpportunityFormPage - Owner    [P]
T006  # ContactFormPage - Customer
T007  # TaskFormDialog - Assignee      [P]
T008  # TaskFormDialog - Customer      [P]
T009  # PipelineBoardPage - Owner

# US2, US3, US4 can all begin independently of US1:
T010  # GlobalSearchBar fix
T011  # OpportunityCard ghost mode → then T012 DragOverlay
T013  # StageColumn color prop [P] → T014 color pass [P]
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002 — AsyncAutocomplete)
3. Complete Phase 3: US1 (T003–T009 — form replacements)
4. **STOP and VALIDATE**: Run quickstart.md Scenarios 1–3
5. Continue with US2, US3, US4 in any order

### Incremental Delivery

1. T001, T002 → Foundation ready
2. T003–T009 → Forms work with real searchable dropdowns (MVP!)
3. T010 → Global search no longer crashes
4. T011, T012 → Pipeline DnD works correctly
5. T013, T014 → Pipeline visually polished
6. T015–T017 → TypeScript clean, no regressions

### Parallel Team Strategy

With multiple developers (after T001, T002):
- Developer A: US1 (T003–T009)
- Developer B: US2 (T010) + US3 (T011, T012)
- Developer C: US4 (T013, T014)

---

## Notes

- `AsyncAutocomplete` wraps MUI `Autocomplete` — do not introduce `react-select` or other libraries
- Use `Controller` from `react-hook-form` for all `AsyncAutocomplete` usages in forms
- `fetchOptions` functions should call the existing API hooks' underlying `apiClient` directly (not the React Query hooks) to avoid hook-in-callback issues — or use a ref-based wrapper
- Stage colors are purely cosmetic — no backend changes
- The `DragOverlay` card clone does NOT need `useDraggable` — it is purely presentational
- All `useUsers({ pageSize: 100 })` and `useCustomers({ pageSize: 100 })` calls MUST be removed; these violate Principle VI (Scalability)
