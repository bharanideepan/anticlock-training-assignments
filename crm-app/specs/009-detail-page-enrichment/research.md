# Research: Detail Page Enrichment

## Decision 1: API hooks — existing vs. new

**Decision**: All required data is accessible via existing API hooks. No new backend endpoints or new hook files are needed.

**Rationale**:
- `useCustomerContacts/Activities/Opportunities/Tasks(id, { page, pageSize })` — all support pagination params already
- `useCustomerFiles(id)` — exists in customers.api.ts (no pagination, acceptable for files)
- `useContactActivities(id, { page, pageSize })` — exists
- Contact → Opportunities: use existing `useOpportunities({ contactId: id, pageSize: 10 })` — `contactId` is already a valid filter param in `OpportunityListParams`
- Opportunity → Tasks: use existing `useTasks({ opportunityId: id, pageSize: 10 })` — `opportunityId` is already a valid filter in `TaskFilters`
- Opportunity → Files: use existing `useFiles('OPPORTUNITY', id, enabled)` from files.api.ts

**Alternatives considered**: Adding a dedicated `useContactOpportunities` hook — rejected because `useOpportunities({ contactId })` already serves this purpose without new code.

---

## Decision 2: Lazy loading implementation

**Decision**: Pass `enabled: activeTab === N` to each tab's React Query hook. No additional state or middleware needed.

**Rationale**: React Query's `enabled` flag gates the fetch trigger. Once a tab is visited and data is fetched, React Query's cache (staleTime from global config) prevents re-fetching on tab revisit. This is the idiomatic React Query pattern for on-demand data loading — zero extra library needed.

**Alternatives considered**: `useEffect` + manual `useState` flag per tab — rejected; more code, loses React Query cache/error/loading semantics.

---

## Decision 3: Row components — shared vs. inline

**Decision**: Create shared row components in `frontend/src/shared/components/detail/` — one per record type (`ContactRow`, `ActivityRow`, `OpportunityRow`, `TaskRow`, `FileRow`) plus a shared `EmptyTabState`.

**Rationale**: ActivityRow is used in both CustomerDetailPage (Activities tab) and ContactDetailPage (Activities tab). OpportunityRow appears in both CustomerDetailPage and ContactDetailPage. Sharing eliminates duplication and ensures visual consistency (Constitution VIII). Each component is a pure presentational component — no API calls inside.

**Alternatives considered**: Inline JSX per tab — rejected; duplicated across 3 detail pages.

---

## Decision 4: "Add" action mechanism

**Decision**:
- **Add Contact**: navigate to `/contacts/new` with React Router state `{ customerId }` for pre-fill
- **Log Activity**: open `ActivityFormDialog` inline (already exists, accepts `customerId` + `contactId` props)
- **Add Opportunity**: navigate to `/opportunities/new` with state `{ customerId }` or `{ contactId }`
- **Add Task**: open `TaskFormDialog` inline (already exists, accepts `customerId` + `opportunityId` props)

**Rationale**: Dialogs exist for Activity and Task (they are quick forms). Contact and Opportunity forms are full pages — consistent with how they're opened from list pages. Using React Router `state` (not query params) avoids URL pollution and keeps pre-fill logic within the form pages' existing `location.state` pattern.

**Alternatives considered**: Open all as inline dialogs — rejected; Contact and Opportunity forms are complex and already built as full-page forms. Opening them inline would require duplicating or adapting the entire form.

---

## Decision 5: "View all" link targets

**Decision**: Each tab's "View all" link navigates to the existing list page with a filter applied:
- Contacts tab → `/contacts?customerId=<id>`
- Activities tab → `/activities?customerId=<id>` (or `contactId`)
- Opportunities tab → `/opportunities?customerId=<id>` (or `contactId`)
- Tasks tab → `/tasks?customerId=<id>` (or `opportunityId`)
- Files tab → no "View all" needed (files are shown in full on the customer/opportunity page)

**Rationale**: List pages with filter params is the existing navigation pattern in this CRM. No new routes needed.

**Alternatives considered**: In-page "load more" pagination — rejected per clarification (Option A selected: 10 most recent + View all link).

---

## Decision 6: Permission gating for "Add" buttons

**Decision**: Hide "Add" buttons entirely from users who lack permission (not disabled with tooltip). Follow the same `canEdit` / `canCreate` role checks already present on each detail page.

**Rationale**: Spec says "visible only to users with permission" (FR-006). Hiding is cleaner than disabled + tooltip for operational CRM users who know their role. Consistent with existing Archive/Edit button hiding pattern.
