# Tasks: TypeScript & Lint Fixes

**Input**: Full `tsc --noEmit` + `npm run lint` output from `backend/`

**Goal**: `npm run build` exits 0. `npm run lint` exits 0.

**Organization**: Tasks grouped by error category. Each category can be worked on independently (different files). Tasks within a category are sequential because they share files.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Different files, can run in parallel
- **[Story]**: Error category group (C1–C7)

---

## Phase 1: Setup

- [ ] T001 Install missing `zod` package — run `npm install zod` in `backend/` (fixes TS2307 in `src/common/pipes/zod-validation.pipe.ts`)

---

## Phase 2: Foundational — Prisma Field Name Mismatches

**Purpose**: These wrong field names (`occurredAt`, `closedAt`, `notes` on Opportunity) cascade into many files. Fix the Prisma query calls first so later fixes don't conflict.

**Root cause**: The Prisma schema uses `scheduledAt` (not `occurredAt`) on Activity, `actualCloseDate` (not `closedAt`) on Opportunity, `closeNote` (not `notes`) on Opportunity, and relations must be included in `select` to be accessible on result objects.

- [ ] T002 Fix `occurredAt` → `scheduledAt` in `backend/src/modules/activities/activities.service.ts` line 91 — change the orderBy/where field from `occurredAt` to `scheduledAt`
- [ ] T003 [P] Fix `occurredAt` → `scheduledAt` in `backend/src/modules/contacts/contacts.service.ts` line 107 — same field rename in activity orderBy
- [ ] T004 [P] Fix `occurredAt`, `closedAt`, `customer`, `stage` in `backend/src/modules/dashboard/dashboard.service.ts` — (a) replace all `closedAt: null` in `OpportunityWhereInput` with `actualCloseDate: null`; (b) replace `occurredAt` with `scheduledAt` in ActivityWhereInput (line 137) and ActivitySelect (line 139); (c) at line 155 `activity.occurredAt` → `activity.scheduledAt`; (d) at line 211 `opp.customer` → add `customer: { select: { id: true, companyName: true } }` to the Prisma select or use `opp.customerId`
- [ ] T005 [P] Fix `closedAt` in `backend/src/modules/customers/customers.service.ts` — (a) line 104: `closedAt` → `actualCloseDate` in OpportunityWhereInput; (b) line 191–192: `closedAt` → `actualCloseDate`, `notes` → `closeNote` in updateMany data; (c) line 247: `occurredAt` → `scheduledAt` in activity orderBy
- [ ] T006 [P] Fix `closedAt` in `backend/src/modules/pipeline/pipeline.service.ts` line 83 — replace `closedAt: null` with `actualCloseDate: null` in OpportunityWhereInput
- [ ] T007 [P] Fix `closedAt`, `stage`, `closedAt` select in `backend/src/modules/reports/reports.service.ts` — (a) line 161: remove `closedAt` from OpportunitySelect (field doesn't exist); use `actualCloseDate` instead; (b) line 166–167: `opp.stage` → ensure `stage` is included in select or use `opp.stageId`; (c) line 168: `opp.closedAt` → `opp.actualCloseDate`
- [ ] T008 [P] Fix unused `visibility` variable in `backend/src/modules/reports/reports.service.ts` line 257 — remove the unused variable declaration (TS6133)

**Checkpoint**: No `TS2353`, `TS2551`, `TS2339` errors remain.

---

## Phase 3: User Story 1 — Fix `paginate()` Call Signature (Category C1)

**Goal**: All `paginate(data, total, filter)` calls updated to `paginate(data, total, filter.page, filter.pageSize)`.

**Root cause**: `paginate<T>(data, total, page, pageSize)` requires 4 args. Services pass the full filter DTO as arg 3.

**Independent Test**: `npx tsc --noEmit 2>&1 | grep "TS2554" | wc -l` returns 0.

- [ ] T009 [P] [US1] Fix `paginate` calls in `backend/src/modules/customers/customers.service.ts` — lines 82, 236, 253, 270, 287: change `paginate(data, total, filter)` → `paginate(data, total, filter.page, filter.pageSize)` (or equivalent opts object with `.page`/`.pageSize` fields)
- [ ] T010 [P] [US1] Fix `paginate` calls in `backend/src/modules/contacts/contacts.service.ts` lines 57 and 113 — same fix: add `.page` and `.pageSize` as args 3 and 4
- [ ] T011 [P] [US1] Fix `paginate` call in `backend/src/modules/activities/activities.service.ts` line 58 — add `.page` and `.pageSize` as args 3 and 4
- [ ] T012 [P] [US1] Fix `paginate` call in `backend/src/modules/tasks/tasks.service.ts` line 99 — add `.page` and `.pageSize` as args 3 and 4; also fix line 129: `Date | undefined` assigned to `string | Date` — add `!` non-null assertion or provide a fallback date
- [ ] T013 [P] [US1] Fix `paginate` call in `backend/src/modules/teams/teams.service.ts` line 53 — add `.page` and `.pageSize` as args 3 and 4
- [ ] T014 [P] [US1] Fix `paginate` call in `backend/src/modules/audit/audit.service.ts` line 46 — add `.page` and `.pageSize` as args 3 and 4; also fix line 40: `actor` → `actorId` in AuditLogSelect

**Checkpoint**: `npx tsc --noEmit 2>&1 | grep "TS2554" | wc -l` returns 0.

---

## Phase 4: User Story 2 — Fix DTO Property Initializers (Category C2)

**Goal**: All DTO class properties have `!` definite assignment assertion to satisfy `strictPropertyInitialization`.

**Root cause**: NestJS DTOs use `@IsString()` decorators but `strict: true` requires either `= default` value or `!` suffix. class-validator fields should use `!`.

**Independent Test**: `npx tsc --noEmit 2>&1 | grep "TS2564" | wc -l` returns 0.

- [ ] T015 [P] [US2] Fix DTO properties in `backend/src/modules/activities/dto/create-activity.dto.ts` — add `!` to `type`, `subject`, `customerId` properties (lines 6, 9, 25)
- [ ] T016 [P] [US2] Fix DTO properties in `backend/src/modules/auth/dto/change-password.dto.ts` — add `!` to `currentPassword`, `newPassword`
- [ ] T017 [P] [US2] Fix DTO properties in `backend/src/modules/auth/dto/login.dto.ts` — add `!` to `email`, `password`
- [ ] T018 [P] [US2] Fix DTO properties in `backend/src/modules/auth/dto/password-reset-request.dto.ts` — add `!` to `email`
- [ ] T019 [P] [US2] Fix DTO properties in `backend/src/modules/auth/dto/password-reset.dto.ts` — add `!` to `email`, `token`, `newPassword`
- [ ] T020 [P] [US2] Fix DTO properties in `backend/src/modules/contacts/dto/create-contact.dto.ts` — add `!` to `firstName`, `lastName`, `customerId`
- [ ] T021 [P] [US2] Fix DTO properties in `backend/src/modules/customers/dto/create-customer.dto.ts` — add `!` to `companyName`
- [ ] T022 [P] [US2] Fix DTO properties in `backend/src/modules/customers/dto/customer-status.dto.ts` — add `!` to `status`
- [ ] T023 [P] [US2] Fix DTO properties in `backend/src/modules/files/dto/confirm-upload.dto.ts` — add `!` to `fileId`
- [ ] T024 [P] [US2] Fix DTO properties in `backend/src/modules/files/dto/file-filter.dto.ts` — add `!` to `resourceType`, `resourceId`
- [ ] T025 [P] [US2] Fix DTO properties in `backend/src/modules/files/dto/upload-url-request.dto.ts` — add `!` to `originalName`, `mimeType`, `sizeBytes`, `resourceType`, `resourceId`
- [ ] T026 [P] [US2] Fix DTO properties in `backend/src/modules/pipeline/dto/create-stage.dto.ts` — add `!` to `name`
- [ ] T027 [P] [US2] Fix DTO properties in `backend/src/modules/pipeline/dto/reorder-stages.dto.ts` — add `!` to `stageIds`
- [ ] T028 [P] [US2] Fix DTO properties in `backend/src/modules/reports/dto/report-filter.dto.ts` — add `!` to `fromDate`, `toDate`
- [ ] T029 [P] [US2] Fix DTO properties in `backend/src/modules/tasks/dto/create-task.dto.ts` — add `!` to `type`, `title`
- [ ] T030 [P] [US2] Fix DTO properties in `backend/src/modules/teams/dto/add-members.dto.ts` — add `!` to `userIds`
- [ ] T031 [P] [US2] Fix DTO properties in `backend/src/modules/teams/dto/create-team.dto.ts` — add `!` to `name`
- [ ] T032 [P] [US2] Fix DTO properties in `backend/src/modules/users/dto/assign-role.dto.ts` — add `!` to `roleId`
- [ ] T033 [P] [US2] Fix DTO properties in `backend/src/modules/users/dto/assign-teams.dto.ts` — add `!` to `teamIds`
- [ ] T034 [P] [US2] Fix DTO properties in `backend/src/modules/users/dto/create-user.dto.ts` — add `!` to `email`, `firstName`, `lastName`, `roleId`

**Checkpoint**: `npx tsc --noEmit 2>&1 | grep "TS2564" | wc -l` returns 0.

---

## Phase 5: User Story 3 — Fix `import type` in Controllers (Category C3)

**Goal**: All TS1272 errors resolved. Controllers with `isolatedModules + emitDecoratorMetadata` must use `import type` for types referenced only in decorated method signatures (not at runtime).

**Root cause**: NestJS controllers import DTO types that appear in `@Body()`, `@Param()`, `@Query()` decorators. With `isolatedModules: true`, these must be `import type` to avoid decorator metadata issues.

**Independent Test**: `npx tsc --noEmit 2>&1 | grep "TS1272" | wc -l` returns 0.

- [ ] T035 [P] [US3] Fix `import type` in `backend/src/modules/activities/activities.controller.ts` — convert DTO imports referenced only in method params/return types to `import type { ... }` while keeping value imports (decorators, guards, enums) as regular imports
- [ ] T036 [P] [US3] Fix `import type` in `backend/src/modules/auth/auth.controller.ts` — same pattern: split value imports from type-only imports
- [ ] T037 [P] [US3] Fix `import type` in `backend/src/modules/contacts/contacts.controller.ts` — split imports
- [ ] T038 [P] [US3] Fix `import type` in `backend/src/modules/customers/customers.controller.ts` — split imports; also remove unused `HttpCode` and `HttpStatus` imports (TS6133)
- [ ] T039 [P] [US3] Fix `import type` in `backend/src/modules/dashboard/dashboard.controller.ts` — split imports
- [ ] T040 [P] [US3] Fix `import type` in `backend/src/modules/pipeline/pipeline.controller.ts` — split imports
- [ ] T041 [P] [US3] Fix `import type` in `backend/src/modules/reports/reports.controller.ts` — split imports
- [ ] T042 [P] [US3] Fix `import type` in `backend/src/modules/search/search.controller.ts` — split imports
- [ ] T043 [P] [US3] Fix `import type` in `backend/src/modules/tasks/tasks.controller.ts` — split imports

**Checkpoint**: `npx tsc --noEmit 2>&1 | grep "TS1272" | wc -l` returns 0.

---

## Phase 6: User Story 4 — Fix `RoleName` in `@Roles()` and other type errors (Category C4)

**Goal**: Resolve TS2345 errors where `RoleName` enum value is passed to `@Roles()` but type mismatch occurs, plus remaining misc type errors.

**Note**: `roles.decorator.ts` already accepts `RoleName[]`. The TS2345 errors on controllers are likely caused by the TS1272 (import type) issue cascading — fix US3 first, then re-check these.

- [ ] T044 [US4] After completing Phase 5, run `npx tsc --noEmit 2>&1 | grep "TS2345"` — if errors remain in `activities.controller.ts`, `files.controller.ts`, `tasks.controller.ts`, they are likely resolved by the import type fixes; if not, check that `RoleName` is imported as a value (not type) in those files
- [ ] T045 [P] [US4] Fix logger config type error in `backend/src/config/logger.config.ts` line 4 — cast `customProps` callback's `req` parameter to `any` or use type assertion: `(req: any) => ({...})` to avoid the `IncomingMessage` type incompatibility with pino-http's generic type
- [ ] T046 [P] [US4] Fix `zod-validation.pipe.ts` — after T001 installs zod, fix line 11: type the error parameter as `ZodError` explicitly: `(e: ZodError)` instead of plain `e`
- [ ] T047 [P] [US4] Remove unused `NotFoundException` import in `backend/src/modules/auth/services/sso-config.service.ts` line 1
- [ ] T048 [P] [US4] Remove unused `prisma` property in `backend/src/modules/auth/strategies/saml.strategy.ts` line 8 — if unused, remove the `@InjectPrisma()` or constructor injection
- [ ] T049 [P] [US4] Remove unused `Delete` import in `backend/src/modules/users/users.controller.ts` line 6
- [ ] T050 [P] [US4] Remove unused `ForbiddenException` import in `backend/src/modules/users/users.service.ts` line 5
- [ ] T051 [P] [US4] Fix unused variable `overdueEtaTaskId` in `backend/prisma/seed.ts` line 350 — either use it (pass it to a notification's resourceId) or prefix with `_` to suppress: rename to `_overdueEtaTaskId`

---

## Phase 7: User Story 5 — Fix Contract Test `supertest` Import (Category C5)

**Goal**: All `test/contracts/*.ts` files compile and `supertest(app)` calls work.

**Root cause**: `import * as request from 'supertest'` with NodeNext module resolution doesn't expose the callable default export. All contract tests need `import request from 'supertest'` (default import).

**Independent Test**: `npx tsc --noEmit 2>&1 | grep "TS2349" | wc -l` returns 0.

- [ ] T052 [US5] Fix supertest import in `backend/test/contracts/auth.contract.test.ts` — change `import * as request from 'supertest'` to `import request from 'supertest'`; also remove unused `prisma` variable (TS6133)
- [ ] T053 [P] [US5] Fix supertest import in `backend/test/contracts/activities.contract.test.ts` — change to default import; remove unused `entityPath` variable; type `res` param as `Response` from supertest or `unknown`
- [ ] T054 [P] [US5] Fix supertest import in `backend/test/contracts/audit.contract.test.ts` — change to default import
- [ ] T055 [P] [US5] Fix supertest import in `backend/test/contracts/contacts.contract.test.ts` — change to default import; remove unused `entityPath`; type `res`
- [ ] T056 [P] [US5] Fix supertest import in `backend/test/contracts/customers.contract.test.ts` — change to default import; remove unused `entityPath`; type `res`
- [ ] T057 [P] [US5] Fix supertest import in `backend/test/contracts/dashboard.contract.test.ts` — change to default import; remove unused `entityPath`; type `res`
- [ ] T058 [P] [US5] Fix supertest import in `backend/test/contracts/files.contract.test.ts` — change to default import; remove unused `entityPath`; type `res`
- [ ] T059 [P] [US5] Fix supertest import in `backend/test/contracts/import-export.contract.test.ts` — change to default import; remove unused `entityPath`; type `res`
- [ ] T060 [P] [US5] Fix supertest import in `backend/test/contracts/notifications.contract.test.ts` — change to default import; remove unused `entityPath`; type `res`
- [ ] T061 [P] [US5] Fix supertest import in `backend/test/contracts/opportunities.contract.test.ts` — change to default import; remove unused `entityPath`; type `res`
- [ ] T062 [P] [US5] Fix supertest import in `backend/test/contracts/reports.contract.test.ts` — change to default import; remove unused `entityPath`; type `res`
- [ ] T063 [P] [US5] Fix supertest import in `backend/test/contracts/search.contract.test.ts` — change to default import; remove unused `entityPath`; type `res`
- [ ] T064 [P] [US5] Fix supertest import in `backend/test/contracts/tasks.contract.test.ts` — change to default import; remove unused `entityPath`; type `res`
- [ ] T065 [P] [US5] Fix supertest import in `backend/test/contracts/users.contract.test.ts` — change to default import; remove unused `entityPath`; type `res`

**Checkpoint**: `npx tsc --noEmit 2>&1 | grep "TS2349" | wc -l` returns 0.

---

## Phase 8: User Story 6 — Fix Unit Test Spec Files (Category C6)

**Goal**: Unit test spec files (`*.spec.ts`) compile cleanly.

- [ ] T066 [US6] Fix `backend/src/common/guards/visibility.guard.spec.ts` — remove unused `prisma` variable (line 18, TS6133)
- [ ] T067 [P] [US6] Fix `backend/src/modules/auth/auth.service.spec.ts` — remove unused `refreshTokenService` variable (line 24, TS6133)
- [ ] T068 [P] [US6] Fix `backend/src/modules/customers/customers.service.spec.ts` — (a) remove unused `NotFoundException` import and `result` variable (TS6133); (b) lines 47, 54: fix `paginate` mock calls to match 4-arg signature `paginate(data, total, page, pageSize)` (TS2554)
- [ ] T069 [P] [US6] Fix `backend/src/modules/tasks/tasks.service.spec.ts` — (a) remove unused `ForbiddenException` import and `result` variable (TS6133); (b) lines 67, 74: fix `paginate` mock calls — add missing page/pageSize arg (TS2554); (c) lines 84, 94: fix overloaded mock calls that pass too many args (TS2554)

**Checkpoint**: `npx tsc --noEmit 2>&1 | grep "\.spec\.ts" | wc -l` returns 0.

---

## Phase 9: Polish & Lint

- [ ] T070 Run `npm run lint -- --fix` in `backend/` to auto-fix all auto-fixable ESLint errors (formatting, import ordering, trailing commas)
- [ ] T071 Run `npm run lint` in `backend/` to confirm remaining lint errors; manually address any non-auto-fixable `@typescript-eslint/no-unsafe-*` errors in `backend/src/prisma/prisma.service.ts` and middleware files — add `// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment` comments only where the any-typed value is intentional (Prisma middleware params)
- [ ] T072 Run `npm run build` to confirm the full build succeeds with exit code 0
- [ ] T073 Run `npx tsc --noEmit` to confirm zero TypeScript errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (T001)**: No dependencies — install zod first
- **Phase 2 (T002–T008)**: Depends on Phase 1 — fix Prisma field names before testing build
- **Phase 3 (T009–T014)**: Independent of Phase 2 — can run in parallel with it (different service files)
- **Phase 4 (T015–T034)**: Fully independent — all DTO files, no dependencies
- **Phase 5 (T035–T043)**: Independent — all controller files
- **Phase 6 (T044–T051)**: Depends on Phase 5 completion (T044 re-checks after import type fixes)
- **Phase 7 (T052–T065)**: Independent — all test contract files
- **Phase 8 (T066–T069)**: Independent — all spec files
- **Phase 9 (T070–T073)**: Depends on all previous phases

### Parallel Opportunities

Phases 2, 3, 4, 5, 7, 8 can all be worked in parallel (different file groups):
```
[Phase 1: install zod] →
  [Phase 2: Prisma fields] ‖ [Phase 3: paginate] ‖ [Phase 4: DTOs] ‖ [Phase 5: controllers] ‖ [Phase 7: contract tests] ‖ [Phase 8: unit specs]
→ [Phase 6: RoleName + misc]
→ [Phase 9: lint + build verify]
```

---

## Implementation Strategy

### MVP (compile passing)

1. T001 (zod install) → T002–T008 (Prisma fields) → T009–T014 (paginate) → T015–T034 (DTOs)
2. At this point `npm run build` may succeed — verify with T072
3. Then T035–T043 (controllers) → T052–T065 (contract tests) → T066–T069 (specs)

### Full Clean Build

All 73 tasks → `npm run build` exits 0 → `npm run lint` exits 0

---

## Notes

- All tasks with `[P]` operate on separate files and can run in parallel
- After T070 (`--fix`), re-check which lint errors remain manually
- The `@typescript-eslint/no-unsafe-*` lint errors in middleware/Prisma files are expected due to `any`-typed Prisma params — use targeted disable comments, not blanket `disable` at file level
- T044 is a verification task: run tsc and check if TS2345 errors resolved by Phase 5 automatically
