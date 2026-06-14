# Implementation Plan: Database Seed

**Branch**: `002-database-seed` | **Date**: 2026-06-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-database-seed/spec.md`

## Summary

Extend the existing minimal `backend/prisma/seed.ts` (currently seeds roles, 1 admin user, and 6
pipeline stages) into a comprehensive developer-onboarding tool that populates all 11 entity types
required to exercise every CRM screen. The seed uses TypeScript with the already-installed Prisma
Client and bcrypt packages, requires no new dependencies, and achieves idempotency via
`findFirst`-then-`create` skip patterns (skip-if-exists by unique key, preserving any local
developer modifications). A `SEED_CREDENTIALS.md` file documents all seeded credentials.

## Technical Context

**Language/Version**: TypeScript 5.x — Node.js 20 LTS (same as backend)

**Primary Dependencies**:
- `@prisma/client` 5.22.0 — already installed
- `bcrypt` 6.x — already installed
- `ts-node` 10.x — already installed (devDependency)
- No new packages required

**Storage**: PostgreSQL 16 (same DATABASE_URL as backend application)

**Testing**: Manual verification via SC-001–SC-007 scenarios in quickstart.md; idempotency
verified by running twice and comparing counts

**Target Platform**: Local development / CI environment only; production seeding is out of scope

**Project Type**: Internal developer tool — a single TypeScript script invoked via `npx prisma db seed`

**Performance Goals**: Complete in under 30 seconds on a local development machine (SC-001)

**Constraints**:
- Idempotency via skip-if-exists (findFirst + create pattern); no truncation, no upsert-overwrite
- Passwords MUST be bcrypt-hashed at cost factor 10 (faster than prod's 12 for seeding speed)
- No S3 interaction; Files section will show empty state after seeding
- Seeding order must respect all foreign-key constraints (see data-model.md for dependency chain)
- Prisma schema migrations must be applied before running the seed

**Scale/Scope**: ~100 total records across 11 entity types; single-file implementation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Evidence / Notes |
|-----------|--------|-----------------|
| I. Enterprise Grade Quality | ✅ PASS | Bcrypt hashing at cost 10, credentials documented, skip-if-exists prevents data corruption |
| II. API First Design | ✅ N/A | Internal CLI tool; no API surface exposed |
| III. Security By Default | ✅ PASS | Passwords bcrypt-hashed; credentials in dev-only `SEED_CREDENTIALS.md`; plaintext never stored |
| IV. RBAC | ✅ PASS | One user per role created; team scoping seeded so RBAC can be exercised immediately |
| V. Auditability | ✅ PASS | 10+ audit log entries seeded covering LOGIN, RECORD_CREATED, RECORD_UPDATED, STATUS_CHANGED |
| VI. Scalability | ✅ N/A | Seed is a one-time dev tool; scale requirements apply to the application, not the seed |
| VII. Testability | ✅ PASS | SC-006 idempotency test: run twice, compare counts; all SCs in quickstart.md are runnable |
| VIII. Consistency | ✅ PASS | Uses same TypeScript conventions, Prisma patterns, and enum values as the rest of the backend |
| IX. Observability | ✅ PASS | Console output per seeded entity group; exits with code 1 on error (visible in CI) |
| X. User Experience | ✅ N/A | Developer tool; no UI surface |

**No violations.** Single-file internal tool is the minimal justified structure.

## Project Structure

### Documentation (this feature)

```text
specs/002-database-seed/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output — seed data inventory per entity
├── quickstart.md        # Phase 1 output — validation guide
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   └── seed.ts          # Extend existing file — all seed logic
├── package.json         # Add prisma.seed config + npm run seed script
└── SEED_CREDENTIALS.md  # New — document all seeded email/password pairs
```

## Complexity Tracking

No constitution violations requiring justification.
