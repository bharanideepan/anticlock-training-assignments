# Research: Database Seed

**Date**: 2026-06-12 | **Feature**: [spec.md](spec.md)

## Decision 1: Idempotency Pattern

**Decision**: Skip-if-exists via `findFirst` + conditional `create` (not `upsert`, not truncate)

**Rationale**: `upsert` in Prisma requires a unique indexed field as the `where` clause — several
entities (e.g., `PipelineStage`, `Activity`, `Task`) lack a stable natural unique key suitable
for upsert. Using `findFirst` + `create` works uniformly across all entity types and explicitly
preserves any local developer modifications between seed runs, matching the clarified FR-010
requirement.

**Alternatives considered**:
- *Truncate + re-seed*: Fast and simple, but destroys developer modifications and risks FK
  cascade errors if the order is wrong. Ruled out per spec Assumptions.
- *Upsert*: Overwrites existing records, violating the "preserve local modifications" requirement
  from FR-010 clarification. Also impractical for entities without suitable unique indexes.
- *Skip-if-exists with row count check*: Run seed only if table is empty. Rejected because it
  prevents partial re-seeding after a developer manually deletes specific records.

---

## Decision 2: Script Execution Runner

**Decision**: `ts-node` with `--compiler-options {"module":"CommonJS"}` registered via
`package.json → prisma.seed`

**Rationale**: `ts-node` is already installed as a devDependency (`ts-node@^10.9.2`). Prisma's
`db seed` command reads the `prisma.seed` key from `package.json` and executes it directly.
The `--compiler-options {"module":"CommonJS"}` flag is required because Prisma Client uses
CommonJS imports internally.

**Alternatives considered**:
- *tsx*: Not installed; would require a new devDependency.
- *Compile to JS first*: Adds a build step and complicates the single-command seed invocation.
- *`npx ts-node` without prisma.seed*: Would not run automatically with `prisma db seed` and
  breaks CI integration.

---

## Decision 3: Bcrypt Cost Factor for Seed

**Decision**: Cost factor 10 (not 12 as used in production auth service)

**Rationale**: Seeding 5 users × bcrypt hash = 5 hashes. At cost 12, each hash takes ~300ms,
adding 1.5 s to seed time. Cost 10 takes ~75ms each (~375ms total), well within the 30-second
SC-001 budget and sufficient for dev/test passwords. Seeded passwords are intentionally dev-only
and documented; they are not securing production data.

**Alternatives considered**:
- *Cost 12 (production)*: Functionally identical but wastes ~1s with no security benefit for
  dev-only credentials.
- *Cost 8*: Too low; some CI environments flag this in security scans.

---

## Decision 4: Seeding Order (FK Dependency Chain)

**Decision**: Seed in this strict order to satisfy all foreign key constraints:

1. Roles (`RoleName` enum, migration-seeded but seed must reference)
2. Users (depend on Role.id)
3. Teams + TeamMembers (Team depends on User as manager; TeamMember depends on both)
4. PipelineStages (independent of users/customers)
5. Customers (depend on User as owner)
6. Contacts (depend on Customer)
7. Opportunities (depend on Customer, Contact, User, PipelineStage)
8. Activities (depend on Customer, Contact, User)
9. Tasks (depend on User as assignee/creator, Customer, Opportunity)
10. AuditLogs (reference actorId → User; no FK constraint in schema, but logically requires users)
11. Notifications (depend on User)

**Rationale**: This order matches the FK relationships in `schema.prisma`. Each entity is
created after all its dependencies are guaranteed to exist.

---

## Decision 5: Seed Data Design for RBAC Testing

**Decision**: Assign customers to different users to enable visibility-scoping tests

| User | Role | Assigned Customers |
|------|------|--------------------|
| admin@crm.local | SYSTEM_ADMINISTRATOR | Sees all (no filter) |
| manager@crm.local | SALES_MANAGER | Sees team members' customers |
| salesrep@crm.local | SALES_REPRESENTATIVE | Owns 4 customers |
| salesrep2@crm.local | SALES_REPRESENTATIVE | Owns 3 customers |
| support@crm.local | SUPPORT_REPRESENTATIVE | Owns 2 customers (read-heavy) |
| readonly@crm.local | READ_ONLY | No owned customers |

A single team ("Alpha Sales Team") links the Sales Manager + both Sales Reps, so the manager's
visibility scope query can be exercised.

**Rationale**: Without customers distributed across owners, visibility-scoping tests return the
same result for all roles, defeating User Story 2 (RBAC testing).

---

## Decision 6: Overdue Task Design

**Decision**: Create 2 tasks with `dueDate` set to a fixed past date (2025-01-15) and
`status = OPEN`

**Rationale**: FR-006 requires at least 2 overdue tasks. Using a hardcoded past date ensures
the tasks are overdue on any run date after 2025-01-15. Using `new Date()` relative offsets
would cause tasks to age out of the "overdue" state over time; a fixed historical date is stable.

**Alternatives considered**:
- *Dynamic offset (e.g., 30 days ago)*: Would use `new Date(Date.now() - ...)` which is
  always overdue but slightly less predictable in tests.
- *Fixed date*: Chosen for determinism; clearly in the past for any developer running the seed.
