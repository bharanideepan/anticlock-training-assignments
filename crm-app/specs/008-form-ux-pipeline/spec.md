# Feature Specification: Form UX & Pipeline Improvements

**Feature Branch**: `008-form-ux-pipeline`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User description: "In all places - wherever the ID needs, we cannot give the ids right? so make those fields as dropdowns and load the dropdown options with search - do not load all data at once - paginate using scroll in the dropdown to avoid performance issue. Next - Global search crashes the app. Next - in pipeline drag and drop -> the drag content is moving under, make it over the element. Need color coding in pipeline."

## User Scenarios & Testing

### User Story 1 - Searchable Reference Dropdowns (Priority: P1)

Users filling out forms (Opportunity, Contact, Task) currently have to type raw UUIDs for fields like Customer, Contact, Owner, and Assignee. This is unusable. These fields must become searchable dropdowns that load matching records as the user types, with infinite scroll for pagination.

**Why this priority**: Forms are the primary data-entry path. Raw UUID fields completely break the creation flow for all users.

**Independent Test**: Open the "Add Opportunity" form, click the Customer field, type a partial company name, see matching customers appear; scroll to load more results; select one. The UUID is stored but the label is shown.

**Acceptance Scenarios**:

1. **Given** the Opportunity form is open, **When** the user clicks the Customer field and types "Ac", **Then** a dropdown appears showing customers whose names match "Ac", with up to 10 results initially.
2. **Given** more than 10 results exist, **When** the user scrolls to the bottom of the dropdown, **Then** the next page of results loads and appends to the list.
3. **Given** the user selects a customer from the dropdown, **When** the form is submitted, **Then** the correct customer UUID is sent to the backend.
4. **Given** a slow network, **When** the user is typing, **Then** the dropdown shows a loading indicator and debounces requests (300ms).
5. **Given** an existing Opportunity is being edited, **When** the form loads, **Then** the Customer, Contact, and Owner fields show the current record's name (not UUID).

---

### User Story 2 - Fix Global Search Crash (Priority: P2)

The global search bar in the header crashes the app when used. Users are unable to search for any records.

**Why this priority**: A crashing feature creates a broken-feeling product. Even though it's less frequently used than forms, the crash is immediately visible in the header on every page.

**Independent Test**: Type 2+ characters into the global search bar and verify results appear without any React error or app crash.

**Acceptance Scenarios**:

1. **Given** the user types 2 or more characters in the global search bar, **When** results are returned, **Then** they render correctly without a crash or console error.
2. **Given** no results are found, **When** the search completes, **Then** a "No results" message appears without crashing.
3. **Given** the user selects a result, **When** clicked, **Then** the app navigates to the correct detail page.
4. **Given** the user clicks "View all results", **When** clicked, **Then** navigation goes to the search results page.

---

### User Story 3 - Pipeline Drag Overlay (Priority: P3)

When dragging an opportunity card in the pipeline board, the card visually moves under other elements (below columns, below header). The dragged card should float above everything while being dragged.

**Why this priority**: The pipeline drag-and-drop is a core interaction. Cards going under other elements makes the feature feel broken, though the underlying move still works.

**Independent Test**: Drag an opportunity card from one stage column to another; the card should float visibly above all other content while dragging.

**Acceptance Scenarios**:

1. **Given** the user begins dragging an opportunity card, **When** dragging starts, **Then** a floating copy of the card appears above all page elements (header, other cards, columns).
2. **Given** the user is dragging, **When** hovering over a valid drop target (a stage column), **Then** the column shows a visual highlight.
3. **Given** the user drops the card on a different stage column, **When** drop completes, **Then** the opportunity moves to the new stage and the floating card disappears.
4. **Given** the user drops outside a valid column, **When** drop is cancelled, **Then** the card returns to its original position without error.

---

### User Story 4 - Pipeline Stage Color Coding (Priority: P4)

Pipeline stage columns are visually identical — no color differentiation. Users should see distinct colors on each stage header to quickly identify which stage they're looking at.

**Why this priority**: Color coding is a visual polish enhancement; lower priority than the crash and broken drag-and-drop.

**Independent Test**: Open the Pipeline board and verify each stage column header has a distinct background color.

**Acceptance Scenarios**:

1. **Given** the Pipeline board is open with multiple stages, **When** viewed, **Then** each stage column header displays a distinct color from a curated palette.
2. **Given** there are more stages than palette colors, **When** colors are assigned, **Then** colors cycle but remain visually distinct for adjacent stages.
3. **Given** the dark theme sidebar is in use, **When** pipeline is viewed, **Then** stage colors remain readable and do not clash with the overall theme.

---

### Edge Cases

- What happens when there are 0 records matching the search in a reference dropdown? Show "No options" message.
- What if the customer dropdown search API is slow? Show spinner inside dropdown; do not re-fetch on every keystroke (debounce 300ms).
- What if the user clears the dropdown selection? The field should become empty/invalid per form validation.
- What if pipeline has only 1 stage? Color coding still applies (single color); drag-and-drop within same stage is a no-op.
- What if global search returns null for any sub-array? Defensive fallback to empty array to avoid crash.

## Requirements

### Functional Requirements

- **FR-001**: All UUID-typed reference fields (customerId, contactId, ownerId, assigneeId) in forms MUST be replaced with searchable Autocomplete dropdowns.
- **FR-002**: Reference dropdowns MUST load records via API search with a minimum 2-character trigger and 300ms debounce.
- **FR-003**: Reference dropdowns MUST support infinite scroll — loading the next page of results when the user scrolls to the bottom of the dropdown list.
- **FR-004**: Reference dropdowns MUST display the human-readable name (company name, full name) as the option label while storing the UUID as the form value.
- **FR-005**: On edit forms, reference dropdowns MUST pre-populate with the current record's name (not UUID).
- **FR-006**: The global search crash MUST be eliminated; the search bar MUST render results without React errors.
- **FR-007**: The "View all results" footer action in global search MUST navigate to the search results page.
- **FR-008**: Pipeline drag-and-drop MUST use a DragOverlay so the dragged card floats above all page elements during drag.
- **FR-009**: The original card position MUST become invisible (ghost) while its DragOverlay clone is floating.
- **FR-010**: Each pipeline stage column header MUST display a distinct color from a predefined palette.
- **FR-011**: Stage colors MUST be assigned consistently (same stage always gets the same color across sessions) using stage order/index.

### Key Entities

- **SearchableDropdown**: A reusable Autocomplete component accepting an API search function, page size, debounce delay; emits selected ID.
- **PipelineStage**: Existing entity; color assigned by index position in the ordered stage list.
- **DragState**: Transient UI state tracking which opportunity card is being dragged (id, stageId, full card data for overlay).

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can select a Customer, Contact, Owner, or Assignee in any form without ever needing to know or type a UUID.
- **SC-002**: Reference dropdowns load initial results within 500ms of the user stopping typing.
- **SC-003**: The global search bar renders results for 2+ character queries without causing any React error or application crash.
- **SC-004**: A dragged pipeline card remains fully visible above all other elements throughout the drag operation.
- **SC-005**: Pipeline stages are visually distinguishable by color without requiring users to read the stage name label.

## Assumptions

- The existing backend search and list APIs support pagination (`page`, `pageSize`, `search` query params) — no backend changes needed for dropdowns.
- Stage color assignment is purely a frontend concern — no backend color field needed.
- The global search crash is a frontend rendering bug, not a backend issue.
- The reusable `SearchableDropdown` component will use MUI `Autocomplete` with async loading.
- `@dnd-kit/core` already installed; only `DragOverlay` needs to be added to the pipeline implementation.
