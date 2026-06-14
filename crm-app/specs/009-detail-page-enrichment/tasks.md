# Tasks: Detail Page Enrichment

**Input**: Design documents from `specs/009-detail-page-enrichment/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Not requested — UI-only feature; quickstart.md provides manual validation scenarios.

**Organization**: Phase 2 creates 6 shared row/empty-state components (blocking all detail page phases). Phases 3–5 update each detail page independently. Phase 6 is verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Exact file paths included in each task

---

## Phase 1: Setup

**Purpose**: Extend existing API hooks with lazy-loading support so tabs can pass `enabled` flag.

- [X] T001 In `frontend/src/api/customers.api.ts`, update `useCustomerContacts`, `useCustomerActivities`, `useCustomerOpportunities`, `useCustomerTasks`, and `useCustomerFiles` to accept an optional third parameter `enabled = true`; update each hook's internal `enabled` field to `enabled: !!customerId && enabled` (or `enabled: !!customerId && enabled` for files). In `frontend/src/api/contacts.api.ts`, similarly update `useContactActivities(contactId, params = {}, enabled = true)` with `enabled: !!contactId && enabled`.

**Checkpoint**: All 6 hooks accept `enabled` param; calling with `enabled: false` issues no network request.

---

## Phase 2: Foundational (Blocking Prerequisite for Phases 3–5)

**Purpose**: Create the 6 shared presentational components that all detail pages use. No API calls inside these components.

**⚠️ CRITICAL**: Phases 3, 4, 5 cannot begin until all Phase 2 tasks are complete.

- [X] T00X Create `frontend/src/shared/components/detail/EmptyTabState.tsx`: export default component with props `{ icon: React.ReactNode; message: string; actionLabel?: string; onAction?: () => void }`; render a centered `Box` (py:4, textAlign:'center') containing the icon (sx: fontSize:48, color:'text.disabled', mb:1), a `Typography variant="body2" color="text.secondary"` with message, and (if actionLabel + onAction) an `outlined` `Button size="small"` with sx mt:2 that calls onAction.

- [X] T00X [P] Create `frontend/src/shared/components/detail/ContactRow.tsx`: import `ListItemButton`, `ListItemText`, `Box`, `Typography`, `Link` from MUI and `MailOutlineIcon`, `PhoneIcon` from MUI icons. Props: `contact: { id: string; firstName: string; lastName: string; email?: string; phone?: string; designation?: string; department?: string }` and `onClick: () => void`. Render a `ListItemButton divider onClick={onClick}` containing: primary text `"{firstName} {lastName}"` (fontWeight:600), secondary rendered via `secondaryTypographyProps={{ component: 'span' }}` containing a `Box` with designation+department line (caption, text.secondary) and optional mailto/tel links rendered as `<Link href="mailto:..." onClick={e=>e.stopPropagation()}>` with icon + email text in caption size, each on its own line.

- [X] T00X [P] Create `frontend/src/shared/components/detail/ActivityRow.tsx`: Props: `activity: { id: string; type: string; subject: string; description?: string; occurredAt?: string; scheduledAt?: string }` and `onClick: () => void`. Render a `ListItemButton divider onClick={onClick}` with a `Box display="flex" alignItems="flex-start" gap={1} width="100%"`: left side has `Chip label={activity.type} size="small" variant="outlined"`; center (flex:1, minWidth:0) has subject as `Typography variant="body2" fontWeight={600} noWrap` + description truncated to 80 chars as `Typography variant="caption" color="text.secondary" noWrap`; right side has formatted date (`new Date(activity.occurredAt ?? activity.scheduledAt ?? '').toLocaleDateString()`) as `Typography variant="caption" color="text.secondary" sx={{ whiteSpace:'nowrap' }}`.

- [X] T00X [P] Create `frontend/src/shared/components/detail/OpportunityRow.tsx`: Props: `opportunity: { id: string; name: string; stage: { name: string; terminalOutcome?: string | null }; expectedRevenue?: string; expectedCloseDate?: string; owner?: { firstName: string; lastName: string } }` and `onClick: () => void`. Render a `ListItemButton divider onClick={onClick}`: line 1 is a `Box display="flex" alignItems="center" gap={1}` with `Typography variant="body2" fontWeight={600}` (name) and `Chip label={stage.name} size="small" color={stage.terminalOutcome==='WON' ? 'success' : stage.terminalOutcome==='LOST' ? 'error' : 'default'}`; line 2 is `Typography variant="caption" color="text.secondary"` with revenue (`$${Number(expectedRevenue).toLocaleString()}`), close date, and owner concatenated with ` · ` separator (omit null fields).

- [X] T00X [P] Create `frontend/src/shared/components/detail/TaskRow.tsx`: Props: `task: { id: string; title: string; status: 'OPEN' | 'COMPLETED' | 'CANCELLED'; dueDate?: string; isOverdue?: boolean; assignee?: { firstName: string; lastName: string } }` and `onClick: () => void`. Render a `ListItemButton divider onClick={onClick}`: line 1 is `Box display="flex" alignItems="center" gap={1}` with `Typography variant="body2" fontWeight={600}` (title) + `Chip label={status} size="small" color={status==='OPEN'?'info':status==='COMPLETED'?'success':'default'}`; line 2 is `Typography variant="caption" color={task.isOverdue ? 'error' : 'text.secondary'}` showing due date + assignee name separated by ` · `.

- [X] T00X [P] Create `frontend/src/shared/components/detail/FileRow.tsx`: Props: `file: { id: string; originalName: string; sizeBytes: number; createdAt: string; uploadedBy?: { firstName: string; lastName: string } }`. Render a `ListItem divider` (NOT a button — files are not navigable) with `ListItemIcon` containing `InsertDriveFileIcon color="action"`; `ListItemText` with primary = originalName truncated to 40 chars (`originalName.length > 40 ? originalName.slice(0,40)+'…' : originalName`) + secondary = uploader name (via `secondaryTypographyProps={{ component: 'span' }}`); `ListItemSecondaryAction` with human-readable size (`sizeBytes < 1024*1024 ? \`${Math.round(sizeBytes/1024)} KB\` : \`${(sizeBytes/1024/1024).toFixed(1)} MB\``) + formatted date as `Typography variant="caption"`.

**Checkpoint**: All 6 components compile with no TypeScript errors. Can be tested in isolation by temporarily importing into any page.

---

## Phase 3: User Story 1 — Rich Customer Tab Content (Priority: P1) 🎯 MVP

**Goal**: Replace the generic `DataList` component in `CustomerDetailPage.tsx` with typed row components, add lazy loading, add "Add" action buttons, and "View all" links.

**Independent Test**: Open any customer detail page. Switch to Contacts tab — see rich rows with name + email + phone. Network tab shows contacts API fired on first tab click (not on page load). "Add Contact" button visible for authorized users.

### Implementation for User Story 1

- [X] T00X [US1] In `frontend/src/modules/customers/CustomerDetailPage.tsx`: add imports for `ContactRow`, `ActivityRow`, `OpportunityRow`, `TaskRow`, `FileRow`, `EmptyTabState` from `../../shared/components/detail/`; import `ActivityFormDialog` from `../activities/ActivityFormDialog`; import `TaskFormDialog` from `../tasks/TaskFormDialog`; add state: `const [activityOpen, setActivityOpen] = useState(false)` and `const [taskOpen, setTaskOpen] = useState(false)`; update all hook calls to use lazy enabled: `useCustomerContacts(id!, { pageSize: 10 }, tab === 0)`, `useCustomerActivities(id!, { pageSize: 10 }, tab === 1)`, `useCustomerOpportunities(id!, { pageSize: 10 }, tab === 2)`, `useCustomerTasks(id!, { pageSize: 10 }, tab === 3)`, `useCustomerFiles(id!, tab === 4)`.

- [X] T00X [US1] In `frontend/src/modules/customers/CustomerDetailPage.tsx`, replace `{tab === 0 && <DataList items={contacts?.data ?? []} />}` with: a `Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:1 }}` containing a `Typography variant="subtitle2"` ("Contacts") + (canEdit) `Button size="small" startIcon={<AddIcon/>}` ("Add Contact") that calls `navigate('/contacts/new', { state: { customerId: id } })`; then a `List dense disablePadding`: if `isLoading` show `CircularProgress`; if empty show `<EmptyTabState icon={<PeopleIcon/>} message="No contacts yet." actionLabel={canEdit ? 'Add Contact' : undefined} onAction={() => navigate('/contacts/new', { state: { customerId: id } })} />`; else map `contacts?.data` to `<ContactRow key={c.id} contact={c} onClick={() => navigate(\`/contacts/${c.id}\`)} />`; add `{(contacts?.meta?.total ?? 0) > 10 && <Button size="small" onClick={() => navigate(\`/contacts?customerId=${id}\`)}>View all →</Button>}` below list. Import `PeopleIcon` from MUI icons, `AddIcon` from MUI icons.

- [X] T01X [US1] In `frontend/src/modules/customers/CustomerDetailPage.tsx`, replace `{tab === 1 && <DataList items={activities?.data ?? []} />}` with Activities tab content: header row with "Activities" label + (canEdit) "Log Activity" Button that sets `setActivityOpen(true)`; List with loading/empty/rows using `<ActivityRow>` mapped from `activities?.data ?? []` with `onClick={() => navigate(\`/activities/${a.id}\`)}`; "View all" link when `(activities?.meta?.total ?? 0) > 10`; render `<ActivityFormDialog open={activityOpen} onClose={() => setActivityOpen(false)} customerId={id!} onCreated={() => setActivityOpen(false)} />` after the Paper. Import `EventIcon` from MUI icons for empty state.

- [X] T01X [US1] In `frontend/src/modules/customers/CustomerDetailPage.tsx`, replace `{tab === 2 && <DataList items={opportunities?.data ?? []} />}` with Opportunities tab content: header row with "Opportunities" label + (canEdit) "Add Opportunity" Button navigating to `/opportunities/new` with state `{ customerId: id }`; List with loading/empty/rows using `<OpportunityRow>` mapped from `opportunities?.data ?? []`; "View all" link when `(opportunities?.meta?.total ?? 0) > 10`. Import `TrendingUpIcon` for empty state.

- [X] T01X [US1] In `frontend/src/modules/customers/CustomerDetailPage.tsx`, replace `{tab === 3 && <DataList items={tasks?.data ?? []} />}` with Tasks tab content: header + (canEdit) "Add Task" Button that sets `setTaskOpen(true)`; List with loading/empty/rows using `<TaskRow>` mapped from `tasks?.data ?? []` with `onClick={() => navigate(\`/tasks/${t.id}\`)}`; "View all" link when `(tasks?.meta?.total ?? 0) > 10`; render `<TaskFormDialog open={taskOpen} onClose={() => setTaskOpen(false)} customerId={id!} onSuccess={() => setTaskOpen(false)} />` after Paper. Import `CheckCircleOutlineIcon` for empty state.

- [X] T01X [US1] In `frontend/src/modules/customers/CustomerDetailPage.tsx`, replace `{tab === 4 && <DataList items={(files ?? []) as DataItem[]} />}` with Files tab content: List with loading/empty/rows using `<FileRow>` mapped from `files ?? []`; empty state with `InsertDriveFileIcon` and message "No files attached." (no action button — upload is out of scope); remove the `DataList` function, `DataItem` interface, and `DataItem` import usages from this file.

**Checkpoint**: Customer detail page shows rich rows in all tabs. Network shows lazy loading (only requested tab fires its API call). "Add" buttons open dialogs or navigate. Empty state shows for tabs with no records.

---

## Phase 4: User Story 2 — Opportunity Detail Working Tabs (Priority: P2)

**Goal**: Replace "coming in Phase 10/13" placeholders in `OpportunityDetailPage.tsx` with real data.

**Independent Test**: Open any opportunity detail page. Tasks tab shows real task rows (or empty state with "Add Task" button). Files tab shows real file rows (or empty state). No placeholder text anywhere.

### Implementation for User Story 2

- [X] T01X [US2] In `frontend/src/modules/opportunities/OpportunityDetailPage.tsx`: add imports for `TaskRow`, `FileRow`, `EmptyTabState` from `../../shared/components/detail/`; import `TaskFormDialog` from `../tasks/TaskFormDialog`; import `useTasks` from `../../api/tasks.api`; import `useFiles` from `../../api/files.api`; add state `const [taskOpen, setTaskOpen] = useState(false)`; add hook calls: `const { data: oppTasks, isLoading: tasksLoading } = useTasks({ opportunityId: id!, pageSize: 10 })` with React Query `enabled: tab === 0` (pass as filter: use `opportunityId: tab === 0 ? id : undefined` — or add enabled flag); `const { data: oppFiles, isLoading: filesLoading } = useFiles('OPPORTUNITY', id!, tab === 1)`.

- [X] T01X [US2] In `frontend/src/modules/opportunities/OpportunityDetailPage.tsx`: replace `{tab === 0 && <Typography ...>Task management coming in Phase 10.</Typography>}` with Tasks tab: header row ("Tasks" label + canEdit "Add Task" Button setting `setTaskOpen(true)`); List with loading/empty/rows using `<TaskRow>` from `oppTasks?.data ?? []` with `onClick={() => navigate(\`/tasks/${t.id}\`)}`; "View all" link when `(oppTasks?.meta?.total ?? 0) > 10` navigating to `/tasks?opportunityId=${id}`; render `<TaskFormDialog open={taskOpen} onClose={() => setTaskOpen(false)} opportunityId={id!} onSuccess={() => setTaskOpen(false)} />`; replace `{tab === 1 && <Typography ...>File management coming in Phase 13.</Typography>}` with Files tab: List with loading/empty/rows using `<FileRow>` from `oppFiles ?? []`; EmptyTabState with `InsertDriveFileIcon` and "No files attached.".

**Checkpoint**: Opportunity detail page Tasks tab shows tasks (or empty state) and Files tab shows files (or empty state). Zero placeholder text.

---

## Phase 5: User Story 3 — Contact Detail Enriched Info & Related Records (Priority: P3)

**Goal**: Enrich the contact summary panel with clickable links; fix the Opportunities tab; enrich Activities tab rows.

**Independent Test**: Open any contact detail page. Email renders as a clickable mailto link. Opportunities tab shows linked opportunities (not a placeholder). Activities tab shows ActivityRow with type chip, subject, date.

### Implementation for User Story 3

- [X] T01X [US3] In `frontend/src/modules/contacts/ContactDetailPage.tsx`, rewrite the summary `Paper` section: replace plain `<Typography variant="body2">Email: {contact.email}</Typography>` with a `Box sx={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:'4px 12px', alignItems:'center' }}`; for email: show `MailOutlineIcon fontSize="small" color="action"` and `<Link href={\`mailto:${contact.email}\`} variant="body2">{contact.email}</Link>` (omit row if no email); for phone: `PhoneIcon fontSize="small" color="action"` and `<Link href={\`tel:${contact.phone}\`} variant="body2">{contact.phone}</Link>` (omit if null); keep notes as a full-width `Typography variant="body2" sx={{ mt:1, gridColumn:'1 / -1' }}` after a `Divider`. Import `MailOutlineIcon`, `PhoneIcon` from MUI icons, `Link` from MUI material.

- [X] T01X [US3] In `frontend/src/modules/contacts/ContactDetailPage.tsx`: import `useOpportunities` from `../../api/opportunities.api`; import `OpportunityRow`, `EmptyTabState` from `../../shared/components/detail/`; add hook: `const { data: contactOpps, isLoading: oppsLoading } = useOpportunities({ contactId: id!, pageSize: 10 }, ...)` — since `useOpportunities` doesn't have an `enabled` param in its current signature, pass `contactId: tab === 1 ? id : undefined` so the hook only fires a meaningful query when the tab is active (the hook already filters by contactId param). Replace `{tab === 1 && <Typography ...>Opportunity association shown in Opportunities module.</Typography>}` with: header row ("Opportunities" label); List with loading/empty/rows from `contactOpps?.data ?? []` using `<OpportunityRow>` with `onClick={() => navigate(\`/opportunities/${o.id}\`)}`; "View all" link when `(contactOpps?.meta?.total ?? 0) > 10` navigating to `/opportunities?contactId=${id}`; EmptyTabState with `TrendingUpIcon` and "No linked opportunities.". Import `TrendingUpIcon` from MUI icons.

- [X] T01X [US3] In `frontend/src/modules/contacts/ContactDetailPage.tsx`: import `ActivityRow`, `EmptyTabState` from `../../shared/components/detail/`; import `ActivityFormDialog` from `../activities/ActivityFormDialog`; add state `const [activityOpen, setActivityOpen] = useState(false)`; update `useContactActivities` call to `useContactActivities(id!, { pageSize: 10 }, tab === 0)` (now that T001 added enabled param); replace the current activities rendering (type—subject plain text rows) with: header row ("Activities" label + canEdit "Log Activity" Button setting `setActivityOpen(true)`); List with loading/empty/rows using `<ActivityRow>` from `activities ?? []` with `onClick={() => navigate(\`/activities/${a.id}\`)}`; "View all" link when `activities.length >= 10` navigating to `/activities?contactId=${id}`; EmptyTabState with `EventIcon` and "No activities recorded."; render `<ActivityFormDialog open={activityOpen} onClose={() => setActivityOpen(false)} customerId={(contact as ContactWithRelations).customer?.id ?? ''} contactId={id!} onCreated={() => setActivityOpen(false)} />`. Import `EventIcon` from MUI icons, `AddIcon` from MUI icons.

**Checkpoint**: Contact detail shows mailto/tel links. Opportunities tab shows real data. Activities tab shows ActivityRow components with type chip. "Log Activity" opens ActivityFormDialog.

---

## Phase 6: User Story 4 — Empty State Verification (Priority: P4)

**Goal**: Confirm zero placeholder text remains across all detail pages and all tabs show EmptyTabState.

**Independent Test**: Create a new customer with no related records. Open detail page. Every tab shows an icon + message + CTA button (for authorized users). No blank content, no developer placeholders anywhere.

### Implementation for User Story 4

- [X] T01X [US4] Grep across all detail pages for placeholder strings: `grep -rn "coming in Phase\|Opportunity association shown\|Task management\|File management" frontend/src/modules/`. Confirm zero matches. Additionally, verify in the browser: open Opportunity detail page (Tasks + Files tabs), Contact detail page (Opportunities tab) — all must show EmptyTabState or real data, never placeholder text.

**Checkpoint**: Zero occurrences of placeholder text. All tabs across all detail pages show either data rows or EmptyTabState.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: TypeScript verification and cleanup.

- [X] T02X Run `cd frontend && pnpm tsc --noEmit` and fix any type errors introduced by the new row components, dialog integrations, or lazy-loading hook changes.

- [X] T02X [P] Verify exports: confirm `frontend/src/shared/components/detail/` exports are clean (each file has a proper `export default`); confirm no leftover unused imports in `CustomerDetailPage.tsx` (e.g., `DataItem`, `DataList` interface), `ContactDetailPage.tsx`, or `OpportunityDetailPage.tsx`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1; T003–T007 run in parallel after T002
- **Phase 3 (US1)**: Depends on Phase 2 — T008→T009→T010→T011→T012→T013 sequential (same file)
- **Phase 4 (US2)**: Independent of Phase 3 — can start after Phase 2; T014→T015 sequential (same file)
- **Phase 5 (US3)**: Independent of Phases 3 & 4 — can start after Phase 2; T016→T017→T018 sequential (same file)
- **Phase 6 (US4)**: Depends on Phases 3, 4, 5 — verification after all tabs are implemented
- **Polish (Phase 7)**: Depends on all previous phases

### User Story Dependencies

- **US1 (P1)**: Requires Phase 2 complete
- **US2 (P2)**: Requires Phase 2 complete; independent of US1
- **US3 (P3)**: Requires Phase 2 complete; independent of US1 and US2
- **US4 (P4)**: Requires US1, US2, US3 complete (verification pass)

### Within Each User Story

- US1: T008 → T009 → T010 → T011 → T012 → T013 (all in CustomerDetailPage.tsx)
- US2: T014 → T015 (both in OpportunityDetailPage.tsx)
- US3: T016 → T017 → T018 (all in ContactDetailPage.tsx)
- US4: T019 (verification grep + browser check)

---

## Parallel Opportunities

```bash
# After T002 (EmptyTabState), run T003–T007 in parallel:
T003  # ContactRow.tsx         [P]
T004  # ActivityRow.tsx        [P]
T005  # OpportunityRow.tsx     [P]
T006  # TaskRow.tsx            [P]
T007  # FileRow.tsx            [P]

# After Phase 2 complete, all three detail pages can be worked in parallel:
T008–T013  # CustomerDetailPage (US1)
T014–T015  # OpportunityDetailPage (US2)   [P with US1]
T016–T018  # ContactDetailPage (US3)       [P with US1 & US2]
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T007)
3. Complete Phase 3: US1 (T008–T013 — CustomerDetailPage)
4. **STOP and VALIDATE**: Run quickstart.md Scenarios 1 and 6 (rich tabs + lazy loading)
5. Continue with US2, US3, US4

### Incremental Delivery

1. T001 → hook infrastructure ready
2. T002–T007 → shared components ready
3. T008–T013 → Customer detail fully enriched (MVP!)
4. T014–T015 → Opportunity detail no longer shows placeholders
5. T016–T018 → Contact detail fully enriched
6. T019 → Zero placeholder text confirmed
7. T020–T021 → TypeScript clean, no regressions

### Parallel Team Strategy

After Phase 2 completes:
- Developer A: US1 (T008–T013, CustomerDetailPage)
- Developer B: US2 (T014–T015, OpportunityDetailPage) + US4 (T019)
- Developer C: US3 (T016–T018, ContactDetailPage)

---

## Notes

- All 6 shared components in `frontend/src/shared/components/detail/` are purely presentational — no hooks, no API calls inside them
- `secondaryTypographyProps={{ component: 'span' }}` is required on `ListItemText` whenever `secondary` contains a non-text element (Chip, Link, Box) — prevents invalid `<div>` inside `<p>` HTML nesting error
- `ActivityFormDialog` requires a non-empty `customerId` — for ContactDetailPage, derive it from `(contact as ContactWithRelations).customer?.id ?? ''`
- `useOpportunities` for ContactDetailPage: pass `contactId: tab === 1 ? id : undefined` to gate the query lazily without needing to modify the hook
- "View all" links use `navigate('/path?param=value')` — list pages may not yet filter by these params; navigation to the unfiltered list is an acceptable fallback
- `useTasks` lazy loading: pass `opportunityId: tab === 0 ? id : undefined` — when undefined, the filter is omitted and `enabled` defaults to `true` but returns all tasks (undesirable). Better approach: check if `useOpportunities` or similar hooks have an `enabled` param; if not, verify tab state before calling by checking `opportunityId` is defined and tab is active via the query key
