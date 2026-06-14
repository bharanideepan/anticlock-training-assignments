# Feature Specification: Detail Page Enrichment

**Feature Branch**: `009-detail-page-enrichment`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User description: "in detail pages, tab contents showing very less data as plain text - need more info, actionable"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Rich Customer Tab Content (Priority: P1)

A sales representative opens a customer detail page and clicks the **Contacts** tab. Instead of seeing just a name in plain text, they see a card-style row per contact showing the contact's name, designation, department, email (clickable to compose), and phone (clickable to call), along with an **Add Contact** button at the top of the tab. The same pattern applies to the **Activities**, **Opportunities**, and **Tasks** tabs — each shows a compact, information-dense row with the most relevant fields for that record type, plus a button to create a new related record directly from the tab.

**Why this priority**: The customer detail page is the most-visited record type in a CRM. Reducing click depth to access related records and enabling creation from context is the highest-impact improvement.

**Independent Test**: Open any customer detail page. The Contacts tab shows name + designation + email + phone per row and an "Add Contact" button. The Opportunities tab shows name + stage chip + expected revenue + close date per row and an "Add Opportunity" button.

**Acceptance Scenarios**:

1. **Given** a customer with contacts, **When** the Contacts tab is viewed, **Then** each contact row shows: full name (bold), designation + department, email as a mailto link, phone as a tel link — all on two lines.
2. **Given** a customer with opportunities, **When** the Opportunities tab is viewed, **Then** each row shows: opportunity name, stage as a colored chip, expected revenue, close date, and owner name.
3. **Given** a customer with activities, **When** the Activities tab is viewed, **Then** each row shows: activity type as a chip, subject, date, and notes preview (truncated).
4. **Given** a customer with tasks, **When** the Tasks tab is viewed, **Then** each row shows: task title, status chip, due date, and assignee name.
5. **Given** any tab with records, **When** a row is clicked, **Then** the user navigates to that record's detail page.
6. **Given** the Contacts tab, **When** "Add Contact" is clicked, **Then** the user is taken to the create contact form pre-filled with the current customer.
7. **Given** any tab, **When** there are no records, **Then** a friendly empty state message is shown with a call-to-action button to create the first related record.

---

### User Story 2 — Opportunity Detail Working Tabs (Priority: P2)

A sales manager opens an opportunity detail page and clicks the **Tasks** tab. Instead of seeing "Task management coming in Phase 10." placeholder text, they see a list of tasks linked to this opportunity — each showing title, status, due date, assignee, and a priority chip — plus an "Add Task" button. The **Files** tab similarly shows uploaded files (name, size, uploaded date, uploader) instead of a placeholder.

**Why this priority**: Placeholder text in shipped UI is a credibility problem. Tasks and files are the primary supporting artifacts for an opportunity, so empty/broken tabs block sales workflow.

**Independent Test**: Open any opportunity. The Tasks tab shows real tasks (or an empty state), not placeholder text. An "Add Task" button is present.

**Acceptance Scenarios**:

1. **Given** an opportunity with tasks, **When** the Tasks tab is viewed, **Then** each task row shows: title, status chip, due date, and assignee name.
2. **Given** an opportunity with no tasks, **When** the Tasks tab is viewed, **Then** an empty state and "Add Task" button are shown — no placeholder text.
3. **Given** an opportunity with files, **When** the Files tab is viewed, **Then** each row shows: file name, file size, upload date, and uploader name.
4. **Given** an opportunity with no files, **When** the Files tab is viewed, **Then** an empty state is shown — no placeholder text.
5. **Given** the Tasks tab, **When** "Add Task" is clicked, **Then** the task form opens pre-linked to this opportunity.

---

### User Story 3 — Contact Detail Enriched Info & Related Records (Priority: P3)

A support representative opens a contact detail page. The summary panel currently shows "Email: abc@..." as plain text — instead it shows a structured grid with clickable email (mailto link), clickable phone (tel link), LinkedIn URL (if set), designation, department, and notes. The **Opportunities** tab — currently showing a useless placeholder — now shows the opportunities this contact is linked to, with name, stage, and revenue. The **Activities** tab shows richer rows with type chip, subject, notes preview, and date.

**Why this priority**: Contacts are the primary communication target. Clicking email or phone directly from the detail page removes friction and the placeholder Opportunities tab is non-functional.

**Independent Test**: Open a contact's detail page. Email shows as a clickable mailto link. The Opportunities tab shows linked opportunities (or an empty state), not a placeholder.

**Acceptance Scenarios**:

1. **Given** a contact with an email, **When** the detail page loads, **Then** email is shown as a clickable mailto link with a mail icon.
2. **Given** a contact with a phone number, **When** the detail page loads, **Then** phone is shown as a clickable tel link with a phone icon.
3. **Given** a contact linked to opportunities, **When** the Opportunities tab is viewed, **Then** each row shows: opportunity name (clickable), stage chip, expected revenue, and close date.
4. **Given** a contact with activities, **When** the Activities tab is viewed, **Then** each row shows: type chip, subject, date, and a truncated notes preview.
5. **Given** the Activities tab, **When** "Log Activity" is clicked, **Then** the activity form opens pre-linked to this contact.

---

### User Story 4 — Consistent Empty States Across All Detail Pages (Priority: P4)

Whenever a tab has no data, all detail pages show a consistent empty state: a brief message ("No contacts yet.") and a primary action button to add the first record. No tab ever shows a developer-facing placeholder like "coming in Phase X".

**Why this priority**: Empty states define first-run UX. Placeholder text damages trust and confuses users.

**Independent Test**: Create a brand-new customer with no related records. Open its detail page. Every tab shows a friendly empty state with an action button — not blank content, not placeholder text.

**Acceptance Scenarios**:

1. **Given** any tab with no records, **When** viewed, **Then** an icon, a short message, and a CTA button are shown.
2. **Given** any tab with no records, **When** the CTA button is clicked, **Then** the appropriate create/log form opens pre-linked to the parent record.
3. **Given** no tab in any detail page across the application, **When** viewed, **Then** no placeholder text referencing unreleased phases is visible.

---

### Edge Cases

- What happens when a related record count in the tab badge doesn't match the actual list (stale counts)?
- How does each tab handle loading state (spinner vs. skeleton rows)?
- What happens if the user lacks permission to create related records — should the "Add" button be hidden or disabled?
- What if a contact has no email or phone — should those fields be omitted or shown as "—"?
- How does the files tab handle very long file names (truncation)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All tab content across Customer, Contact, and Opportunity detail pages MUST display rich multi-field rows instead of single-line plain text.
- **FR-002**: Contact rows MUST show: full name, designation + department (if set), email as a mailto link, phone as a tel link (if set).
- **FR-003**: Activity rows MUST show: type as a chip, subject, occurrence date, and a truncated notes preview (max 80 chars).
- **FR-004**: Opportunity rows MUST show: name, stage as a colored chip, expected revenue (formatted as currency), expected close date, and owner name.
- **FR-005**: Task rows MUST show: title, status as a chip, due date (if set), and assignee name (if set).
- **FR-006**: Every tab MUST include an action button ("Add Contact", "Log Activity", "Add Opportunity", "Add Task") visible at the top of the tab, visible only to users with permission to create that record type.
- **FR-007**: Clicking any row in any tab MUST navigate to that record's detail page.
- **FR-008**: Clicking an "Add" button in a tab MUST open the creation form pre-linked to the parent record (e.g., customerId pre-filled).
- **FR-009**: The Opportunity detail page Tasks tab MUST show real tasks from the API, not placeholder text.
- **FR-010**: The Opportunity detail page Files tab MUST show real files from the API, not placeholder text.
- **FR-011**: Contact detail Opportunities tab MUST show linked opportunities from the API, not placeholder text.
- **FR-012**: Contact detail page summary MUST render email as a mailto link and phone as a tel link with appropriate icons.
- **FR-013**: Every tab with no records MUST display a consistent empty state: an icon, a short descriptive message, and a CTA button (permission-gated).
- **FR-014**: File rows MUST show: file name, formatted file size, upload date, and uploader name.
- **FR-015**: No tab across any detail page in the application MUST display developer placeholder text referencing unreleased phases.
- **FR-016**: Each tab MUST fetch and display at most 10 records (the 10 most recent), sorted by creation or occurrence date descending. Tabs with more records available MUST show a "View all" link that navigates to the relevant list page pre-filtered by the parent record. Unbounded queries to the backend are prohibited.
- **FR-017**: Tab data MUST be fetched lazily — a tab's API call is triggered only when the user first clicks that tab. Subsequent visits to the same tab within the session MUST use cached data without re-fetching.

### Key Entities

- **Customer**: Has contacts, activities, opportunities, tasks, files as related records
- **Contact**: Has activities, opportunities as related records; belongs to a customer
- **Opportunity**: Has tasks, files as related records; belongs to a customer and optionally a contact
- **Activity**: Belongs to a customer, optionally a contact; has type, subject, notes, occurredAt
- **Task**: Belongs to a customer or opportunity; has title, status, dueDate, assignee
- **File**: Belongs to a customer or opportunity; has name, size, uploadedAt, uploader

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every related-record tab shows at least 3 data fields per row (not just a name).
- **SC-002**: Zero tabs across any detail page display placeholder or "coming in Phase X" text after this feature ships.
- **SC-003**: A user can navigate from a customer detail page to a specific contact's detail page in 2 clicks or fewer.
- **SC-004**: A user can initiate creating a related record (contact, activity, task) from a detail page tab without navigating away first — total actions to open the form ≤ 2 clicks.
- **SC-005**: Every tab with no records shows a non-blank empty state with an action button.
- **SC-006**: Clickable email and phone links on Contact detail pages reduce the steps to communicate with a contact to 1 click from the detail page.
- **SC-007**: No tab issues an unbounded backend query; each tab requests at most 10 records with a page size parameter.

## Clarifications

### Session 2026-06-14

- Q: How should each tab handle large numbers of related records? → A: Show the 10 most recent records per tab, with a "View all" link that navigates to the full list page filtered by the parent record.
- Q: Should tab data load when the page opens or only when each tab is first clicked? → A: Lazy — each tab's data fetches only when that tab is first clicked; subsequent revisits use cached data.

## Assumptions

- The backend APIs already return the required fields for all related records (contacts, activities, opportunities, tasks, files) on existing list endpoints — no new backend endpoints are needed.
- The opportunity tasks API and files API already exist and are functional; only the frontend tab rendering was deferred.
- The contact's linked opportunities are accessible via an existing API endpoint (e.g., `/contacts/:id/opportunities`).
- Permission-gating for "Add" buttons follows the same role checks already used elsewhere in the respective pages.
- File upload/download functionality is out of scope for this feature — only the file listing in the Files tab is in scope.
- Activity and task creation forms already exist and support pre-linking via query params or navigation state.
