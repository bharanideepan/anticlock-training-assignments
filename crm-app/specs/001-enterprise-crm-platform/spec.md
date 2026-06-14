# Feature Specification: Enterprise CRM Platform

**Feature Branch**: `001-enterprise-crm-platform`

**Created**: 2026-06-12

**Status**: Draft

**Input**: User description: "Build an enterprise-grade CRM platform for managing customers, contacts, sales opportunities, tasks, communications, reporting, and team collaboration from a single system."

## Clarifications

### Session 2026-06-12

- Q: What is the default data visibility model for Sales Representatives and Support Representatives? → A: Team-scoped — users see records owned by themselves or any member of their team; Sales Managers see their full team's data; System Administrators see everything.
- Q: Should the platform support enterprise SSO in addition to email/password login? → A: SSO + email/password fallback — supports SAML 2.0 / OIDC for enterprise SSO; email/password available for System Administrator accounts only.
- Q: What are the valid status values for a customer record? → A: Active, Prospect, Inactive, Archived.
- Q: What is the target uptime SLA for the platform? → A: 99.9% (~8.7 hours/year combined planned and unplanned downtime).
- Q: Should user accounts lock after repeated failed login attempts? → A: Log only — failed attempts are logged and visible to administrators for review; no automatic lockout or progressive delay is applied.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Authenticate and Access the Platform (Priority: P1)

A user (any role) opens the CRM platform and authenticates — non-administrator users via enterprise
SSO (SAML 2.0 / OIDC), System Administrators via email/password as a fallback. Once authenticated,
the user gains access to features permitted by their role. Administrators can change their password,
reset a forgotten password, and log out. All users can log out securely. An administrator can
activate or deactivate accounts.

**Why this priority**: Authentication is the entry gate to every other feature. Without it, no
other story can be tested or delivered.

**Independent Test**: A new user account can be created by an admin, the user logs in, accesses
their role-appropriate home screen, changes their password, and logs out — all without touching
any other feature module.

**Acceptance Scenarios**:

1. **Given** a non-administrator user, **When** they initiate login and complete the SSO flow via the configured identity provider, **Then** they are authenticated and redirected to their role-based dashboard without entering a CRM password.
1a. **Given** a System Administrator, **When** they submit valid email and password on the login form, **Then** they are authenticated and redirected to the admin dashboard.
2. **Given** a user who has forgotten their password, **When** they request a reset link and follow it, **Then** they can set a new password and log in successfully.
3. **Given** a deactivated account, **When** the user attempts to log in, **Then** access is denied with a clear message.
4. **Given** a logged-in user, **When** they click logout, **Then** their session is terminated and they are redirected to the login page.
5. **Given** an unauthenticated user, **When** they attempt to access any protected resource directly, **Then** they are redirected to the login page.

---

### User Story 2 - Manage Users and Roles (Priority: P1)

A System Administrator creates new user accounts, assigns roles (System Administrator, Sales
Manager, Sales Representative, Support Representative, Read-Only), assigns users to teams, and
can deactivate or reactivate accounts. Administrators can also reset a user's password on their
behalf.

**Why this priority**: User and role management is foundational infrastructure; all RBAC-dependent
stories depend on roles being assignable.

**Independent Test**: An admin can create a Sales Representative user, assign them to a team,
deactivate the account, reactivate it, and reset the password — verified without requiring any
CRM data to exist.

**Acceptance Scenarios**:

1. **Given** an admin user, **When** they create a new user with all required fields and assign a role, **Then** the user account is created, the user receives an activation email, and the role is enforced on first login.
2. **Given** an admin user, **When** they deactivate an active user, **Then** that user can no longer log in and their data remains intact.
3. **Given** an admin user, **When** they change a user's role, **Then** the updated permissions take effect on the user's next action.
4. **Given** an admin user, **When** they reset a user's password, **Then** the user receives a password-reset notification and must set a new password on next login.

---

### User Story 3 - Manage Customers (Priority: P1)

A Sales Representative or Sales Manager creates customer records for companies, fills in company
information (name, industry, website, revenue range, address, status, ownership), updates records,
archives inactive customers, and searches or filters the customer list.

**Why this priority**: Customers are the central entity of the CRM; contacts, opportunities,
activities, and files all depend on a customer record existing.

**Independent Test**: A sales user can create a customer, update its industry and status, search
for it by name, filter by industry, and archive it — all independently verifiable.

**Acceptance Scenarios**:

1. **Given** a sales user, **When** they submit a new customer form with required fields, **Then** the customer record is created, the creator is set as owner, and an audit entry is generated.
2. **Given** an existing customer, **When** a user updates its status to "Archived", **Then** the customer is removed from active lists but remains searchable with an "archived" filter.
3. **Given** a list of customers, **When** a user applies filters (e.g., industry = "Technology"), **Then** only matching customers are displayed.
4. **Given** a search term, **When** a user performs a search, **Then** all customers with matching name or domain are returned.

---

### User Story 4 - Manage Contacts (Priority: P1)

Users create contact records (individuals at a company), associate them with a customer, fill in
contact details (name, email, phone, designation, department, notes), update them, and view the
contact's interaction history.

**Why this priority**: Contacts are the primary people users interact with; opportunities and
activities reference them.

**Independent Test**: A user can create a contact linked to an existing customer, update the
designation, search for the contact, and view the contact's empty history — independently
verifiable once customers exist.

**Acceptance Scenarios**:

1. **Given** an existing customer, **When** a user creates a contact associated with that customer, **Then** the contact appears in the customer's contact list and in the global contact list.
2. **Given** a contact, **When** a user updates their phone number, **Then** the change is saved and an audit record is created.
3. **Given** a contact with recorded activities, **When** a user views the contact, **Then** the interaction history is displayed in reverse-chronological order.

---

### User Story 5 - Record Activities and Customer Interactions (Priority: P2)

Users log interactions with customers — phone calls, meetings, emails, notes, and follow-ups.
Each activity is associated with a customer (and optionally a contact). Users can view a
chronological timeline of all activities for a customer.

**Why this priority**: Activity tracking is the primary daily workflow for Sales Representatives
and Support Representatives; it depends on customers and contacts existing (P1 stories).

**Independent Test**: A user can log a "Phone Call" activity against a customer (with an optional
contact), edit it, and view the customer's activity timeline — independently testable once a
customer record exists.

**Acceptance Scenarios**:

1. **Given** a customer record, **When** a user logs a phone call activity with date, duration, and notes, **Then** the activity appears in the customer's timeline and an audit entry is created.
2. **Given** an activity, **When** a user edits the notes field, **Then** the updated notes are saved and the edit is reflected in the timeline.
3. **Given** a customer with multiple activities, **When** a user views the customer timeline, **Then** all activities are displayed in reverse-chronological order with type, date, and description visible.

---

### User Story 6 - Manage Sales Opportunities (Priority: P2)

Sales Representatives and Managers create sales opportunities linked to a customer and optionally
a contact. They fill in opportunity details (name, expected revenue, probability, expected close
date, stage), assign an owner, and progress the opportunity through the pipeline stages (Lead →
Qualified → Proposal → Negotiation → Won/Lost).

**Why this priority**: Opportunity management is the core of the sales workflow; pipelines and
reporting depend on opportunities.

**Independent Test**: A user can create an opportunity for an existing customer, assign it to a
sales rep, move it from "Qualified" to "Proposal", and close it as "Won" — independently testable
once a customer record exists.

**Acceptance Scenarios**:

1. **Given** a customer, **When** a user creates an opportunity with all required fields, **Then** the opportunity is created at the default "Lead" stage with the creating user as owner.
2. **Given** an opportunity in "Proposal" stage, **When** the owner moves it to "Negotiation", **Then** the stage change is saved and an audit entry records the transition.
3. **Given** an opportunity in "Negotiation", **When** a user closes it as "Won", **Then** the status is updated, the close date is recorded, and the opportunity no longer appears in the active pipeline.

---

### User Story 7 - Visual Pipeline Management (Priority: P2)

Sales Representatives and Managers view the pipeline as a Kanban board with columns for each
stage. They can drag-and-drop (or select-and-move) opportunities between stages, filter by owner
or date range, and search for specific opportunities.

**Why this priority**: Pipeline visibility is the primary management tool for Sales Managers;
depends on opportunities existing (P2 — US6).

**Independent Test**: A user can load the pipeline board, see existing opportunities grouped by
stage, move one to the next stage, and filter by a team member's name — independently verifiable
once opportunities exist.

**Acceptance Scenarios**:

1. **Given** active opportunities, **When** a user opens the pipeline view, **Then** all opportunities are displayed in the correct stage column with name, value, and expected close date visible.
2. **Given** an opportunity on the pipeline board, **When** a user moves it to a new stage, **Then** the opportunity's stage is updated immediately and an audit entry is created.
3. **Given** a populated pipeline, **When** a user filters by owner "Jane Smith", **Then** only opportunities owned by Jane Smith are displayed.

---

### User Story 8 - Task Management (Priority: P2)

Users create tasks of type Follow-up, Call, Meeting, Email, or Internal Action Item. Tasks can be
assigned to a team member, given a due date, and linked to a customer or opportunity. Users update
task status (open → completed / cancelled) and receive reminders for upcoming and overdue tasks.

**Why this priority**: Task management is a daily operational tool for all sales and support users.

**Independent Test**: A user can create a "Follow-up" task for a customer, assign it to a
colleague, mark it as completed, and verify the status change — independently testable.

**Acceptance Scenarios**:

1. **Given** a user, **When** they create a task with type, due date, assignee, and optional customer link, **Then** the task is created and the assignee receives a notification.
2. **Given** an open task past its due date, **When** the assignee views their task list, **Then** the overdue task is highlighted and a reminder notification is visible.
3. **Given** a task, **When** the assignee marks it as completed, **Then** the status changes and the task moves to the completed list with a completion timestamp.

---

### User Story 9 - Role-Based Dashboard (Priority: P2)

Each user sees a dashboard tailored to their role. Sales Managers see team performance and
pipeline value. Sales Representatives see their own opportunities, tasks, and activities. The
dashboard displays key metrics (customers, opportunities, pipeline value, revenue forecast, open
tasks) and visualizations (revenue trends, pipeline funnel, activity trends).

**Why this priority**: Dashboards depend on data from all core entities being available.

**Independent Test**: With at least one customer, one opportunity, and one task in the system, a
Sales Manager can view their dashboard and see non-zero metric cards and at least one chart — verifiable independently.

**Acceptance Scenarios**:

1. **Given** a Sales Manager, **When** they open the dashboard, **Then** they see aggregate metrics (total customers, active opportunities, pipeline value, open tasks) and team performance charts.
2. **Given** a Sales Representative, **When** they open the dashboard, **Then** they see only opportunities and tasks owned by themselves or members of their team; records owned by users outside their team are not visible.
3. **Given** a dashboard metric card, **When** the underlying data changes (e.g., a new customer is added), **Then** the metric updates within one page refresh cycle.

---

### User Story 10 - Reporting (Priority: P3)

Users generate reports across Sales (revenue performance, win rate, conversion rate, opportunity
trends), Customer (growth, distribution, industry analysis), and User Productivity (activity
completion, task completion, opportunity ownership). Reports can be filtered by date range and
other dimensions, and exported.

**Why this priority**: Reporting aggregates data across all P1/P2 features; it is high-value but
not blocking for core operations.

**Independent Test**: A Sales Manager can generate a "Win Rate" sales report for the last 30
days, filter it to a specific sales rep, and export the result — verifiable once opportunity data
exists.

**Acceptance Scenarios**:

1. **Given** a Sales Manager, **When** they request a "Revenue Performance" report with a date range, **Then** a report is generated showing total revenue by period.
2. **Given** a report, **When** a user applies a filter (e.g., owner = a specific sales rep), **Then** the report data updates to reflect only records matching the filter.
3. **Given** a generated report, **When** a user clicks Export, **Then** the report is downloaded in CSV format with column headers and all filtered rows.

---

### User Story 11 - Notifications (Priority: P3)

Users receive in-app and email notifications for: task assignments, opportunity assignments,
upcoming due dates (within 24 hours), overdue tasks, and customer updates relevant to their role.

**Why this priority**: Notifications enhance workflow but are not required for core operations
delivered in P1/P2 stories.

**Independent Test**: When a task is assigned to a user, they receive both an in-app notification
and an email — verifiable by assigning a task and checking the notification bell and inbox.

**Acceptance Scenarios**:

1. **Given** a task assigned to User A, **When** the assignment is saved, **Then** User A sees a new notification in their in-app notification center and receives an email within 5 minutes.
2. **Given** a task due tomorrow, **When** the system runs its daily reminder sweep, **Then** the assignee receives a due-date reminder notification.
3. **Given** a user, **When** they open the notification center, **Then** they see all unread notifications and can mark them as read individually or all at once.

---

### User Story 12 - File Management (Priority: P3)

Users upload files (contracts, quotations, proposals, customer documents) and associate them with
a customer, opportunity, or activity. Files can be downloaded by any user with access to the
associated record.

**Why this priority**: File storage is supplementary to core CRM operations.

**Independent Test**: A user can upload a PDF contract to a customer record and download it again
— verifiable without any other P3 story being complete.

**Acceptance Scenarios**:

1. **Given** a customer record, **When** a user uploads a PDF file, **Then** the file appears in the customer's document list with name, uploader, and upload date.
2. **Given** a file on a customer record, **When** a user clicks Download, **Then** the file is downloaded with its original name and content intact.
3. **Given** a user without access to a customer record, **When** they attempt to download a file from that record directly, **Then** the request is rejected with an authorization error.

---

### User Story 13 - Global Search (Priority: P3)

Users perform a global search query that returns matching results across Customers, Contacts,
Opportunities, Activities, and Tasks. Results are filterable by entity type.

**Why this priority**: Global search is a productivity feature that enhances navigation once data
is in the system.

**Independent Test**: With data in all entity types, a user can search for a known company name
and see matching results from multiple entity categories — verifiable once P1/P2 data exists.

**Acceptance Scenarios**:

1. **Given** a search query "Acme", **When** a user submits it, **Then** all entities (customers, contacts, opportunities, etc.) with "Acme" in their name or description are returned, grouped by type.
2. **Given** a set of search results, **When** a user applies a filter "Opportunities only", **Then** only opportunity results are displayed.
3. **Given** a search query returning no results, **When** displayed, **Then** a clear "No results found" message is shown with a suggestion to broaden the search.

---

### User Story 14 - Data Import and Export (Priority: P3)

Users import customers and contacts from CSV files. The system validates the data and reports
errors before processing. Users can also export customer data, contact data, and report data.

**Why this priority**: Bulk data operations are useful for onboarding and data portability but are
not required for day-to-day CRM operations.

**Independent Test**: A user can upload a valid customer CSV, see a validation preview, confirm
the import, and verify records appear in the customer list — independently testable.

**Acceptance Scenarios**:

1. **Given** a valid CSV file with customer data, **When** a user uploads it for import, **Then** a preview of records and validation results is shown before final confirmation.
2. **Given** an invalid CSV (missing required field), **When** a user uploads it, **Then** row-level errors are clearly reported and no records are imported until errors are resolved.
3. **Given** a confirmed import, **When** processing completes, **Then** all valid records are created with an audit entry referencing the import operation.

---

### User Story 15 - Audit Log Access (Priority: P3)

Administrators can search and view the audit trail — a chronological log of all significant
system events (logins, logouts, record create/update/delete, ownership changes, status changes).

**Why this priority**: Audit access is a governance and compliance capability; the audit trail
itself is populated by P1/P2 operations.

**Independent Test**: After performing a series of login, create-customer, and update-customer
operations, an admin can query the audit log and see those events with correct actor, timestamp,
and resource information.

**Acceptance Scenarios**:

1. **Given** an admin, **When** they search the audit log by resource type "Customer" and date range, **Then** all matching audit entries are returned in reverse-chronological order.
2. **Given** an audit entry, **When** the admin views it, **Then** it shows actor identity, timestamp, resource type, resource ID, action performed, and changed values.
3. **Given** a non-admin user, **When** they attempt to access the audit log, **Then** access is denied with an authorization error.

---

### Edge Cases

- What happens when two users simultaneously update the same customer record?
- How does the system handle file uploads that exceed the maximum allowed size?
- What happens when an opportunity's customer is archived? (Expected: the opportunity is automatically moved to a terminal "Closed — Customer Archived" state and removed from the active pipeline; existing audit and activity data is preserved.)
- How does pipeline stage configuration deletion affect existing opportunities in that stage?
- What happens when a user is deactivated while they have open tasks assigned to them?
- How are search results ranked when a query matches multiple fields?
- What happens if a CSV import row references a customer that does not yet exist in the system?

---

## Requirements *(mandatory)*

### Functional Requirements

**Data Visibility (RBAC — Read Access)**

- **FR-000**: The system MUST enforce team-scoped data visibility by default: Sales Representatives and Support Representatives MUST see only records (customers, contacts, opportunities, activities, tasks, files) that are owned by themselves or by any member of their assigned team. Sales Managers MUST see all records belonging to users in their team. System Administrators MUST see all records organization-wide. Read-Only Users follow the same scope as Sales Representatives.

**Authentication & Access**

- **FR-001**: The system MUST require users to authenticate before accessing any protected resource.
- **FR-002**: The system MUST support enterprise Single Sign-On via SAML 2.0 or OIDC as the primary authentication path for non-administrator users. Email/password authentication MUST be available exclusively for System Administrator accounts as a fallback when the identity provider is unavailable.
- **FR-002a**: The system MUST allow an administrator to configure the identity provider (IdP) endpoint, entity ID, and certificate from the system settings screen.
- **FR-003**: The system MUST provide a password-reset flow via email link with a time-limited token.
- **FR-004**: The system MUST allow users to change their own password when authenticated.
- **FR-005**: The system MUST enforce session expiry after a configurable period of inactivity.
- **FR-006**: The system MUST log all login, logout, failed login, and password-reset events. Failed login attempts MUST be visible in the audit log and flagged for administrator review; no automatic account lockout or progressive delay is applied. Administrators MUST be able to manually deactivate an account at any time if suspicious activity is identified.

**User Management**

- **FR-007**: Administrators MUST be able to create, update, deactivate, and reactivate user accounts.
- **FR-008**: The system MUST support five roles: System Administrator, Sales Manager, Sales Representative, Support Representative, Read-Only User.
- **FR-009**: Each user account MUST be assigned exactly one role at any time.
- **FR-010**: Administrators MUST be able to assign users to one or more teams.
- **FR-011**: Administrators MUST be able to reset a user's password on their behalf.

**Customer Management**

- **FR-012**: Authenticated users with appropriate permission MUST be able to create, update, and view customer records.
- **FR-013**: The system MUST support setting a customer's status to Archived; archived customers are excluded from all default list and search views but remain accessible when an explicit "Archived" status filter is applied. Only System Administrators may restore an Archived customer to Inactive status.
- **FR-014**: Users MUST be able to search and filter customers within their visibility scope (per FR-000) by name, industry, status, and owner.
- **FR-015**: Each customer record MUST capture: company name, industry, website, revenue range, address, status, and owner. Valid status values are: **Prospect** (pre-conversion), **Active** (live account), **Inactive** (lapsed, potentially recoverable), and **Archived** (removed from all active working views). Status transitions are: Prospect → Active, Active → Inactive, Inactive → Active, any status → Archived. Archived is a terminal state; only an administrator may un-archive a record.

**Contact Management**

- **FR-016**: Users MUST be able to create and update contact records associated with a customer.
- **FR-017**: Each contact record MUST capture: full name, email, phone number, designation, department, and notes.
- **FR-018**: Users MUST be able to search contacts by name or email.
- **FR-019**: The system MUST display a contact's interaction history in reverse-chronological order (newest first).

**Activity & Interaction Tracking**

- **FR-020**: Users MUST be able to create activity records of types: Phone Call, Meeting, Email, Note, Follow-up.
- **FR-021**: Each activity MUST be associated with a customer; contact association is optional.
- **FR-022**: Users MUST be able to edit activity records they created.
- **FR-023**: The system MUST display a customer's activity timeline in reverse-chronological order.

**Opportunity Management**

- **FR-024**: Users MUST be able to create, update, and close sales opportunities linked to a customer.
- **FR-025**: Opportunities MUST support: name, customer, contact (optional), owner, expected revenue, probability, expected close date, and pipeline stage.
- **FR-026**: The system MUST support six default pipeline stages: Lead, Qualified, Proposal, Negotiation, Won, Lost.
- **FR-027**: Pipeline stages MUST be configurable (add, rename, reorder) by administrators.
- **FR-028**: Closing an opportunity MUST record the close date and remove it from the active pipeline view.

**Pipeline Management**

- **FR-029**: The system MUST provide a visual pipeline board displaying opportunities grouped by stage.
- **FR-030**: Users MUST be able to move opportunities between stages from the pipeline board.
- **FR-031**: Users MUST be able to filter pipeline opportunities by owner, stage, and date range.

**Task Management**

- **FR-032**: Users MUST be able to create tasks with type, description, due date, assignee, and optional customer/opportunity link.
- **FR-033**: The system MUST support five task types: Follow-up, Call, Meeting, Email, Internal Action Item.
- **FR-034**: Assignees MUST receive a notification when a task is assigned to them.
- **FR-035**: The system MUST mark tasks as overdue when their due date passes without completion.
- **FR-036**: Users MUST be able to complete or cancel tasks they own or are assigned.

**Dashboard**

- **FR-037**: The system MUST provide a role-adapted dashboard displaying metrics relevant to the user's role.
- **FR-038**: Dashboard MUST display: total customers, new customers (current period), active opportunities, won/lost opportunities, pipeline value, revenue forecast, open tasks, overdue tasks.
- **FR-039**: Dashboard MUST include visualizations: revenue trend chart, pipeline funnel, opportunity distribution, team performance (Managers only), activity trend.

**Reporting**

- **FR-040**: The system MUST support generating reports in three categories: Sales, Customer, and User Productivity.
- **FR-041**: All reports MUST support filtering by date range and at least one entity-specific dimension.
- **FR-042**: All reports MUST support export to CSV format.

**Notifications**

- **FR-043**: The system MUST deliver in-app notifications for: task assignment, opportunity assignment, due date reminders (24 hours before), overdue tasks, and customer status changes (INACTIVE or ARCHIVED transitions). For customer status notifications, the recipient is the customer's assigned owner. Email delivery mirrors in-app for all event types (FR-044).
- **FR-044**: The system MUST send email notifications for the same event types as in-app notifications.
- **FR-045**: Users MUST be able to mark notifications as read individually or in bulk.

**File Management**

- **FR-046**: Users MUST be able to upload files and associate them with a customer, opportunity, or activity.
- **FR-047**: Users with access to the parent record MUST be able to download associated files.
- **FR-048**: The system MUST restrict file access based on the viewer's permission to the parent record.

**Audit Logging**

- **FR-049**: The system MUST generate an immutable audit entry for: login, logout, record creation, record modification, record deletion, ownership changes, and status changes.
- **FR-050**: Audit entries MUST capture: actor, timestamp, resource type, resource ID, action, previous value, new value, and IP address.
- **FR-051**: Administrators MUST be able to search audit logs by resource type, actor, and date range.

**Search**

- **FR-052**: The system MUST provide a global search feature covering customers, contacts, opportunities, activities, and tasks.
- **FR-053**: Global search results MUST be filterable by entity type.

**Data Import / Export**

- **FR-054**: Users MUST be able to import customer and contact records from CSV files.
- **FR-055**: The system MUST validate imported rows and report errors before committing any records.
- **FR-056**: Users MUST be able to export customer data, contact data, and report data to CSV.

### Key Entities

- **User**: A person who accesses the system; has a role, team assignment, and status (active/inactive).
- **Role**: Defines the set of permissions for a user category (Administrator, Sales Manager, Sales Rep, Support Rep, Read-Only).
- **Team**: A grouping of users for organizational and reporting purposes.
- **Customer**: A company or organization being managed in the CRM; the central entity most others associate with.
- **Contact**: An individual person associated with a customer.
- **Activity**: A recorded interaction between a user and a customer/contact (call, meeting, email, note, follow-up).
- **Opportunity**: A potential sales deal linked to a customer, tracked through pipeline stages.
- **PipelineStage**: A named stage within the sales pipeline (e.g., Lead, Proposal, Won).
- **Task**: An actionable item assigned to a user, optionally linked to a customer or opportunity.
- **Notification**: An in-app alert generated by a system event (assignment, reminder, update).
- **File**: A document or attachment associated with a customer, opportunity, or activity.
- **AuditLog**: An immutable record of a significant system event.
- **Report**: An aggregated, filterable view of business data across a defined time range.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can complete the login flow and reach their dashboard in under 30 seconds from the login page.
- **SC-002**: A sales user can create a complete customer record with all required fields in under 2 minutes.
- **SC-003**: Customer and contact list pages load with up to 10,000 records in under 3 seconds under normal load.
- **SC-004**: Search results across all entity types are returned in under 2 seconds for a query matching up to 1,000 records.
- **SC-005**: The platform supports 1,000 concurrent active users without measurable response-time degradation on core pages.
- **SC-006**: Dashboard KPI metric tiles (totals, counts) reflect changes within one page-refresh cycle; chart visualizations (revenue trend, pipeline funnel, etc.) may be cached for up to 5 minutes.
- **SC-007**: 100% of mutating operations (create, update, delete, ownership change, status change) produce a corresponding audit log entry.
- **SC-008**: A report covering 12 months of data can be generated and exported in under 30 seconds.
- **SC-009**: A CSV import of 1,000 customer records completes validation and processing in under 60 seconds.
- **SC-010**: Notification delivery (in-app) occurs within 10 seconds of the triggering event.
- **SC-011**: The platform achieves 99.9% measured monthly uptime; scheduled maintenance windows are communicated at least 48 hours in advance.

---

## Assumptions

- Users access the platform via a modern web browser on desktop or tablet; native mobile app is out of scope for this version.
- Email delivery for password resets and notifications relies on an SMTP-compatible mail service configured at deployment time; the specific provider is not specified by this feature.
- File storage uses a configured object-storage backend; maximum individual file size is 25 MB unless overridden in configuration.
- Session inactivity timeout defaults to 30 minutes; this is configurable by an administrator.
- Pipeline stage configuration (add/rename/reorder) is an administrator function; stage deletion is only permitted if no opportunities are currently in that stage.
- The CSV import format for customers and contacts will be documented; the template is downloadable from the import screen.
- Concurrent-edit conflict handling (two users updating the same record simultaneously) resolves as last-write-wins with both users notified of the conflict; optimistic locking may be introduced in a future iteration.
- Revenue forecast on the dashboard is calculated as the sum of (expected revenue × probability/100) for all open opportunities in the current calendar year (January–December). "Fiscal period" in this document means calendar year for v1; fiscal-year configurability is deferred to a future iteration.
- The platform is designed to support future integration with email, calendar, ERP, marketing automation, and analytics platforms via an API-first architecture; actual integrations are out of scope for this version.
- All date/time values are stored in UTC; display is localized to the authenticated user's configured timezone.
