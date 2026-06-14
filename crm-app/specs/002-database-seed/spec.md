# Feature Specification: Database Seed

**Feature Branch**: `002-database-seed`

**Created**: 2026-06-12

**Status**: Draft

**Input**: User description: "create database seed file for different cases, users, customers, etc,."

## Clarifications

### Session 2026-06-12

- Q: US4 mentioned "files associated with records" but Assumptions excluded file seeding — which is authoritative? → A: Remove files from US4 scope; Files section shows empty state by design.
- Q: When the seed re-runs against a database with existing seeded records, should it overwrite local edits or skip existing records? → A: Skip-if-exists (existence checks by unique key); preserves any local developer modifications.
- Q: FR-009 "per user type" — does this mean per notification type (3 of each type) or per seeded user account (3 per user)? → A: Per seeded user — each of the 5 user accounts receives at least 3 notifications (15 total minimum) covering all 3 types.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Developer Cold-Start Seed (Priority: P1)

A developer clones the repository and wants to start the application with realistic data immediately, without manually creating records through the UI. Running a single seed command populates all entities with enough data to exercise every screen and feature.

**Why this priority**: The seed is most critical as an onboarding/development tool. Without it, developers cannot test the application locally in a meaningful way.

**Independent Test**: Run `npm run seed` (or equivalent) against an empty database and verify the app launches with users of each role, customers in each status, contacts, opportunities across pipeline stages, tasks, and activities visible in the UI.

**Acceptance Scenarios**:

1. **Given** an empty database, **When** the seed command runs, **Then** all required entities are created without errors and the command exits with code 0.
2. **Given** a previously seeded database, **When** the seed command runs again, **Then** it either skips existing records (idempotent) or truncates and re-seeds cleanly without foreign-key errors.
3. **Given** seed data is present, **When** an admin logs in with the seeded admin credentials, **Then** they can access the dashboard and see populated metrics.

---

### User Story 2 — Role Coverage Seed (Priority: P1)

The seed creates one active user per role (System Administrator, Sales Manager, Sales Representative, Support Representative, Read-Only) with known, documented credentials so every role's permissions and UI visibility can be immediately tested.

**Why this priority**: Testing RBAC is the most critical correctness concern for the CRM. Without role-specific users, developers cannot verify that permission guards work correctly.

**Independent Test**: Log in with each of the 5 seeded role accounts and confirm that role-gated routes (e.g. `/audit` for admin only, `/users` for admin/manager) behave correctly.

**Acceptance Scenarios**:

1. **Given** the seed has run, **When** logging in with `admin@crm.local` / `Admin@123`, **Then** full admin access is granted.
2. **Given** the seed has run, **When** logging in with `salesrep@crm.local` / `SalesRep@123`, **Then** audit log route returns 403 and own customers are visible.
3. **Given** the seed has run, **When** logging in with `readonly@crm.local` / `ReadOnly@123`, **Then** no create/edit/delete actions are available.

---

### User Story 3 — Sales Pipeline Seed (Priority: P2)

The seed creates opportunities distributed across all pipeline stages (Lead → Qualified → Proposal → Negotiation → Won → Lost) so the pipeline board and reports are immediately functional and visually meaningful.

**Why this priority**: The pipeline board is the primary sales tool; empty stages make it impossible to visually verify drag-drop, filtering, or funnel charts.

**Independent Test**: Open `/pipeline` after seeding and confirm all stages contain at least 2 opportunity cards with varying revenue values.

**Acceptance Scenarios**:

1. **Given** seed data is present, **When** a Sales Manager views the pipeline board, **Then** each stage shows at least 2 opportunities.
2. **Given** seed data is present, **When** the dashboard revenue forecast is loaded, **Then** it displays a non-zero value derived from open opportunity expected revenues.
3. **Given** seed data is present, **When** the reports page generates a Win Rate report, **Then** it returns a percentage based on seeded Won vs. total closed opportunities.

---

### User Story 4 — Entity Relationship Coverage (Priority: P2)

The seed creates a web of related entities: customers with contacts, activities linked to customers and contacts, and tasks assigned to different users — ensuring detail pages show complete information. The Files section will display an empty state after seeding; this is expected and documented.

**Why this priority**: Isolated entities are insufficient; detail pages (CustomerDetailPage, OpportunityDetailPage) need related records to render completely.

**Independent Test**: Open a seeded customer detail page and verify it shows contacts, activities, opportunities, and tasks sections all populated (Files section is intentionally empty).

**Acceptance Scenarios**:

1. **Given** seed data is present, **When** a customer detail page is opened, **Then** it shows at least 2 contacts, 3 activities, 1 opportunity, and 2 tasks (Files section shows empty state — expected).
2. **Given** seed data is present, **When** global search is run with query "Acme", **Then** at least one customer, contact, and opportunity result appear.
3. **Given** seed data is present, **When** the task list is filtered by "overdue", **Then** at least 1 overdue task appears.

---

### User Story 5 — Notification & Audit Log Seed (Priority: P3)

The seed creates pre-existing audit log entries and notifications for the admin user so the Audit Log and Notification Center pages render with real data rather than empty states.

**Why this priority**: Lower priority because these pages are admin-only and can still be manually exercised, but seeded data avoids confusion during demos.

**Independent Test**: Log in as admin, open `/audit`, and see at least 10 audit entries. Open notification bell and see at least 3 unread notifications.

**Acceptance Scenarios**:

1. **Given** seed data is present, **When** the admin opens the audit log, **Then** at least 10 entries covering LOGIN, RECORD_CREATED, STATUS_CHANGED actions are visible.
2. **Given** seed data is present, **When** any seeded user opens the notification center, **Then** at least 2 unread notifications are present.

---

### Edge Cases

- What happens when seed runs with an existing dataset (idempotency)?
- What happens if seed is run on a database with missing migrations?
- How does the seed handle foreign-key ordering (roles before users, customers before contacts)?
- What happens if a required enum value (e.g. pipeline stage) has not been seeded yet?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The seed MUST create one user per role (5 roles total) with known, documented email/password credentials.
- **FR-002**: The seed MUST create at least 10 customers spanning all `CustomerStatus` values (PROSPECT, ACTIVE, INACTIVE, ARCHIVED) and different industries.
- **FR-003**: The seed MUST create at least 20 contacts distributed across seeded customers.
- **FR-004**: The seed MUST create at least 2 opportunities per pipeline stage (minimum 12 total), with varied expected revenue and probability values.
- **FR-005**: The seed MUST create at least 15 activities of all 5 types (PHONE_CALL, MEETING, EMAIL, NOTE, FOLLOW_UP) associated with customers and contacts.
- **FR-006**: The seed MUST create at least 10 tasks across all TaskType values, including at least 2 overdue tasks (past due date, status OPEN) and tasks assigned to different users.
- **FR-007**: The seed MUST create at least 1 team and assign seeded users to it so Sales Manager visibility scoping can be tested.
- **FR-008**: The seed MUST create at least 10 audit log entries covering LOGIN, RECORD_CREATED, RECORD_UPDATED, and STATUS_CHANGED actions.
- **FR-009**: The seed MUST create at least 3 notifications per seeded user (minimum 15 total across all 5 users), covering all 3 notification types (TASK_ASSIGNED, OPPORTUNITY_ASSIGNED, DUE_DATE_REMINDER), so every role account has a populated notification center.
- **FR-010**: The seed MUST be idempotent — running it multiple times MUST NOT result in duplicate records or errors. Idempotency MUST be implemented via existence checks (skip-if-exists by unique key): if a seeded record already exists, the seed skips it and preserves any local modifications made by the developer.
- **FR-011**: The seed MUST be runnable via a single script command defined in `backend/package.json`.
- **FR-012**: The seed MUST use Prisma's seed mechanism (`prisma/seed.ts`) or equivalent.
- **FR-013**: All seeded passwords MUST be bcrypt-hashed (never stored as plaintext).
- **FR-014**: The seed MUST seed the default pipeline stages (Lead, Qualified, Proposal, Negotiation, Won, Lost) if they do not already exist.
- **FR-015**: All seeded credentials (emails, passwords) MUST be documented in a `SEED_CREDENTIALS.md` file or inline comments.

### Key Entities

- **Role**: Pre-existing in DB via migration; seed must reference correct role names.
- **User**: 5 seeded users (one per role), plus a team linking Sales Manager and Sales Reps.
- **Team / TeamMember**: 1 team with Sales Manager + Sales Reps assigned.
- **Customer**: 10+ records with varied statuses, industries, revenue ranges.
- **Contact**: 20+ records linked to customers.
- **PipelineStage**: 6 default stages (upserted if missing).
- **Opportunity**: 12+ records spread across stages, linked to customers and contacts.
- **Activity**: 15+ records of all 5 types, linked to customers and contacts.
- **Task**: 10+ records with varied types, statuses, assignees, and due dates (including overdue).
- **AuditLog**: 10+ pre-fabricated entries covering key action types.
- **Notification**: 3+ per seeded user (15+ total), covering TASK_ASSIGNED, OPPORTUNITY_ASSIGNED, DUE_DATE_REMINDER types.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The seed command completes in under 30 seconds on a local development machine.
- **SC-002**: After seeding, all 5 role-based user accounts can log in successfully with documented credentials.
- **SC-003**: After seeding, the pipeline board displays opportunities in at least 4 distinct stages.
- **SC-004**: After seeding, the dashboard metrics show non-zero values for customers, opportunities, pipeline value, and open tasks.
- **SC-005**: After seeding, the audit log contains at least 10 entries searchable by actor, resource type, and date.
- **SC-006**: Running the seed command twice produces the same final database state (idempotency).
- **SC-007**: After seeding, global search returns results for common search terms (company names, contact names, opportunity titles).

## Assumptions

- The Prisma schema and all migrations have been applied before running the seed.
- The seed targets the development/test database only; production seeding is out of scope.
- Seeded passwords are intentionally weak and well-known (suitable for dev only); production deployments MUST rotate all credentials.
- Default pipeline stages (Lead → Won/Lost) are created by the seed if not present; any custom stages are out of scope.
- File attachments are not seeded (S3 dependency makes this impractical locally); the Files section of detail pages will show empty state.
- SSO configuration is not seeded; SSO login flows require separate manual setup.
- The seed uses existence checks (skip-if-exists by unique key) to achieve idempotency rather than truncating tables or upserting. This preserves any local data modifications made by developers between seed runs.
