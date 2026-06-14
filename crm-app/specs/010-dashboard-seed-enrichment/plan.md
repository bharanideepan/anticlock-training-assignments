# Implementation Plan: Dashboard Seed Enrichment

**Branch**: `010-dashboard-seed-enrichment` | **Date**: 2026-06-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/010-dashboard-seed-enrichment/spec.md`

## Summary

Enrich `backend/prisma/seed.ts` with three categories of additional records so all dashboard charts and metric cards display meaningful data on any seed-run date:

1. **30 relative-date activities** (one per day, all 5 types) — populates the Activity Trend chart (queries `scheduledAt >= now - 30 days`)
2. **6 won opportunities** (one per calendar month for the last 6 months) — populates Revenue Trend won bars and the "Won This Month" card
3. **4 completed tasks this month** — populates Team Performance "Tasks Completed" column
4. **4 open opportunities with `expectedCloseDate`** spread across the 6-month window — populates Revenue Trend forecast bars

All additions are additive (existing records untouched) and idempotent (skip-if-exists by unique key).

## Technical Context

**Language/Version**: TypeScript 5.x (Prisma seed script)

**Primary Dependencies**: `@prisma/client`, `bcrypt` (already used in seed.ts)

**Storage**: PostgreSQL via Prisma ORM — schema unchanged, only new data records

**Testing**: Manual — run `pnpm seed` in backend, open dashboard as admin/manager, visually verify all charts

**Target Platform**: Node.js development environment (`backend/` workspace)

**Project Type**: Data seeding script (development tool, not production code path)

**Performance Goals**: Seed completes in under 30 seconds total (including existing records)

**Constraints**: Skip-if-exists idempotency for all new records; no Prisma schema migration required; no new dependencies

**Scale/Scope**: ~54 additional records: 30 activities + 10 won opportunities (6 new + 4 existing covers) + 4 completed tasks + 4 additional open opportunities with close dates

## Constitution Check

This feature modifies only the development seed script — not production code. Constitution principles apply as follows:

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Enterprise Grade Quality | ✅ Satisfied | Seed remains idempotent, exits cleanly |
| II. API First Design | N/A | No API changes |
| III. Security By Default | ✅ Satisfied | Passwords remain bcrypt-hashed; no secrets hardcoded |
| IV. RBAC | N/A | Seed is admin/dev tooling only |
| V. Auditability | N/A | Seed script creates data directly; not a production mutation |
| VI. Scalability | N/A | Seed is run-once dev tool |
| VII. Testability | ✅ Satisfied | Quickstart.md documents manual verification steps |
| VIII. Consistency | ✅ Satisfied | Follows identical patterns to existing seed phases |
| IX. Observability | N/A | Seed prints console.log progress already |
| X. User Experience | N/A | Dashboard UX improvement is the goal, not a UX change to seed |

**No constitution violations. No complexity tracking required.**

## Project Structure

### Documentation (this feature)

```text
specs/010-dashboard-seed-enrichment/
├── plan.md              ← this file
├── research.md          ← Phase 0 output (below)
├── data-model.md        ← Phase 1 output (below)
├── quickstart.md        ← Phase 1 output (below)
└── tasks.md             ← Phase 2 output (/speckit-tasks command)
```

### Source Code (single file change)

```text
backend/
└── prisma/
    └── seed.ts          ← sole modified file; all new records appended as new phases
```

No new files, no schema changes, no migrations.

## Complexity Tracking

No violations requiring justification.
