# Tasks: Database Seed

**Input**: Design documents from `specs/002-database-seed/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | quickstart.md ✅

**Tests**: Not requested — seed is a developer tool; validation is manual via quickstart.md scenarios.

**Organization**: Tasks grouped by user story. All tasks target `backend/prisma/seed.ts` (single file) or `backend/package.json` / `backend/SEED_CREDENTIALS.md`. Sequential within each phase due to FK dependency chain.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup

**Purpose**: Wire up the seed command and document credentials before writing any seed logic.

- [x] T001 Add `prisma.seed` configuration to `backend/package.json` — set to `"ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"`; also add `"seed": "npx prisma db seed"` to the `scripts` section
- [x] T002 [P] Create `backend/SEED_CREDENTIALS.md` — document all 6 seeded user email/password pairs in a markdown table with columns: Email | Password | Role | Notes; include a warning that these are dev-only credentials

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the seed file skeleton and seed the two entity types that have no FK dependencies (Roles and PipelineStages). All subsequent phases depend on these existing.

**⚠️ CRITICAL**: No user story phases can begin until this phase is complete.

- [x] T003 Rewrite `backend/prisma/seed.ts` skeleton — replace the existing file with: imports (`PrismaClient`, all required enums from `@prisma/client`, `bcrypt` from `'bcrypt'`); a `const prisma = new PrismaClient()`; a `main()` async function with a top-level try/catch that logs errors and calls `process.exit(1)` on failure; and a final `.finally(() => prisma.$disconnect())` call. Include a `skipIfExists` helper comment pattern but implement each entity's skip inline. The file should compile cleanly with no implementation yet.
- [x] T004 Implement role seeding in `backend/prisma/seed.ts` — inside `main()`, iterate over all `RoleName` enum values; for each, call `prisma.role.findFirst({ where: { name } })`; if not found, call `prisma.role.create({ data: { name } })`; log `Seeded N roles` at the end (counting only newly created ones, or total if all skipped).
- [x] T005 Implement pipeline stages seeding in `backend/prisma/seed.ts` — after role seeding, define the 6 stages array: `[{ name: 'Lead', displayOrder: 1, isDefault: true, isTerminal: false }, { name: 'Qualified', displayOrder: 2, ... }, { name: 'Proposal', displayOrder: 3 }, { name: 'Negotiation', displayOrder: 4 }, { name: 'Won', displayOrder: 5, isTerminal: true, terminalOutcome: 'WON' }, { name: 'Lost', displayOrder: 6, isTerminal: true, terminalOutcome: 'LOST' }]`; for each, `findFirst({ where: { name } })` and skip if found, else `create`; log `Seeded N pipeline stages`.

**Checkpoint**: `npm run seed` should now exit 0 and log roles + stages.

---

## Phase 3: User Story 2 — Role Coverage Seed (Priority: P1) 🎯 MVP

**Goal**: One active user per role with known bcrypt-hashed passwords; one team linking Sales Manager and Sales Representatives for RBAC visibility scoping.

**Independent Test**: Run `npm run seed`, then `POST /api/v1/auth/login` with each of the 6 credentials from `SEED_CREDENTIALS.md`. All should return 200 + accessToken. Log in as salesrep@crm.local and verify `GET /api/v1/audit` returns 403.

- [x] T006 [US2] Implement user seeding in `backend/prisma/seed.ts` — after pipeline stages, look up each role by `prisma.role.findFirstOrThrow({ where: { name: RoleName.X } })`; for each of 6 users, call `prisma.user.findFirst({ where: { email } })`; if not found, hash the password with `bcrypt.hash(plaintext, 10)` and call `prisma.user.create`; users to create: `admin@crm.local` / `Admin@123` / SYSTEM_ADMINISTRATOR / firstName='System' lastName='Administrator'; `manager@crm.local` / `Manager@123` / SALES_MANAGER / firstName='Sarah' lastName='Manager'; `salesrep@crm.local` / `SalesRep@123` / SALES_REPRESENTATIVE / firstName='John' lastName='SalesRep'; `salesrep2@crm.local` / `SalesRep2@123` / SALES_REPRESENTATIVE / firstName='Jane' lastName='SalesRep'; `support@crm.local` / `Support@123` / SUPPORT_REPRESENTATIVE / firstName='Alex' lastName='Support'; `readonly@crm.local` / `ReadOnly@123` / READ_ONLY / firstName='Bob' lastName='ReadOnly'; log `Seeded N users`.
- [x] T007 [US2] Implement team and team member seeding in `backend/prisma/seed.ts` — after user seeding, find or create team `'Alpha Sales Team'` with `managerId = manager.id`; then for each of `[salesrep, salesrep2]`, call `prisma.teamMember.findFirst({ where: { userId, teamId } })`; if not found, call `prisma.teamMember.create({ data: { userId, teamId } })`; log `Seeded 1 team with N members`.

**Checkpoint**: User Story 2 independently testable. All 6 role accounts can log in.

---

## Phase 4: User Story 1 — Developer Cold-Start Seed (Priority: P1)

**Goal**: Customers distributed across all CustomerStatus values and multiple owners; 2 contacts per customer. Provides the base records that every CRM screen needs to render.

**Independent Test**: After seeding, `GET /api/v1/customers` as salesrep returns 4 customers; as manager returns customers owned by salesrep + salesrep2 (7 customers); as admin returns all 12. `GET /api/v1/customers/<acme-id>/contacts` returns 2 contacts.

- [x] T008 [US1] Implement customer seeding in `backend/prisma/seed.ts` — after team seeding, create 12 customers via `findFirst({ where: { companyName } })` skip-if-exists pattern; assign owners: salesrep gets Acme Corporation (ACTIVE/Technology/ONE_M_10M), Beta Logistics (ACTIVE/Logistics/TEN_M_50M), Gamma Healthcare (ACTIVE/Healthcare/FIFTY_M_250M), Delta Finance (ACTIVE/Finance/OVER_250M), Kappa Legal (ARCHIVED/Legal/ONE_M_10M); salesrep2 gets Epsilon Retail (PROSPECT/Retail/UNDER_1M), Zeta Manufacturing (PROSPECT/Manufacturing/ONE_M_10M), Eta Education (PROSPECT/Education/UNDER_1M), Lambda Consulting (ARCHIVED/Consulting/UNDER_1M), Mu Technology (ACTIVE/Technology/TEN_M_50M); support gets Theta Energy (INACTIVE/Energy/TEN_M_50M), Iota Media (INACTIVE/Media/ONE_M_10M); store all created/found customer objects in a map keyed by companyName for use by later phases; log `Seeded N customers`.
- [x] T009 [US1] Implement contact seeding in `backend/prisma/seed.ts` — after customer seeding, create 2 contacts per customer (22 total); use `findFirst({ where: { firstName, lastName, customerId } })` for skip-if-exists; for each customer, generate two contacts using the pattern `<AlphaLetter><CompanyPrefix>` e.g. for Acme: `{ firstName: 'Alice', lastName: 'Acme', email: 'alice@acme.com', designation: 'VP Sales' }` and `{ firstName: 'Bob', lastName: 'Acme', email: 'bob@acme.com', designation: 'CTO' }`; store contact objects in a map keyed by `<companyName>-<index>` for use by opportunities/activities; log `Seeded N contacts`.

**Checkpoint**: User Story 1 base data ready. Dashboard customer count shows 12.

---

## Phase 5: User Story 3 — Sales Pipeline Seed (Priority: P2)

**Goal**: 14 opportunities distributed across all 6 pipeline stages (2+ per stage, 2 terminal Won/Lost), with varied expected revenue and probability values.

**Independent Test**: `GET /api/v1/pipeline/board` returns opportunities in all 6 stages. `GET /api/v1/dashboard` shows non-zero `pipelineValue`.

- [x] T010 [US3] Implement opportunity seeding in `backend/prisma/seed.ts` — after contact seeding, look up stage IDs via `prisma.pipelineStage.findFirst({ where: { name } })` for all 6 stages; create 14 opportunities via `findFirst({ where: { name, customerId } })` skip-if-exists; distribute as follows — Lead (×3): `'Acme ERP Upgrade'` customerId=acme ownerId=salesrep stageId=Lead expectedRevenue=45000 probability=15; `'Beta Warehouse System'` customerId=beta ownerId=salesrep stageId=Lead expectedRevenue=120000 probability=20; `'Beta Fleet Mgmt'` customerId=beta ownerId=salesrep stageId=Lead expectedRevenue=90000 probability=25; Qualified (×2): `'Gamma EMR Platform'` customerId=gamma ownerId=salesrep stageId=Qualified expectedRevenue=280000 probability=40; `'Delta Risk Analytics'` customerId=delta ownerId=salesrep stageId=Qualified expectedRevenue=350000 probability=45; `'Gamma Lab System'` customerId=gamma ownerId=salesrep stageId=Qualified expectedRevenue=140000 probability=50; Proposal (×2): `'Epsilon POS System'` customerId=epsilon ownerId=salesrep2 stageId=Proposal expectedRevenue=18000 probability=60; `'Zeta Automation Suite'` customerId=zeta ownerId=salesrep2 stageId=Proposal expectedRevenue=95000 probability=65; Negotiation (×2): `'Eta LMS Platform'` customerId=eta ownerId=salesrep2 stageId=Negotiation expectedRevenue=22000 probability=75; `'Theta SCADA Upgrade'` customerId=theta ownerId=support stageId=Negotiation expectedRevenue=180000 probability=80; Won (×2): `'Acme Cloud Migration'` customerId=acme ownerId=salesrep stageId=Won expectedRevenue=78000 probability=100 actualCloseDate=new Date('2026-03-01'); `'Mu Data Platform'` customerId=mu ownerId=salesrep2 stageId=Won expectedRevenue=210000 probability=100 actualCloseDate=new Date('2026-04-15'); Lost (×2): `'Iota CMS Renewal'` customerId=iota ownerId=support stageId=Lost expectedRevenue=15000 probability=0 actualCloseDate=new Date('2026-02-01'); `'Kappa Legal Suite'` customerId=kappa ownerId=salesrep stageId=Lost expectedRevenue=55000 probability=0 actualCloseDate=new Date('2026-01-20'); store opportunity objects in a map; log `Seeded N opportunities`.

**Checkpoint**: Pipeline board shows all 6 stages populated. Revenue forecast non-zero.

---

## Phase 6: User Story 4 — Entity Relationship Coverage (Priority: P2)

**Goal**: Activities of all 5 types linked to customers/contacts; 12 tasks including 2 overdue; customer detail pages show fully populated sections.

**Independent Test**: Open Acme Corporation detail page — contacts (2), activities (≥3), opportunities (≥2), tasks (≥2) sections all show records. `GET /api/v1/tasks?overdue=true` returns ≥ 2 tasks.

- [x] T011 [US4] Implement activity seeding in `backend/prisma/seed.ts` — after opportunity seeding, create 15 activities (3 per ActivityType) via `findFirst({ where: { subject, customerId, type } })` skip-if-exists; PHONE_CALL (×3): subject='Discovery call with Acme VP Sales' customerId=acme contactId=acme-contact-0 createdById=salesrep scheduledAt=new Date('2026-05-01') durationMinutes=30; subject='Qualification call — Beta Logistics' customerId=beta contactId=beta-contact-0 createdById=salesrep durationMinutes=45; subject='Intro call — Gamma Healthcare' customerId=gamma contactId=gamma-contact-0 createdById=salesrep durationMinutes=60; MEETING (×3): subject='Acme requirements workshop' customerId=acme createdById=salesrep scheduledAt=new Date('2026-05-10') durationMinutes=120; subject='Delta demo session' customerId=delta createdById=salesrep durationMinutes=90; subject='Epsilon product walkthrough' customerId=epsilon createdById=salesrep2 durationMinutes=60; EMAIL (×3): subject='Sent proposal to Gamma' customerId=gamma createdById=salesrep; subject='Followed up on Theta contract' customerId=theta createdById=support; subject='Sent intro email — Iota' customerId=iota createdById=support; NOTE (×3): subject='Acme: decision maker is CTO' customerId=acme createdById=salesrep; subject='Mu Technology: evaluating 3 vendors' customerId=mu createdById=salesrep2; subject='Beta prefers phased rollout' customerId=beta createdById=salesrep; FOLLOW_UP (×3): subject='Follow up on Gamma proposal next week' customerId=gamma createdById=salesrep; subject='Delta requested updated pricing' customerId=delta createdById=salesrep; subject='Epsilon asked for reference customers' customerId=epsilon createdById=salesrep2; log `Seeded N activities`.
- [x] T012 [US4] Implement task seeding in `backend/prisma/seed.ts` — after activity seeding, create 12 tasks via `findFirst({ where: { title, assigneeId } })` skip-if-exists; include 2 OVERDUE tasks with `dueDate: new Date('2025-01-15')` and `status: TaskStatus.OPEN`; full list — T1: type=FOLLOW_UP title='Follow up on Acme ERP proposal' status=OPEN dueDate=future(+7d) assigneeId=salesrep customerId=acme; T2: type=CALL title='Call Beta re: delivery timeline' status=OPEN dueDate=future(+14d) assigneeId=salesrep customerId=beta; T3: type=MEETING title='Schedule Gamma demo' status=OPEN dueDate=future(+10d) assigneeId=salesrep2 customerId=gamma; T4: type=EMAIL title='Send Delta contract draft' status=OPEN dueDate=future(+5d) assigneeId=salesrep2 customerId=delta; T5: type=INTERNAL_ACTION title='Update Epsilon quote' status=OPEN dueDate=future(+3d) assigneeId=salesrep2 customerId=epsilon; T6: type=FOLLOW_UP title='Follow up on Zeta requirements' status=OPEN dueDate=future(+7d) assigneeId=salesrep customerId=zeta; T7 (OVERDUE): type=CALL title='Overdue: Confirm Eta kick-off' status=OPEN dueDate=new Date('2025-01-15') assigneeId=salesrep customerId=eta; T8 (OVERDUE): type=EMAIL title='Overdue: Send Theta summary' status=OPEN dueDate=new Date('2025-01-15') assigneeId=support customerId=theta; T9: type=MEETING title='Quarterly review prep' status=COMPLETED dueDate=past(-30d) assigneeId=manager completedAt=new Date('2026-05-20'); T10: type=FOLLOW_UP title='Check Mu contract' status=OPEN dueDate=future(+21d) assigneeId=salesrep2 customerId=mu; T11: type=CALL title='Introduction call — Kappa' status=CANCELLED dueDate=past(-60d) assigneeId=salesrep customerId=kappa cancelledAt=new Date('2026-04-01'); T12: type=INTERNAL_ACTION title='Update CRM pipeline report' status=OPEN dueDate=future(+30d) assigneeId=manager; for "future" dates use `new Date(Date.now() + N * 24 * 60 * 60 * 1000)`; createdById=admin for all; log `Seeded N tasks`.

**Checkpoint**: Customer detail pages fully populated. Overdue task filter returns 2 results.

---

## Phase 7: User Story 5 — Notification & Audit Log Seed (Priority: P3)

**Goal**: 12+ audit log entries covering all required action types; 18 notifications (3 per user, all 3 notification types represented per user).

**Independent Test**: Log in as admin, `GET /api/v1/audit` returns ≥ 12 entries with action types LOGIN, RECORD_CREATED, RECORD_UPDATED, STATUS_CHANGED. `GET /api/v1/notifications` for any user returns ≥ 3 unread notifications.

- [x] T013 [US5] Implement audit log seeding in `backend/prisma/seed.ts` — after task seeding, seed 12 audit log entries; use `prisma.auditLog.count({ where: { action, resourceType, actorId } })` to check for existing entries; if count > 0 skip; entries to create (all with `createdAt` set to specific past dates for realism): 1. action=LOGIN actorId=admin.id resourceType='User' resourceId=admin.id ipAddress='127.0.0.1' createdAt=new Date('2026-06-01T09:00:00Z'); 2. action=LOGIN actorId=manager.id resourceType='User' resourceId=manager.id createdAt=new Date('2026-06-01T09:05:00Z'); 3. action=LOGIN actorId=salesrep.id resourceType='User' resourceId=salesrep.id createdAt=new Date('2026-06-01T09:10:00Z'); 4. action=RECORD_CREATED actorId=salesrep.id resourceType='Customer' resourceId=acme.id newValue={companyName:'Acme Corporation',status:'PROSPECT'} createdAt=new Date('2026-05-01T10:00:00Z'); 5. action=RECORD_CREATED actorId=salesrep2.id resourceType='Customer' resourceId=epsilon.id newValue={companyName:'Epsilon Retail',status:'PROSPECT'} createdAt=new Date('2026-05-02T10:00:00Z'); 6. action=RECORD_CREATED actorId=salesrep.id resourceType='Opportunity' resourceId=acmeErpOpp.id newValue={name:'Acme ERP Upgrade',stage:'Lead'} createdAt=new Date('2026-05-05T11:00:00Z'); 7. action=RECORD_UPDATED actorId=salesrep.id resourceType='Customer' resourceId=acme.id previousValue={status:'PROSPECT'} newValue={status:'ACTIVE'} createdAt=new Date('2026-05-10T14:00:00Z'); 8. action=STATUS_CHANGED actorId=admin.id resourceType='Customer' resourceId=kappa.id previousValue={status:'INACTIVE'} newValue={status:'ARCHIVED'} createdAt=new Date('2026-04-01T09:00:00Z'); 9. action=STATUS_CHANGED actorId=salesrep.id resourceType='Opportunity' resourceId=acmeCloudOpp.id previousValue={stage:'Negotiation'} newValue={stage:'Won'} createdAt=new Date('2026-03-01T16:00:00Z'); 10. action=RECORD_CREATED actorId=salesrep.id resourceType='Contact' resourceId=acmeContact0.id newValue={firstName:'Alice',lastName:'Acme'} createdAt=new Date('2026-05-01T10:30:00Z'); 11. action=RECORD_UPDATED actorId=salesrep2.id resourceType='Opportunity' resourceId=epsilonOpp.id previousValue={probability:50} newValue={probability:60} createdAt=new Date('2026-05-15T13:00:00Z'); 12. action=STATUS_CHANGED actorId=support.id resourceType='Opportunity' resourceId=iotaOpp.id previousValue={stage:'Negotiation'} newValue={stage:'Lost'} createdAt=new Date('2026-02-01T11:00:00Z'); log `Seeded N audit log entries`.
- [x] T014 [US5] Implement notification seeding in `backend/prisma/seed.ts` — after audit log seeding, create 3 notifications per user (18 total) covering all 3 NotificationType values; use `findFirst({ where: { userId, type, title } })` skip-if-exists; for each of the 6 users create: one TASK_ASSIGNED notification, one OPPORTUNITY_ASSIGNED notification, one DUE_DATE_REMINDER notification; all notifications should have `isRead: false`; sample titles per user — admin: TASK_ASSIGNED='Team task: Update CRM pipeline report', OPPORTUNITY_ASSIGNED='New opportunity: Beta Fleet Mgmt in Lead stage', DUE_DATE_REMINDER='Pipeline reminder: Eta LMS Platform in Negotiation'; manager: TASK_ASSIGNED='New task: Quarterly review prep', OPPORTUNITY_ASSIGNED='Team opportunity: Theta SCADA Upgrade', DUE_DATE_REMINDER='Task due soon: Update CRM pipeline report'; salesrep: TASK_ASSIGNED='New task: Follow up on Acme ERP proposal', OPPORTUNITY_ASSIGNED='Opportunity assigned: Acme ERP Upgrade', DUE_DATE_REMINDER='Task due soon: Call Beta re: delivery timeline'; salesrep2: TASK_ASSIGNED='New task: Schedule Gamma demo', OPPORTUNITY_ASSIGNED='Opportunity assigned: Epsilon POS System', DUE_DATE_REMINDER='Task due soon: Update Epsilon quote'; support: TASK_ASSIGNED='New task: Overdue: Send Theta summary', OPPORTUNITY_ASSIGNED='Opportunity assigned: Gamma EMR Platform', DUE_DATE_REMINDER='Overdue task: Send Theta summary'; readonly: TASK_ASSIGNED='Read-only feed: Follow up on Zeta requirements', OPPORTUNITY_ASSIGNED='Pipeline update: Zeta Automation Suite', DUE_DATE_REMINDER='Reminder: Check Mu contract'; set `resourceType='Task'` or `'Opportunity'` and `resourceId` pointing to the relevant seeded record; log `Seeded N notifications`.

**Checkpoint**: Admin audit log shows 12+ entries. Notification bell shows 3 unread per user.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T015 Add final summary log to `backend/prisma/seed.ts` — at the end of `main()`, after all entity groups are seeded, log `\nSeed completed successfully.\n` so the terminal output clearly signals completion; also verify all console.log calls use consistent format `Seeded N <entityPlural>`
- [x] T016 [P] Run quickstart.md validation — TypeScript compiles cleanly (verified); live DB run requires `npm run seed` against a running PostgreSQL instance per quickstart.md — execute `npm run seed` against a clean development database and verify each of the 7 success criteria (SC-001 through SC-007) from `specs/002-database-seed/quickstart.md`; run the seed a second time to verify SC-006 idempotency; document any failures

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T001 and T002 can start immediately and run in parallel
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user story phases
- **US2 (Phase 3)**: Depends on Phase 2 — seeds users + teams (required by all remaining phases)
- **US1 (Phase 4)**: Depends on Phase 3 (users must exist as owners) — seeds customers + contacts
- **US3 (Phase 5)**: Depends on Phase 4 (customers, contacts, users, stages all required)
- **US4 (Phase 6)**: Depends on Phase 5 (opportunities required for task-opportunity FK link)
- **US5 (Phase 7)**: Depends on Phase 6 (all records must exist before audit logs reference them)
- **Polish (Phase 8)**: Depends on all user story phases

### User Story Dependencies (FK chain)

```
Roles + PipelineStages (Phase 2 — Foundational)
    └── Users + Teams (Phase 3 — US2)
        └── Customers + Contacts (Phase 4 — US1)
            └── Opportunities (Phase 5 — US3)
                └── Activities + Tasks (Phase 6 — US4)
                    └── AuditLogs + Notifications (Phase 7 — US5)
```

### Within `seed.ts` (execution order)

All seeding functions execute sequentially inside `main()` — parallel execution is not applicable
within a single seed file. The [P] marker is only relevant for T001/T002 (different files).

---

## Parallel Opportunities

```bash
# Phase 1 — these two tasks operate on different files:
Task T001: backend/package.json  (prisma.seed config + seed script)
Task T002: backend/SEED_CREDENTIALS.md  (credential documentation)
```

All other tasks are sequential within `backend/prisma/seed.ts`.

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 only)

1. Complete Phase 1: Setup (T001, T002)
2. Complete Phase 2: Foundational (T003–T005) — roles + pipeline stages
3. Complete Phase 3: US2 (T006–T007) — users + teams
4. Complete Phase 4: US1 (T008–T009) — customers + contacts
5. **STOP and VALIDATE**: 6 role accounts can log in; customer list populated; RBAC scoping works
6. Minimum viable seed is ready for RBAC testing

### Full Delivery (All 5 User Stories)

1. MVP above → 
2. Phase 5: US3 (T010) → pipeline board populated
3. Phase 6: US4 (T011–T012) → detail pages complete + overdue tasks
4. Phase 7: US5 (T013–T014) → audit log + notifications populated
5. Phase 8: Polish (T015–T016) → final cleanup + SC validation

---

## Notes

- All tasks after Phase 1 target the single file `backend/prisma/seed.ts`
- The seed runs sequentially by design — FK constraints require strict entity ordering
- Skip-if-exists uses `findFirst` + conditional `create` (never `upsert`) per FR-010 clarification
- Overdue tasks use hardcoded `new Date('2025-01-15')` for deterministic test results (see research.md Decision 6)
- Bcrypt cost factor 10 (not 12) for seeding performance per research.md Decision 3
- `SEED_CREDENTIALS.md` must include a dev-only warning — never commit to production secrets management
