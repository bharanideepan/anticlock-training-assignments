# Active Plan
<!-- approved: 2026-06-16 -->
<!-- gate-iterations: 3 -->
<!-- user-approved: true -->
<!-- status: completed -->

## Database schema — Prisma models, migration, seed data

GitHub Issue: https://github.com/bharanideepan/anticlock-training-assignments/issues/3

## Work Units

### WU-000: Install dependencies
- Add @prisma/client, bcrypt to deps; prisma, @types/bcrypt, ts-node to devDeps
- Add pnpm.onlyBuiltDependencies to root package.json
- Add "prisma.seed" key to backend/package.json
- DoD: pnpm install succeeds, prisma generate runs

### WU-001: PrismaService + PrismaModule
- TDD: prisma.service.spec.ts (3 specs — defined, connect, disconnect)
- Create: backend/src/prisma/prisma.service.ts, backend/src/prisma/prisma.module.ts
- Modify: backend/src/app.module.ts
- DoD: 3 unit tests pass, @prisma/client mocked with class stub

### WU-002: Full schema.prisma
- 17 models, 14 enums, tsvector Unsupported columns, all composite indexes
- DoD: prisma validate passes, 17 tables, AuditLog/Notification no deletedAt

### WU-003: Migration
- prisma migrate dev --create-only --name init → edit SQL → apply
- Custom SQL: probability CHECK, 3 GIN indexes, 3 tsvector triggers
- DoD: all 17 tables in DB, triggers fire on INSERT/UPDATE, CHECK active

### WU-004: Seed + integration test
- backend/prisma/seed.ts: 5 roles, 6 stages, 1 admin (bcrypt hashed)
- backend/test/jest-e2e.json + backend/test/seed.integration.spec.ts
- DoD: 3 integration tests pass, integration tests isolated from unit runner

## Full DoD
1. pnpm install succeeds
2. pnpm --filter backend test passes (7 unit tests)
3. pnpm --filter backend test:e2e passes (3 integration tests against real PostgreSQL)
4. prisma validate passes
5. All 17 tables exist in crm_dev
6. tsvector triggers, GIN indexes, probability CHECK active in DB
7. TypeScript strict — zero errors
