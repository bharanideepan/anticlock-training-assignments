# Active Plan — Users & Teams Module (Issue #5)
<!-- approved: pending -->
<!-- gate-iterations: 3 -->
<!-- user-approved: pending -->
<!-- status: in-progress -->

## Users & Teams Module — Implementation Plan (Issue #5)

### Context
- Spec: `crm-app-metaswarm/product-specs/modules/02-users-teams.md`
- GitHub Issue: #5
- Branch: crm-metaswarm
- Prisma models already exist: User, Team, TeamMember, Role (no migrations needed)
- `AuditAction.ROLE_CHANGED` already in schema — used when admin changes a user's role
- `AuditAction.STATUS_CHANGED` already in schema — used for both deactivate AND reactivate
- `AuthService.revokeAllUserTokens(userId)` already implemented at `auth.service.ts:232` — exported from AuthModule; UsersModule imports AuthModule to call it
- `AuthService.requestPasswordReset(email)` at `auth.service.ts:165` — reused for both activation email (new user sets initial password via reset link — deliberate design: no separate activation flow needed) and admin-initiated reset
- Email service (nodemailer) is already wired inside AuthModule — no new email infrastructure needed in UsersModule or TeamsModule
- **Audit logging is MANUAL** — `prisma.service.ts` has zero middleware (only `$connect`/`$disconnect`). All audit entries are explicit `prisma.auditLog.create({...})` calls, exactly as in `auth.service.ts` (lines 43–224). UsersService MUST call `prisma.auditLog.create()` manually for `STATUS_CHANGED` and `ROLE_CHANGED`. TeamsService does NOT need to audit (no team-specific AuditAction values in the enum).
- JWT payload includes `teamIds` from auth WU-003 — available in `@CurrentUser()` for SALES_MANAGER visibility checks
- Integration test regex (`jest-e2e.json`): `.integration.spec.ts$` — files must match
- Advisory: `PATCH /api/v1/users/:id/teams` replaces the **entire** team list (not additive) — implement as `$transaction([deleteMany, createMany])`
- Advisory: Soft-deleting a team must remove all TeamMember records for that team but preserve user accounts
- Advisory: Teams frontend — spec defines NO standalone `/teams` pages (only user routes); team management is embedded in UserDetailPage (teams section with add/remove). WU-007 intentionally omits standalone team pages — this matches the spec exactly.
- Advisory: TeamsController role granularity — GET endpoints (`GET /teams`, `GET /teams/:id`) accept ALL authenticated users (JwtAuthGuard only, no @Roles); mutating endpoints are SYSTEM_ADMINISTRATOR only

---

## Work Units

### WU-001: DTOs + module skeletons (Users + Teams wired into AppModule)
**Status**: TODO

**Files**:
- `backend/src/users/users.module.ts` — imports PrismaModule, AuthModule; exports UsersService
- `backend/src/users/dto/create-user.dto.ts` — `email`, `firstName`, `lastName`, `phone?`, `jobTitle?`, `roleId`, `teamIds?`
- `backend/src/users/dto/update-user.dto.ts` — `firstName?`, `lastName?`, `phone?`, `jobTitle?`
- `backend/src/users/dto/update-role.dto.ts` — `roleId` (required UUID)
- `backend/src/users/dto/update-teams.dto.ts` — `teamIds` (UUID array, required, min 0)
- `backend/src/users/dto/query-users.dto.ts` — `page?`, `pageSize?`, `search?`, `roleId?`, `teamId?`, `status?`, `sortBy?`, `sortOrder?`
- `backend/src/teams/teams.module.ts` — imports PrismaModule; exports TeamsService
- `backend/src/teams/dto/create-team.dto.ts` — `name`, `description?`, `managerId?`
- `backend/src/teams/dto/update-team.dto.ts` — all optional subset of create
- `backend/src/teams/dto/query-teams.dto.ts` — `page?`, `pageSize?`, `search?`, `sortBy?`, `sortOrder?`
- `backend/src/teams/dto/add-members.dto.ts` — `userIds` (UUID array, min 1)
- `backend/src/app.module.ts` — register UsersModule, TeamsModule

**DoD**: `pnpm --filter backend build` succeeds; UsersModule and TeamsModule registered in AppModule; all DTOs compile with class-validator decorators

---

### WU-002: UsersService + unit tests
**Status**: TODO

**Files**:
- `backend/src/users/users.service.ts`
- `backend/src/users/users.service.spec.ts`

**Service methods**:
- `findAll(query, actorRole, actorTeamIds)` — paginated; filters: `search` (firstName/lastName/email ILIKE), `roleId` (exact match on user.roleId), `teamId` (join TeamMember), `status` (ACTIVE/INACTIVE), `sortBy` (firstName/lastName/email/createdAt), `sortOrder` (asc/desc, default asc); if SALES_MANAGER: additionally filter to users whose teamMemberships overlap actorTeamIds (server-side visibility enforced); Prisma `include: { role: true, teamMemberships: { include: { team: true } } }` on every query — response must contain `teams` array per user per spec
- `findOne(id, actorRole, actorTeamIds)` — throw `USER_NOT_FOUND` (404) if not found; **if SALES_MANAGER: check if target user's teamMemberships overlap with actorTeamIds; throw `FORBIDDEN` (403) if no overlap** — enforces "own team only" server-side visibility
- `create(dto)` — create User with roleId+teamIds; call `authService.requestPasswordReset(email)` to send activation link (user sets initial password via this link — deliberate reuse of reset flow); throw `EMAIL_ALREADY_EXISTS` (409) if duplicate; throw `ROLE_NOT_FOUND` (400) if roleId invalid
- `update(id, dto)` — update profile fields; throw `USER_NOT_FOUND` (404) if not found
- `deactivate(id, actorId)` — throw `USER_NOT_FOUND` (404) if user not found; throw `CANNOT_DEACTIVATE_SELF` (409) if id === actorId; set `status=INACTIVE`; call `authService.revokeAllUserTokens(id)`; call `prisma.auditLog.create({ action: STATUS_CHANGED, resourceType: 'User', resourceId: id })`
- `reactivate(id)` — throw `USER_NOT_FOUND` (404) if not found; set `status=ACTIVE`; call `prisma.auditLog.create({ action: STATUS_CHANGED, resourceType: 'User', resourceId: id })`
- `adminResetPassword(id)` — look up user email; call `authService.requestPasswordReset(email)`; throw `USER_NOT_FOUND` (404)
- `updateRole(id, roleId)` — throw `USER_NOT_FOUND` (404) if user not found; throw `ROLE_NOT_FOUND` (400) if roleId invalid; update `roleId`; call `authService.revokeAllUserTokens(id)`; call `prisma.auditLog.create({ action: ROLE_CHANGED, resourceType: 'User', resourceId: id })`
- `updateTeams(id, teamIds)` — **`prisma.$transaction([deleteMany, createMany])`** existing TeamMember for userId then insert new rows; return updated user with teams

**DoD**: All 9 methods unit-tested (Prisma mocked, AuthService mocked); `EMAIL_ALREADY_EXISTS`, `ROLE_NOT_FOUND`, `USER_NOT_FOUND`, `CANNOT_DEACTIVATE_SELF`, `FORBIDDEN` tested; **findAll filters tested: roleId filter, teamId filter, status filter, sortBy/sortOrder, SALES_MANAGER visibility (actorTeamIds filter)**; **SALES_MANAGER findOne visibility tested (own-team member → 200, other-team member → 403)**; token revocation on deactivate + role change verified; **STATUS_CHANGED audit for both deactivate and reactivate verified**; unit tests pass

**TDD**: Write spec first, watch fail, then implement

---

### WU-003: TeamsService + unit tests
**Status**: TODO

**Files**:
- `backend/src/teams/teams.service.ts`
- `backend/src/teams/teams.service.spec.ts`

**Service methods**:
- `findAll(query)` — paginated; params: `page`, `pageSize` (pagination), `search` (name ILIKE), `sortBy` (name/createdAt), `sortOrder` (asc/desc); response includes manager (id, firstName, lastName) and memberCount via `_count`; returns `{ data: [...], meta: { total, page, pageSize, totalPages } }`
- `findOne(id)` — include full member list (user: id, firstName, lastName, email, role); throw `TEAM_NOT_FOUND` (404) if not found (or soft-deleted)
- `create(dto)` — throw `TEAM_NAME_DUPLICATE` (409) if name exists; throw `MANAGER_NOT_FOUND` (400) if managerId invalid
- `update(id, dto)` — partial update; same duplicate/not-found checks
- `delete(id)` — soft-delete (`deletedAt = now()`); delete all `TeamMember` rows for teamId; throw `TEAM_NOT_FOUND` (404)
- `addMembers(teamId, userIds)` — upsert TeamMember (ignore duplicates via `skipDuplicates: true`); return updated member list
- `removeMember(teamId, userId)` — delete TeamMember; throw `MEMBER_NOT_FOUND` (404) if not in team

**DoD**: All 7 methods unit-tested (Prisma mocked); `TEAM_NOT_FOUND`, `TEAM_NAME_DUPLICATE`, `MANAGER_NOT_FOUND`, `MEMBER_NOT_FOUND` tested; soft-delete with TeamMember cleanup tested; **audit behavior for team create/update/delete: team operations flow through Prisma middleware (global audit middleware in prisma.service.ts) — no manual audit calls needed in TeamsService; unit tests verify that Prisma create/update/delete calls are made (middleware fires automatically)**; unit tests pass

**TDD**: Write spec first, watch fail, then implement

---

### WU-004: UsersController + unit tests
**Status**: TODO

**Files**:
- `backend/src/users/users.controller.ts`
- `backend/src/users/users.controller.spec.ts`

**Endpoints** (9):
1. `GET /api/v1/users` — JwtAuthGuard + `@Roles(SYSTEM_ADMINISTRATOR, SALES_MANAGER)`; paginated response envelope
2. `POST /api/v1/users` — JwtAuthGuard + `@Roles(SYSTEM_ADMINISTRATOR)`; 201
3. `GET /api/v1/users/:id` — JwtAuthGuard + `@Roles(SYSTEM_ADMINISTRATOR, SALES_MANAGER)`; 200
4. `PATCH /api/v1/users/:id` — JwtAuthGuard + `@Roles(SYSTEM_ADMINISTRATOR)`; 200
5. `POST /api/v1/users/:id/deactivate` — JwtAuthGuard + `@Roles(SYSTEM_ADMINISTRATOR)`; 204
6. `POST /api/v1/users/:id/reactivate` — JwtAuthGuard + `@Roles(SYSTEM_ADMINISTRATOR)`; 204
7. `POST /api/v1/users/:id/reset-password` — JwtAuthGuard + `@Roles(SYSTEM_ADMINISTRATOR)`; 202
8. `PATCH /api/v1/users/:id/role` — JwtAuthGuard + `@Roles(SYSTEM_ADMINISTRATOR)`; 200
9. `PATCH /api/v1/users/:id/teams` — JwtAuthGuard + `@Roles(SYSTEM_ADMINISTRATOR)`; 200

**DoD**: Controller spec covers all 9 endpoints with mocked UsersService; named errors asserted (`USER_NOT_FOUND`, `EMAIL_ALREADY_EXISTS`, `ROLE_NOT_FOUND`, `CANNOT_DEACTIVATE_SELF`, `FORBIDDEN`); response envelopes verified; unit tests pass

**TDD**: Write controller spec first

**Human checkpoint**: Review all 9 user endpoint implementations before proceeding to Teams controller

---

### WU-005: TeamsController + unit tests
**Status**: TODO

**Files**:
- `backend/src/teams/teams.controller.ts`
- `backend/src/teams/teams.controller.spec.ts`

**Endpoints** (7 — note role granularity: GET endpoints are all-authenticated, mutating endpoints are ADMIN-only):
1. `GET /api/v1/teams` — JwtAuthGuard ONLY (no `@Roles` — all authenticated users); paginated
2. `POST /api/v1/teams` — JwtAuthGuard + `@Roles(SYSTEM_ADMINISTRATOR)`; 201
3. `GET /api/v1/teams/:id` — JwtAuthGuard ONLY (no `@Roles` — all authenticated users); 200 with full member list
4. `PATCH /api/v1/teams/:id` — JwtAuthGuard + `@Roles(SYSTEM_ADMINISTRATOR)`; 200
5. `DELETE /api/v1/teams/:id` — JwtAuthGuard + `@Roles(SYSTEM_ADMINISTRATOR)`; 204
6. `POST /api/v1/teams/:id/members` — JwtAuthGuard + `@Roles(SYSTEM_ADMINISTRATOR)`; 200 (duplicate member = idempotent via `skipDuplicates: true`)
7. `DELETE /api/v1/teams/:id/members/:userId` — JwtAuthGuard + `@Roles(SYSTEM_ADMINISTRATOR)`; 204

**DoD**: Controller spec covers all 7 endpoints; **GET /teams and GET /teams/:id verified accessible to SALES_REPRESENTATIVE (no @Roles restriction)**; named errors asserted (`TEAM_NOT_FOUND`, `TEAM_NAME_DUPLICATE`, `MANAGER_NOT_FOUND`, `MEMBER_NOT_FOUND`); duplicate member add verified idempotent; unit tests pass

**TDD**: Write controller spec first

---

### WU-006: Integration tests + coverage gate
**Status**: TODO

**Files**:
- `backend/test/users.integration.spec.ts` (matches `.integration.spec.ts$`)
- `backend/test/teams.integration.spec.ts`

**User integration tests (real PostgreSQL)**:
- `GET /users`: admin → full paginated list (all users); **SALES_MANAGER → paginated list filtered to own-team members only (other-team users absent from response)**; missing JWT → 401; non-ADMIN-non-MANAGER → 403
- `GET /users` filters: `?roleId=<id>` → filtered list; `?teamId=<id>` → filtered list; `?status=INACTIVE` → inactive users only; `?sortBy=email&sortOrder=desc` → sorted correctly
- `POST /users`: valid → 201 + user returned; duplicate email → 409; invalid roleId → 400; non-admin → 403
- `GET /users/:id`: admin → 200; **SALES_MANAGER for own-team member → 200**; **SALES_MANAGER for other-team member → 403 FORBIDDEN**; unknown id → 404
- `PATCH /users/:id`: valid → 200; unknown id → 404; non-admin → 403
- `POST /users/:id/deactivate`: valid → 204 + tokens revoked; self → 409 CANNOT_DEACTIVATE_SELF; non-admin → 403
- `POST /users/:id/reactivate`: valid → 204; unknown id → 404; non-admin → 403
- `POST /users/:id/reset-password`: valid → 202; unknown id → 404
- `PATCH /users/:id/role`: valid → 200 + tokens revoked; invalid roleId → 400
- `PATCH /users/:id/teams`: valid → 200 with full updated team list (old teams absent, new teams present)

**Team integration tests (real PostgreSQL)**:
- `GET /teams`: authenticated → paginated; unauthenticated → 401
- `POST /teams`: valid → 201; duplicate name → 409; invalid managerId → 400; non-admin → 403
- `GET /teams/:id`: authenticated → team with member list; unknown → 404
- `PATCH /teams/:id`: valid → 200; non-admin → 403
- `DELETE /teams/:id`: valid → 204 + team memberships removed; users intact; non-admin → 403
- `POST /teams/:id/members`: valid → 200; non-admin → 403
- `DELETE /teams/:id/members/:userId`: valid → 204; not-member → 404

**DoD**: `pnpm --filter backend test:e2e` passes; `pnpm --filter backend test:cov` meets `.coverage-thresholds.json`

**Human checkpoint**: Review coverage report before frontend work

---

### WU-007: Frontend — UserListPage, UserFormPage (create+edit), UserDetailPage + routes + tests
**Status**: TODO

**Scope note**: The spec defines exactly 4 user routes and ZERO standalone team routes. Team management UI is embedded in UserDetailPage (teams section with add/remove). No standalone `/teams`, `/teams/new`, or `/teams/:id` pages are in scope — this is per-spec, not an omission.

**Files**:
- `frontend/src/shared/schemas/users.ts` — Zod schemas: createUser, updateUser, updateRole, updateTeams
- `frontend/src/api/users.ts` — TanStack Query hooks: `useUsers`, `useUser`, `useCreateUser`, `useUpdateUser`, `useDeactivateUser`, `useReactivateUser`, `useUpdateUserRole`, `useUpdateUserTeams`
- `frontend/src/api/teams.ts` — TanStack Query hooks: `useTeams` (for role/team selects); `useAddTeamMembers`, `useRemoveTeamMember` (for UserDetailPage teams section)
- `frontend/src/pages/users/UserListPage.tsx` — MUI table with Name/Email/Role/Teams/Status/CreatedAt columns; Role/Team/Status filter selects + Search input; Create User button (admin only, hidden for SALES_MANAGER); row click → `/users/:id`
- `frontend/src/pages/users/UserListPage.test.tsx` — tests: all 6 columns render; Role/Team/Status filter controls visible; Search input present; Create User button visible for admin; Create User button hidden for SALES_MANAGER; row click navigates to /users/:id
- `frontend/src/pages/users/UserFormPage.tsx` — React Hook Form + Zod; handles both **create** (`/users/new` — POST) and **edit** (`/users/:id/edit` — PATCH, pre-populated from `useUser`); roleId select; teamIds multi-select
- `frontend/src/pages/users/UserFormPage.test.tsx` — tests create and edit modes separately
- `frontend/src/pages/users/UserDetailPage.tsx` — profile section; role section with change button (admin only); **teams section: list current teams + add/remove buttons calling `useAddTeamMembers`/`useRemoveTeamMember` (admin only)**; Deactivate/Reactivate/Reset Password action buttons (admin only)
- `frontend/src/pages/users/UserDetailPage.test.tsx`
- `frontend/src/App.tsx` — add **all 4 spec routes behind AuthGuard + RoleGuard**:
  - `/users` → `UserListPage` behind `AuthGuard` + `RoleGuard([SYSTEM_ADMINISTRATOR, SALES_MANAGER])`
  - `/users/new` → `UserFormPage` behind `AuthGuard` + `RoleGuard([SYSTEM_ADMINISTRATOR])`
  - `/users/:id` → `UserDetailPage` behind `AuthGuard` + `RoleGuard([SYSTEM_ADMINISTRATOR, SALES_MANAGER])`
  - `/users/:id/edit` → `UserFormPage` (edit mode) behind `AuthGuard` + `RoleGuard([SYSTEM_ADMINISTRATOR])`

**DoD**: All 4 routes wired with correct AuthGuard + RoleGuard per spec access column; UserFormPage tested in create mode (empty form) and edit mode (pre-populated from useUser); **UserDetailPage test: admin user sees Deactivate/Reactivate/Reset Password/Change Role buttons; SALES_MANAGER user does NOT see those admin-only buttons (conditional rendering tested)**; UserDetailPage teams section calls add/remove member API; all Vitest tests pass; TypeScript strict — no `any`

**TDD**: Write page tests first

---

## Human Checkpoints
1. After WU-001 + WU-002 + WU-003: Review DTOs and service methods before controllers
2. After WU-004: Review all 9 user endpoint implementations
3. After WU-006: Review coverage report before frontend work

## Key Constraints
- TDD mandatory: tests first, watch fail, then implement — every WU
- No Prisma mocks in integration tests
- No TypeScript `any`
- UsersModule imports AuthModule — needed for `revokeAllUserTokens(userId)` and `requestPasswordReset(email)`; email infra (nodemailer) already lives in AuthModule, no new email wiring needed
- `PATCH /users/:id/teams` replaces the full team list via `prisma.$transaction([deleteMany, createMany])` (atomic)
- Soft-deleting a team: set `deletedAt`, then `deleteMany` TeamMember rows for that teamId
- SALES_MANAGER visibility enforced in service layer (findAll + findOne), not controller
- Audit logging is MANUAL via `prisma.auditLog.create()` — no middleware. UsersService calls it explicitly in deactivate (STATUS_CHANGED), reactivate (STATUS_CHANGED), and updateRole (ROLE_CHANGED). TeamsService does NOT audit (no team-specific AuditAction values).
- `POST /users` sends activation link via `authService.requestPasswordReset(email)` — deliberate reuse: user sets initial password via this link, no separate activation endpoint needed
- TeamsController GET endpoints (GET /teams, GET /teams/:id) have JwtAuthGuard ONLY — no @Roles, accessible to all authenticated roles; mutating endpoints require @Roles(SYSTEM_ADMINISTRATOR)
- `POST /teams/:id/members` is idempotent for existing members (`skipDuplicates: true`) — no error on duplicate
- Integration tests seed their own test data in `beforeEach`/`beforeAll` + cleanup in `afterEach`/`afterAll`
- Frontend: spec defines exactly 4 user routes + zero standalone team routes; team CRUD UI is embedded in UserDetailPage (teams section); this is per-spec
- UserFormPage handles both create (/users/new) and edit (/users/:id/edit) modes — pre-populate form from `useUser(id)` when in edit mode
- Frontend routes use RoleGuard per spec access column: `/users` and `/users/:id` → ADMIN + MANAGER; `/users/new` and `/users/:id/edit` → ADMIN only
- Audit logging for team operations: Prisma middleware (already in `prisma.service.ts`) fires automatically on create/update/delete — TeamsService does NOT manually call audit APIs; WU-003 tests verify Prisma calls, not audit rows directly
- GET /users supports all spec query params: `search`, `roleId`, `teamId`, `status`, `sortBy`, `sortOrder`, `page`, `pageSize` — all must be in query-users DTO and handled in findAll service method

## Execution Method
Metaswarm orchestrated execution — 4-phase loop per WU: IMPLEMENT → VALIDATE → ADVERSARIAL REVIEW → COMMIT
