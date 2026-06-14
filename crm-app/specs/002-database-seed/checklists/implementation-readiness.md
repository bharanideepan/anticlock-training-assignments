# Implementation Readiness Checklist: Database Seed

**Purpose**: Validate that the spec is precise enough to implement without ambiguity — focusing on data definition quality and idempotency/error handling completeness
**Created**: 2026-06-13
**Feature**: [spec.md](../spec.md)
**Audience**: Peer PR reviewer
**Depth**: Standard

---

## Data Definition Completeness

- [ ] CHK001 — Are unique key fields defined per entity for the skip-if-exists idempotency check in FR-010? The spec states "skip-if-exists by unique key" but never identifies which field(s) constitute the unique key for Customer, Contact, Activity, Opportunity, Task, AuditLog, and Notification. [**Gap**, Spec §FR-010]

- [ ] CHK002 — Is the minimum contacts-per-customer distribution specified? FR-003 requires "20 contacts distributed across seeded customers" without defining whether each customer must have at least 1 contact or whether all 20 can be clustered on a subset. [Clarity, Spec §FR-003]

- [ ] CHK003 — Is the activity-association model defined precisely? FR-005 says activities are "associated with customers and contacts" but does not specify whether every activity requires both a customer and a contact link, or whether contact linkage is optional per record. [Clarity, Spec §FR-005]

- [ ] CHK004 — Is the team composition requirement fully defined? FR-007 requires "at least 1 team" to test Sales Manager visibility scoping, but does not specify which user roles must be members, how many members the team needs, or whether Sales Representatives must be in the same team as the Sales Manager. [Completeness, Spec §FR-007]

- [ ] CHK005 — Is the opportunities-per-stage distribution specified? FR-004 requires "at least 2 opportunities per pipeline stage (minimum 12 total)" — are opportunities for Won and Lost stages (terminal) counted in the minimum, and are their close dates and closeNote fields required to be populated? [Clarity, Spec §FR-004]

- [ ] CHK006 — Is the task-assignee distribution requirement quantified? FR-006 says tasks "assigned to different users" without defining how many distinct users must be represented. Does "different" mean ≥2 distinct assignees, or all 5 seeded users? [Ambiguity, Spec §FR-006]

- [ ] CHK007 — Is the overdue task definition anchored in time? FR-006 requires "at least 2 overdue tasks (past due date, status OPEN)" but does not specify whether due dates should be fixed historical dates or computed relative to seed execution time. A relative approach means the seed will eventually stop producing "overdue" tasks if the database is preserved long-term. [Clarity, Spec §FR-006]

- [ ] CHK008 — Is the notification type coverage requirement consistent with the full notification type enum? FR-009 requires coverage of 3 types (TASK_ASSIGNED, OPPORTUNITY_ASSIGNED, DUE_DATE_REMINDER), but the spec defines 5 `NotificationType` values including OVERDUE_TASK and CUSTOMER_UPDATED. Is the exclusion of those 2 types intentional and documented? [Consistency, Spec §FR-009]

- [ ] CHK009 — Is the audit log population method specified? FR-008 requires "pre-fabricated entries" but does not state whether the seed directly inserts into the audit log table (bypassing the audit service) or triggers real application operations that generate entries. The two approaches have different security and data-integrity implications. [Completeness, Spec §FR-008]

- [ ] CHK010 — Is the pipeline stage unique key defined for the seed-if-missing check in FR-014? The spec and plan reference upsert behavior but do not define whether `name`, `displayOrder`, or both constitute the identity key. [**Gap**, Spec §FR-014]

- [ ] CHK011 — Are opportunity-to-contact links required per record? US4 describes "opportunities linked to customers and contacts" but FR-004 only mandates a customer link. Are contact links mandatory for all 12+ opportunities, a subset, or optional? [Consistency, Spec §US4 vs §FR-004]

---

## Idempotency Specification

- [ ] CHK012 — Is the unique key for TeamMember join-table records defined for idempotency? FR-010's skip-if-exists guarantee extends to all entities; team membership (userId + teamId) does not have a clearly documented natural key in the spec. [**Gap**, Spec §FR-010]

- [ ] CHK013 — Is idempotency for AuditLog entries specified? Audit log records typically lack a natural unique key. The spec does not define how "skip-if-exists" applies to FR-008's fabricated audit entries, meaning repeated seeding may always create duplicate log rows. [**Gap**, Spec §FR-008, §FR-010]

- [ ] CHK014 — Is idempotency for Notification records specified? Similar to audit logs, notifications have no obvious natural unique key. FR-009 combined with FR-010 creates an undefined constraint — the spec should clarify whether notifications are idempotent or always re-created. [**Gap**, Spec §FR-009, §FR-010]

- [ ] CHK015 — Is the definition of "same final database state" in SC-006 measurable? The success criterion states "running the seed command twice produces the same final database state" without defining how this is validated — same row counts per table, same data values, or zero net changes on the second run. [Measurability, Spec §SC-006]

- [ ] CHK016 — Are requirements defined for running the seed against a partially-seeded database (some entities present, others absent)? The spec addresses "previously seeded" and "empty database" as distinct scenarios but does not specify behavior for the in-between state. [Coverage, Spec §FR-010, Edge Cases §]

---

## Error & Failure Handling

- [ ] CHK017 — Is the required behavior when Prisma migrations are missing defined? The spec lists "seed run on a database with missing migrations" as an edge case but provides no requirement for how the seed must respond — fail with a specific exit code, print a human-readable diagnostic, or silently error out. [**Gap**, Spec §Edge Cases]

- [ ] CHK018 — Is partial-failure recovery behavior specified? If the seed fails midway (e.g., after seeding Users but before Opportunities), the spec does not define whether the database should be left in the partial state, rolled back to the pre-seed state, or whether re-running should cleanly recover. [**Gap**, Spec §Edge Cases]

- [ ] CHK019 — Is the required behavior when a foreign-key dependency is missing (e.g., pipeline stage not yet seeded) defined? The spec raises this as an edge case but offers no requirement for the error message, exit code, or recovery path. [**Gap**, Spec §Edge Cases]

- [ ] CHK020 — Are exit code requirements documented? Plan.md references "exits with code 1 on error" as an implementation detail, but the spec (FR-011, FR-012) does not require specific exit codes. Should non-zero exit on failure be a functional requirement? [Completeness, Spec §FR-011]

- [ ] CHK021 — Are console output / diagnostic requirements defined? The plan describes "console output per seeded entity group" but the spec contains no requirement for the format, verbosity level, or minimum content of seed run output — making SC-001–SC-007 manual verification harder to standardize. [Completeness, Spec §FR-011]

---

## Success Criteria Quality

- [ ] CHK022 — Is SC-001 (30-second time limit) a hard requirement or a soft target? The spec states the seed "MUST complete in under 30 seconds" but provides no requirement for what happens if it exceeds this — whether it should terminate, emit a warning, or simply be noted. [Clarity, Spec §SC-001]

- [ ] CHK023 — Is SC-007 (global search) sufficiently specific? The criterion states "global search returns results for common search terms (company names, contact names, opportunity titles)" without specifying which exact terms are guaranteed to return results or how many results constitute a passing outcome. [Measurability, Spec §SC-007]

- [ ] CHK024 — Is SC-003 (pipeline board stages) measurable against FR-004? SC-003 requires "at least 4 distinct stages" visible on the pipeline board, while FR-004 requires 2 opportunities across all 6 stages. These are not in conflict, but the lower SC-003 bar could mask a scenario where Won/Lost stages are empty — is this intentional? [Consistency, Spec §SC-003 vs §FR-004]

- [ ] CHK025 — Are SC-002 through SC-007 linked to specific seeded entities? The success criteria validate outcomes but do not reference the specific seeded records (e.g., which customer name to search for in SC-007, which admin email to test in SC-002). Is this linkage expected to be defined in SEED_CREDENTIALS.md or quickstart.md? [Completeness, Spec §SC-002–SC-007]

---

## Security Requirements

- [ ] CHK026 — Is the bcrypt cost factor a requirement or an implementation detail? FR-013 requires bcrypt hashing but does not specify the cost factor. Plan.md uses cost 10 for speed, but this is undocumented at the spec level. If the app's production cost factor changes, is the seed expected to match? [Completeness, Spec §FR-013]

- [ ] CHK027 — Are the required contents and format of SEED_CREDENTIALS.md defined? FR-015 requires credentials to be documented but does not specify whether the file should include a warning about dev-only use, the expected markdown format, which credential fields are mandatory (email, password, role), or where the file must be located (repo root vs. backend directory). [Clarity, Spec §FR-015]

- [ ] CHK028 — Is there a requirement preventing SEED_CREDENTIALS.md from being committed to version control in a production-bound repository? The spec documents credentials as dev-only but places no requirement on `.gitignore` treatment or access controls for the credentials file. [Gap, Spec §FR-015, Assumptions §]

---

## Scenario Coverage

- [ ] CHK029 — Are requirements defined for the "no roles in database" scenario? FR-001 assumes roles exist (seeded via migration), and the spec notes "Role: Pre-existing in DB via migration." But no requirement covers what the seed should do if roles are absent — fail gracefully or create them. [Coverage, Spec §Key Entities, Assumptions §]

- [ ] CHK030 — Is the CI/CD execution context considered in the requirements? The plan mentions "Local development / CI environment only" but FR-011 only requires a script command. Are there requirements for non-interactive execution (no prompts), environment variable dependencies, or CI-specific behavior? [Coverage, Spec §FR-011]

- [ ] CHK031 — Are requirements defined for seeding against a read-only or permission-restricted database user? The spec assumes write access but does not document this as an assumption or define behavior when the DATABASE_URL user lacks DDL/DML permissions. [Coverage, Gap, Assumptions §]

---

## Dependencies & Assumptions Validation

- [ ] CHK032 — Is the assumption "Prisma migrations must be applied before seeding" validated and documented as a pre-condition in a machine-checkable way? The plan references this but the spec lists it only as an assumption rather than a hard pre-condition with a verification step. [Assumption, Spec §Assumptions]

- [ ] CHK033 — Is the assumption "targets development/test database only" enforced or documented in the seed itself? The spec states production seeding is out of scope, but no requirement prevents the seed from running against a production DATABASE_URL. Should a safeguard or environment check be a requirement? [Assumption, Spec §Assumptions]

- [ ] CHK034 — Are the existing seed contents (roles, 1 admin user, 6 pipeline stages) documented as a dependency? Plan.md states the existing seed already creates these, but the spec does not reference the existing seed state. If a developer runs the new seed against a database where no prior seed has been run, are all required pre-conditions met? [Dependency, Gap]

## Notes

- Items marked **[Gap]** represent requirements that are absent from the spec and most likely need to be added or explicitly acknowledged as out-of-scope before implementation begins.
- CHK001 and CHK010–CHK014 are the highest-priority gaps: they directly affect whether idempotency (FR-010) can be correctly implemented.
- CHK017–CHK019 address edge cases documented in the spec that currently have no corresponding requirements — the edge cases section reads as observations, not requirements.
- Existing checklist `requirements.md` confirms all spec quality gates passed; this checklist targets the next layer of implementation-readiness precision.
