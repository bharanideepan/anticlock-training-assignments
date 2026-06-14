---
description: "Task list for Enterprise CRM Platform"
---

# Tasks: Enterprise CRM Platform

**Input**: Design documents from `specs/001-enterprise-crm-platform/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | data-model.md ✅ | contracts/ ✅ | research.md ✅ | quickstart.md ✅

**Tests**: Not included (not requested in spec). Add TDD tasks manually if desired.

**Stack**: NestJS 10 + Prisma 5 + PostgreSQL 16 (backend) | React 19 + Vite + MUI v6 + TanStack Query v5 (frontend) | Docker + Kubernetes

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Parallelizable (different files, no blocking dependency)
- **[Story]**: User story this task belongs to (US1–US15)
- File paths are relative to repository root

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Create monorepo skeleton, tooling, and infrastructure configuration

- [x] T001 Initialize monorepo root with `pnpm-workspace.yaml` listing `backend` and `frontend` packages
- [x] T002 [P] Scaffold NestJS 10 backend in `backend/` with TypeScript strict mode (`backend/tsconfig.json`, `backend/package.json`)
- [x] T003 [P] Scaffold React 19 + Vite 5 + TypeScript frontend in `frontend/` (`frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`)
- [x] T004 [P] Configure shared ESLint + Prettier rules at repo root (`.eslintrc.js`, `.prettierrc`)
- [x] T005 [P] Create `docker-compose.dev.yml` with PostgreSQL 16, MinIO (S3-compatible), and MailHog services
- [x] T006 [P] Create `backend/prisma/schema.prisma` skeleton with datasource and generator blocks only
- [x] T007 [P] Create `k8s/` directory with `namespace.yaml`, `ingress.yaml`, and stub deployment manifests
- [x] T008 [P] Configure `backend/.env.example` with all required environment variable keys and descriptions
- [x] T009 [P] Configure `frontend/.env.example` with `VITE_API_BASE_URL` and `VITE_SSO_PROVIDER`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work may begin until this phase is complete.

### 2a — Database Schema & Migrations

- [x] T010 Define all 14 entities in `backend/prisma/schema.prisma`: User, Role, Team, TeamMember, Customer, Contact, Activity, PipelineStage, Opportunity, Task, Notification, File, AuditLog, RefreshToken, PasswordResetToken, SsoConfig, ImportJob (per data-model.md)
- [x] T011 Add all enum definitions to `backend/prisma/schema.prisma`: UserStatus, RoleName, CustomerStatus, RevenueRange, ActivityType, TerminalOutcome, TaskType, TaskStatus, NotificationType, ResourceType, AuditAction, SsoProvider, ImportType, ImportStatus
- [x] T012 Add all database indexes to `backend/prisma/schema.prisma` (per data-model.md index table)
- [x] T013 Create initial Prisma migration: `backend/prisma/migrations/001_initial_schema/`
- [x] T014 Create `backend/prisma/seed.ts` to seed: 5 roles (SYSTEM_ADMINISTRATOR, SALES_MANAGER, SALES_REPRESENTATIVE, SUPPORT_REPRESENTATIVE, READ_ONLY), default admin user, 6 default pipeline stages (Lead/Qualified/Proposal/Negotiation/Won/Lost)
- [x] T015 Add PostgreSQL GIN index migration for `searchVector` tsvector columns on Customer, Contact, Opportunity tables in `backend/prisma/migrations/002_search_vectors/`
- [x] T016 Add PostgreSQL trigger migration for auto-updating `searchVector` on Customer, Contact, Opportunity insert/update in `backend/prisma/migrations/003_search_triggers/`

### 2b — Backend Application Bootstrap

- [x] T017 [P] Create `backend/src/prisma/prisma.service.ts` and `backend/src/prisma/prisma.module.ts` (global PrismaService singleton)
- [x] T018 [P] Implement Prisma soft-delete middleware in `backend/src/prisma/middleware/soft-delete.middleware.ts` (intercept findMany/findFirst/findUnique to add `{ deletedAt: null }` filter; override delete to set `deletedAt`)
- [x] T019 [P] Implement Prisma audit middleware in `backend/src/prisma/middleware/audit.middleware.ts` (intercept create/update/delete on auditable models, write AuditLog via actor from AsyncLocalStorage)
- [x] T020 [P] Create `backend/src/config/config.module.ts` using `@nestjs/config` with Joi schema validation for all env vars (DATABASE_URL, JWT_SECRET, JWT_ACCESS_TTL, JWT_REFRESH_TTL, S3_*, MAIL_*)
- [x] T021 [P] Create `backend/src/common/pagination/page-options.dto.ts` with `page`, `pageSize` (max 100), `sortBy`, `sortOrder` fields
- [x] T022 [P] Create `backend/src/common/pagination/paginated-result.ts` generic `PaginatedResult<T>` interface with `data` and `meta` fields
- [x] T023 [P] Create `backend/src/common/filters/global-exception.filter.ts` formatting all errors as `{ error: { code, message } }`
- [x] T024 [P] Create `backend/src/common/interceptors/transform-response.interceptor.ts` wrapping success responses as `{ data: payload }`
- [x] T025 [P] Configure `backend/src/main.ts` with global ValidationPipe (class-validator, whitelist, transform), GlobalExceptionFilter, TransformResponseInterceptor, CORS, Swagger setup, Pino logger
- [x] T026 [P] Create `backend/src/common/pipes/zod-validation.pipe.ts` for query-parameter DTO validation with Zod
- [x] T027 [P] Create `backend/src/app.module.ts` importing PrismaModule, ConfigModule, and all domain modules

### 2c — RBAC & Security Infrastructure

- [x] T028 [P] Create `backend/src/common/guards/jwt-auth.guard.ts` (Passport JWT guard, skips `@Public()` routes)
- [x] T029 [P] Create `backend/src/common/guards/roles.guard.ts` (checks `@Roles()` decorator against JWT payload role)
- [x] T030 [P] Create `backend/src/common/guards/visibility.guard.ts` (attaches `visibilityFilter` to request based on user role and teamIds per FR-000)
- [x] T031 [P] Create `backend/src/common/decorators/roles.decorator.ts` (`@Roles(...RoleName[])`)
- [x] T032 [P] Create `backend/src/common/decorators/current-user.decorator.ts` (`@CurrentUser()` extracts user from request)
- [x] T033 [P] Create `backend/src/common/decorators/public.decorator.ts` (`@Public()` skips JwtAuthGuard)
- [x] T034 [P] Create `backend/src/common/context/async-local-storage.ts` for propagating actor ID through async request scope

### 2d — Observability Infrastructure

- [x] T035 [P] Configure Pino structured JSON logger in `backend/src/config/logger.config.ts` with traceId, userId, method, path, statusCode, durationMs fields
- [x] T036 [P] Create health check module in `backend/src/modules/health/health.module.ts` and `health.controller.ts` exposing `GET /health` (liveness) and `GET /health/ready` (readiness — DB connected)

### 2e — Frontend Bootstrap

- [x] T037 [P] Create `frontend/src/main.tsx` with MUI ThemeProvider, TanStack QueryClientProvider, and React Router BrowserRouter
- [x] T038 [P] Create MUI theme in `frontend/src/theme/theme.ts` (palette, typography, breakpoints, component overrides)
- [x] T039 [P] Create shared TypeScript interfaces for all API response shapes in `frontend/src/shared/types/api.types.ts` (PaginatedResult, ApiError, User, Customer, Contact, Activity, Opportunity, Task, Notification, File, AuditLog)
- [x] T040 [P] Create Axios API client in `frontend/src/api/client.ts` with base URL, Bearer token injection, 401 refresh-token interceptor (calls `/auth/refresh` and retries original request)
- [x] T041 [P] Create `frontend/src/shared/hooks/useAuth.ts` storing access token in memory, exposing `user`, `login`, `logout`, `refreshToken`
- [x] T042 [P] Create `frontend/src/router/AuthGuard.tsx` redirecting unauthenticated users to `/login`
- [x] T043 [P] Create `frontend/src/router/RoleGuard.tsx` rendering 403 page for routes the user's role cannot access
- [x] T044 [P] Create `frontend/src/router/routes.tsx` with all lazy-loaded route definitions and guard wrappers
- [x] T045 [P] Create shared reusable components: `frontend/src/shared/components/DataTable.tsx` (MUI DataGrid with pagination), `PageHeader.tsx`, `ConfirmDialog.tsx`, `StatusChip.tsx`

**Checkpoint**: Foundation complete — all user story phases can now proceed in parallel.

---

## Phase 3: User Story 1 — Authenticate and Access the Platform (Priority: P1) 🎯 MVP

**Goal**: Users authenticate via SSO (SAML/OIDC); System Administrators via email/password fallback. Sessions managed with JWT access + refresh token.

**Independent Test**: Admin logs in with email/password, receives access token, accesses `/api/v1/auth/me`, logs out. Verify via `quickstart.md` Scenario 1.

### Backend — Auth Module

- [x] T046 [US1] Create `backend/src/modules/auth/auth.module.ts` importing PassportModule, JwtModule, and registering all auth strategies
- [x] T047 [US1] Implement `backend/src/modules/auth/strategies/jwt.strategy.ts` extracting Bearer token, validating signature, returning `{ sub, email, role, teamIds }`
- [x] T048 [P] [US1] Implement `backend/src/modules/auth/strategies/saml.strategy.ts` using passport-saml; validate assertion, extract email and attributes
- [x] T049 [P] [US1] Implement `backend/src/modules/auth/strategies/oidc.strategy.ts` using openid-client; handle authorization code flow callback
- [x] T050 [US1] Create `backend/src/modules/auth/services/refresh-token.service.ts` (create, rotate, revoke, find-by-hash using bcrypt)
- [x] T051 [P] [US1] Create `backend/src/modules/auth/services/password-reset-token.service.ts` (create, validate, consume token; send email via Nodemailer)
- [x] T052a [P] [US1] Create `backend/src/common/services/crypto.service.ts` implementing AES-256-GCM encrypt/decrypt using Node `crypto` module; expose `encrypt(plaintext: string): string` and `decrypt(ciphertext: string): string`; inject via `CommonModule`
- [x] T052 [P] [US1] Create `backend/src/modules/auth/services/sso-config.service.ts` (CRUD for SsoConfig); use `CryptoService` to encrypt `config` JSON before write and decrypt after read so IdP certificates are never stored in plaintext
- [x] T053 [US1] Implement `backend/src/modules/auth/auth.service.ts` with methods: `loginWithPassword`, `issueTokens`, `refreshTokens`, `logout`, `requestPasswordReset`, `resetPassword`, `changePassword`, `getMe`, `updateProfile`
- [x] T054 [US1] Implement `backend/src/modules/auth/auth.controller.ts` with all endpoints from `contracts/auth.md`: POST /login, POST /sso/initiate, GET /sso/callback, POST /refresh, POST /logout, POST /password/reset-request, POST /password/reset, POST /password/change, GET /me, PATCH /me, GET /sso/config, PUT /sso/config
- [x] T055 [P] [US1] Create request/response DTOs in `backend/src/modules/auth/dto/`: login.dto.ts, refresh.dto.ts, password-reset-request.dto.ts, password-reset.dto.ts, change-password.dto.ts, update-profile.dto.ts

### Frontend — Auth Module

- [x] T056 [US1] Create `frontend/src/api/auth.api.ts` with TanStack Query mutations: `useLogin`, `useLogout`, `useRefreshToken`, `useRequestPasswordReset`, `useResetPassword`, `useChangePassword`, `useUpdateProfile`; query: `useMe`
- [x] T057 [P] [US1] Create `frontend/src/modules/auth/LoginPage.tsx` with email/password form (React Hook Form + Zod) and SSO redirect button
- [x] T058 [P] [US1] Create `frontend/src/modules/auth/SsoCallbackPage.tsx` handling OIDC/SAML callback, storing access token, redirecting to dashboard
- [x] T059 [P] [US1] Create `frontend/src/modules/auth/PasswordResetPage.tsx` with request-reset and set-new-password flows
- [x] T060 [P] [US1] Create `frontend/src/modules/auth/ChangePasswordPage.tsx` (accessible from user profile menu, admin-only)

**Checkpoint**: User Story 1 complete — authentication fully functional and independently testable.

---

## Phase 4: User Story 2 — Manage Users and Roles (Priority: P1)

**Goal**: Administrators create, update, deactivate, reactivate users and assign roles and teams.

**Independent Test**: Admin creates a SALES_REPRESENTATIVE user, assigns to a team, deactivates, reactivates, and resets password. Verify via `quickstart.md` Scenario 2.

### Backend — Users & Teams Modules

- [x] T061 [US2] Create `backend/src/modules/users/users.module.ts`, `users.service.ts`, `users.controller.ts` with all endpoints from `contracts/users.md` (list, create, get, update, deactivate, reactivate, reset-password, assign-role, assign-teams, get-profile, update-profile)
- [x] T062 [P] [US2] Create `backend/src/modules/users/dto/`: create-user.dto.ts, update-user.dto.ts, assign-role.dto.ts, assign-teams.dto.ts
- [x] T063 [P] [US2] Create `backend/src/modules/teams/teams.module.ts`, `teams.service.ts`, `teams.controller.ts` with all endpoints from `contracts/users.md` Teams section (list, create, get, update, delete, add-members, remove-member)
- [x] T064 [P] [US2] Create `backend/src/modules/teams/dto/`: create-team.dto.ts, update-team.dto.ts, add-members.dto.ts

### Frontend — Users & Teams

- [x] T065 [US2] Create `frontend/src/api/users.api.ts` with queries `useUsers`, `useUser` and mutations `useCreateUser`, `useUpdateUser`, `useDeactivateUser`, `useReactivateUser`, `useResetUserPassword`, `useAssignRole`, `useAssignTeams`
- [x] T066 [P] [US2] Create `frontend/src/api/teams.api.ts` with queries `useTeams`, `useTeam` and mutations `useCreateTeam`, `useUpdateTeam`, `useDeleteTeam`, `useAddTeamMembers`, `useRemoveTeamMember`
- [x] T067 [P] [US2] Create `frontend/src/modules/users/UserListPage.tsx` (paginated DataTable, search/filter by role/status, add user button — admin only)
- [x] T068 [P] [US2] Create `frontend/src/modules/users/UserFormPage.tsx` (create/edit user — admin only, role selector, team multiselect)
- [x] T069 [P] [US2] Create `frontend/src/modules/users/UserDetailPage.tsx` (user info, role badge, team list, deactivate/reactivate/reset-password actions)
- [x] T070b [P] [US2] Create `frontend/src/modules/admin/AdminSettingsPage.tsx` (SYSTEM_ADMINISTRATOR only; tabs: General, SSO Configuration); implement `SsoConfigForm` tab with fields: provider (SAML/OIDC selector), entityId, idpUrl, x509Certificate (textarea); binds to `GET /api/v1/sso/config` + `PUT /api/v1/sso/config` from `contracts/auth.md`; accessible via `/settings` route guarded by `RoleGuard`

**Checkpoint**: User Story 2 complete — full user and team management independently testable.

---

## Phase 5: User Story 3 — Manage Customers (Priority: P1)

**Goal**: Sales users create, update, search, filter, and archive customer records with full status lifecycle.

**Independent Test**: Create Prospect customer, transition to Active, search by name, filter by industry, archive. Verify via `quickstart.md` Scenario 3.

### Backend — Customers Module

- [x] T070 [US3] Create `backend/src/modules/customers/customers.module.ts`, `customers.service.ts`, `customers.controller.ts` with all endpoints from `contracts/customers.md` (list, create, get, update, status transition, archive, unarchive, related-entity sub-routes)
- [x] T071 [P] [US3] Create `backend/src/modules/customers/dto/`: create-customer.dto.ts, update-customer.dto.ts, customer-status.dto.ts, customer-filter.dto.ts (Zod-based query params)
- [x] T072 [P] [US3] Implement visibility scope injection in `customers.service.ts` `findAll` method using `visibilityFilter` from request context (per FR-000)

### Frontend — Customers Module

- [x] T073 [US3] Create `frontend/src/api/customers.api.ts` with queries `useCustomers`, `useCustomer`, `useCustomerContacts`, `useCustomerActivities`, `useCustomerOpportunities`, `useCustomerTasks`, `useCustomerFiles` and mutations `useCreateCustomer`, `useUpdateCustomer`, `useCustomerStatus`, `useArchiveCustomer`, `useUnarchiveCustomer`
- [x] T074 [P] [US3] Create `frontend/src/modules/customers/CustomerListPage.tsx` (paginated DataTable with search, industry/status/owner filters, status chip, add customer button)
- [x] T075 [P] [US3] Create `frontend/src/modules/customers/CustomerFormPage.tsx` (create/edit form with React Hook Form + Zod, all fields from data-model.md)
- [x] T076 [P] [US3] Create `frontend/src/modules/customers/CustomerDetailPage.tsx` (company info, status chip with transition actions, tab panels: Contacts / Activities / Opportunities / Tasks / Files, counts in tabs)

**Checkpoint**: User Story 3 complete — full customer lifecycle independently testable.

---

## Phase 6: User Story 4 — Manage Contacts (Priority: P1)

**Goal**: Users create and update contacts linked to customers; view contact interaction history.

**Independent Test**: Create contact linked to a customer, update designation, search, view empty history. Verify via `quickstart.md` Scenario 4.

### Backend — Contacts Module

- [x] T077 [US4] Create `backend/src/modules/contacts/contacts.module.ts`, `contacts.service.ts`, `contacts.controller.ts` with all endpoints from `contracts/contacts.md` (list, create, get, update, soft-delete, get-activities)
- [x] T078 [P] [US4] Create `backend/src/modules/contacts/dto/`: create-contact.dto.ts, update-contact.dto.ts, contact-filter.dto.ts

### Frontend — Contacts Module

- [x] T079 [US4] Create `frontend/src/api/contacts.api.ts` with queries `useContacts`, `useContact`, `useContactActivities` and mutations `useCreateContact`, `useUpdateContact`, `useDeleteContact`
- [x] T080 [P] [US4] Create `frontend/src/modules/contacts/ContactListPage.tsx` (searchable, filterable by customer, pagination)
- [x] T081 [P] [US4] Create `frontend/src/modules/contacts/ContactFormPage.tsx` (create/edit with customer association selector)
- [x] T082 [P] [US4] Create `frontend/src/modules/contacts/ContactDetailPage.tsx` (contact info, activity history tab)

**Checkpoint**: User Story 4 complete — contact management independently testable.

---

## Phase 7: User Story 5 — Record Activities and Customer Interactions (Priority: P2)

**Goal**: Users log activities (calls, meetings, emails, notes, follow-ups) against customers/contacts; view timelines.

**Independent Test**: Log a phone call activity against a customer, edit it, view customer activity timeline. Verify via `quickstart.md` Scenario 5.

### Backend — Activities Module

- [x] T083 [US5] Create `backend/src/modules/activities/activities.module.ts`, `activities.service.ts`, `activities.controller.ts` with all endpoints from `contracts/activities.md` (list, create, get, update, soft-delete)
- [x] T084 [P] [US5] Create `backend/src/modules/activities/dto/`: create-activity.dto.ts, update-activity.dto.ts, activity-filter.dto.ts

### Frontend — Activities

- [x] T085 [US5] Create `frontend/src/api/activities.api.ts` with queries `useActivities`, `useActivity` and mutations `useCreateActivity`, `useUpdateActivity`, `useDeleteActivity`
- [x] T086 [P] [US5] Create `frontend/src/modules/activities/ActivityTimeline.tsx` (reverse-chronological list of activity cards with type icon, subject, date, duration, description; used in CustomerDetailPage and ContactDetailPage)
- [x] T087 [P] [US5] Create `frontend/src/modules/activities/ActivityFormDialog.tsx` (MUI Dialog with type selector, subject, description, scheduledAt, duration, optional contact selector; used from timeline and customer detail)

**Checkpoint**: User Story 5 complete — activity logging independently testable.

---

## Phase 8: User Story 6 — Manage Sales Opportunities (Priority: P2)

**Goal**: Sales users create, update, assign, and progress opportunities through pipeline stages; close as Won/Lost.

**Independent Test**: Create opportunity, assign to rep, move to Qualified, close as Won. Verify via `quickstart.md` Scenario 6.

### Backend — Opportunities Module

- [x] T088 [US6] Create `backend/src/modules/opportunities/opportunities.module.ts`, `opportunities.service.ts`, `opportunities.controller.ts` with all endpoints from `contracts/opportunities.md` (list, create, get, update, move-stage, close-won, close-lost)
- [x] T089 [P] [US6] Create `backend/src/modules/opportunities/dto/`: create-opportunity.dto.ts, update-opportunity.dto.ts, move-stage.dto.ts, close-opportunity.dto.ts, opportunity-filter.dto.ts
- [x] T090 [P] [US6] Implement customer-archive side-effect in `customers.service.ts`: when archiving a customer, soft-delete all open opportunities with `closeNote = "Customer archived"` and set `actualCloseDate`

### Frontend — Opportunities Module

- [x] T091 [US6] Create `frontend/src/api/opportunities.api.ts` with queries `useOpportunities`, `useOpportunity` and mutations `useCreateOpportunity`, `useUpdateOpportunity`, `useMoveOpportunityStage`, `useCloseWon`, `useCloseLost`
- [x] T092 [P] [US6] Create `frontend/src/modules/opportunities/OpportunityListPage.tsx` (paginated table with filters: owner/stage/date range, Won/Lost toggle)
- [x] T093 [P] [US6] Create `frontend/src/modules/opportunities/OpportunityFormPage.tsx` (create/edit form with customer selector, contact selector, stage selector, revenue/probability/close-date fields)
- [x] T094 [P] [US6] Create `frontend/src/modules/opportunities/OpportunityDetailPage.tsx` (opportunity info, stage badge, linked customer/contact, tasks and files tabs, close-won/close-lost action buttons)

**Checkpoint**: User Story 6 complete — opportunity lifecycle independently testable.

---

## Phase 9: User Story 7 — Visual Pipeline Management (Priority: P2)

**Goal**: Kanban pipeline board with drag-and-drop stage transitions; filter by owner; stage configuration (admin).

**Independent Test**: View pipeline board, drag opportunity to next stage, filter by owner. Verify via `quickstart.md` Scenario 6 (pipeline section).

### Backend — Pipeline Module

- [x] T095 [US7] Create `backend/src/modules/pipeline/pipeline.module.ts`, `pipeline.service.ts`, `pipeline.controller.ts` with all endpoints from `contracts/opportunities.md` Pipeline section (board view, list-stages, create-stage, update-stage, delete-stage, reorder-stages)
- [x] T096 [P] [US7] Create `backend/src/modules/pipeline/dto/`: create-stage.dto.ts, update-stage.dto.ts, reorder-stages.dto.ts, pipeline-filter.dto.ts

### Frontend — Pipeline Board

- [x] T097 [US7] Install `@dnd-kit/core` and `@dnd-kit/sortable` in `frontend/package.json`; create `frontend/src/api/pipeline.api.ts` with queries `usePipelineBoard`, `usePipelineStages` and mutations `useUpdateOpportunityStage`, `useCreateStage`, `useUpdateStage`, `useDeleteStage`, `useReorderStages`
- [x] T098 [P] [US7] Create `frontend/src/modules/pipeline/PipelineBoardPage.tsx` (DndContext wrapper, horizontal scroll container, pipeline filter bar — owner/search/date range)
- [x] T099 [P] [US7] Create `frontend/src/modules/pipeline/StageColumn.tsx` (SortableContext column, stage name header with count and total value, scrollable opportunity card list)
- [x] T100 [P] [US7] Create `frontend/src/modules/pipeline/OpportunityCard.tsx` (draggable MUI Card with opportunity name, expected revenue, close date, owner avatar; click navigates to opportunity detail)

**Checkpoint**: User Story 7 complete — pipeline board independently testable.

---

## Phase 10: User Story 8 — Task Management (Priority: P2)

**Goal**: Users create, assign, and complete/cancel tasks linked to customers or opportunities.

**Independent Test**: Create a task, assign to colleague, mark complete, verify notification. Verify via `quickstart.md` Scenario 7.

### Backend — Tasks Module

- [x] T101 [US8] Create `backend/src/modules/tasks/tasks.module.ts`, `tasks.service.ts`, `tasks.controller.ts` with all endpoints from `contracts/tasks.md` (list, create, get, update, complete, cancel); include `isOverdue` computed field on each task response: `dueDate < new Date() && status === 'OPEN'`
- [x] T102 [P] [US8] Create `backend/src/modules/tasks/dto/`: create-task.dto.ts, update-task.dto.ts, task-filter.dto.ts
- [x] T103 [P] [US8] Emit `TASK_ASSIGNED` notification in `tasks.service.ts` when `assigneeId` differs from authenticated user (inject NotificationsService)

### Frontend — Tasks Module

- [x] T104 [US8] Create `frontend/src/api/tasks.api.ts` with queries `useTasks`, `useTask` and mutations `useCreateTask`, `useUpdateTask`, `useCompleteTask`, `useCancelTask`
- [x] T105 [P] [US8] Create `frontend/src/modules/tasks/TaskListPage.tsx` (filterable by status/type/assignee/overdue; overdue tasks highlighted in red)
- [x] T106 [P] [US8] Create `frontend/src/modules/tasks/TaskFormDialog.tsx` (MUI Dialog with type selector, title, description, dueDate picker, assignee selector, optional customer/opportunity link)

**Checkpoint**: User Story 8 complete — task management independently testable.

---

## Phase 11: User Story 9 — Role-Based Dashboard (Priority: P2)

**Goal**: Each role sees a dashboard with KPI metrics and charts appropriate to their visibility scope.

**Independent Test**: Sales Manager sees aggregated team metrics; Sales Rep sees own metrics. Verify via `quickstart.md` Scenario 10.

### Backend — Dashboard Module

- [x] T107 [US9] Create `backend/src/modules/dashboard/dashboard.module.ts`, `dashboard.service.ts`, `dashboard.controller.ts` with all endpoints from `contracts/dashboard.md` (metrics, revenue-trend, pipeline-funnel, activity-trend, team-performance, opportunity-distribution)
- [x] T108 [P] [US9] Add 5-minute response caching to dashboard chart endpoints in `dashboard.service.ts` using NestJS `CacheModule` (in-memory for v1)

### Frontend — Dashboard Module

- [x] T109 [US9] Create `frontend/src/api/dashboard.api.ts` with queries `useDashboardMetrics`, `useRevenueTrend`, `usePipelineFunnel`, `useActivityTrend`, `useTeamPerformance`, `useOpportunityDistribution`
- [x] T110 [P] [US9] Create `frontend/src/modules/dashboard/DashboardPage.tsx` (responsive MUI Grid: metric cards row + chart grid; role-conditional rendering of team-performance chart)
- [x] T111 [P] [US9] Create `frontend/src/modules/dashboard/MetricCard.tsx` (MUI Card with title, value, subtitle/change indicator, loading skeleton)
- [x] T112 [P] [US9] Create `frontend/src/modules/dashboard/charts/RevenueTrendChart.tsx` (Recharts LineChart with wonRevenue and forecastRevenue series)
- [x] T113 [P] [US9] Create `frontend/src/modules/dashboard/charts/PipelineFunnelChart.tsx` (Recharts BarChart or custom funnel visualization by stage)
- [x] T114 [P] [US9] Create `frontend/src/modules/dashboard/charts/ActivityTrendChart.tsx` (Recharts StackedBarChart by activity type per day)
- [x] T115 [P] [US9] Create `frontend/src/modules/dashboard/charts/TeamPerformanceTable.tsx` (MUI Table with per-user won/open/revenue columns; visible to Manager/Admin only)

**Checkpoint**: User Story 9 complete — role-based dashboard independently testable.

---

## Phase 12: User Story 10 — Reporting (Priority: P3)

**Goal**: Managers and admins generate filterable sales/customer/productivity reports and export as CSV.

**Independent Test**: Generate Revenue Performance report for a date range, apply owner filter, export CSV. Verify via `quickstart.md` Scenario 10.

### Backend — Reports Module

- [x] T116 [US10] Create `backend/src/modules/reports/reports.module.ts`, `reports.service.ts`, `reports.controller.ts` with all 10 report endpoints and export endpoint from `contracts/reports.md`
- [x] T117 [P] [US10] Create `backend/src/modules/reports/dto/report-filter.dto.ts` (fromDate, toDate, ownerId, teamId common filter DTO)
- [x] T118 [P] [US10] Implement CSV streaming export in `reports.service.ts` using Node.js `stream.PassThrough` + `csv-stringify` library, piped to response

### Frontend — Reports Module

- [x] T119 [US10] Create `frontend/src/api/reports.api.ts` with queries for all 10 report types and `useReportExport` mutation triggering a file download
- [x] T120 [P] [US10] Create `frontend/src/modules/reports/ReportPage.tsx` (report type selector, shared date range + owner/team filters, report result area, Export button)
- [x] T121 [P] [US10] Create `frontend/src/modules/reports/ReportFilters.tsx` (date range pickers, owner autocomplete, team selector — uses React Hook Form)

**Checkpoint**: User Story 10 complete — all report types independently testable.

---

## Phase 13: User Story 11 — Notifications (Priority: P3)

**Goal**: Users receive in-app and email notifications for task/opportunity assignments, due dates, and overdue tasks.

**Independent Test**: Assign a task to a user; verify in-app notification appears within 10 seconds and email arrives in MailHog. Verify via `quickstart.md` Scenario 7 (notification section).

### Backend — Notifications Module

- [x] T122 [US11] Create `backend/src/modules/notifications/notifications.module.ts`, `notifications.service.ts`, `notifications.controller.ts` with all endpoints from `contracts/notifications.md` (list, SSE stream, mark-read, read-all)
- [x] T123 [P] [US11] Implement `notifications.service.ts` `createAndSend` method: persists Notification entity, emits SSE event to user's active stream, enqueues email via Nodemailer (using NestJS `@nestjs/event-emitter`)
- [x] T124 [P] [US11] Implement SSE endpoint `GET /api/v1/notifications/stream` in `notifications.controller.ts` using NestJS `@Sse()` decorator; manage per-user `Subject` streams
- [x] T125 [P] [US11] Create NestJS scheduled job `backend/src/modules/notifications/jobs/reminder.job.ts` using `@nestjs/schedule` `@Cron('0 8 * * *')`: query tasks due tomorrow, query overdue open tasks, emit `DUE_DATE_REMINDER` and `OVERDUE_TASK` notifications
- [x] T126 [P] [US11] Create email templates directory `backend/src/modules/notifications/templates/`: task-assigned.hbs, due-date-reminder.hbs, overdue-task.hbs, opportunity-assigned.hbs, customer-status-changed.hbs using Handlebars
- [x] T161 [P] [US11] Emit `OPPORTUNITY_ASSIGNED` notification in `backend/src/modules/opportunities/opportunities.service.ts` when `ownerId` is set or changed (inject `NotificationsService`; mirrors T103 pattern for TASK_ASSIGNED)
- [x] T162 [P] [US11] Emit `CUSTOMER_UPDATED` notification in `backend/src/modules/customers/customers.service.ts` when customer status transitions to `INACTIVE` or `ARCHIVED`; recipient is the customer's `ownerId` (inject `NotificationsService`)

### Frontend — Notifications Module

- [x] T127 [US11] Create `frontend/src/api/notifications.api.ts` with queries `useNotifications`, `useUnreadCount` and mutations `useMarkNotificationRead`, `useMarkAllRead`; create `useNotificationStream` hook subscribing to SSE endpoint
- [x] T128 [P] [US11] Create `frontend/src/modules/notifications/NotificationBell.tsx` (MUI IconButton with badge showing unread count, opens NotificationCenter popover; polls every 30 seconds as fallback)
- [x] T129 [P] [US11] Create `frontend/src/modules/notifications/NotificationCenter.tsx` (MUI Popover with notification list, mark-all-read button, individual mark-read on click, resource link navigation)

**Checkpoint**: User Story 11 complete — notification delivery independently testable.

---

## Phase 14: User Story 12 — File Management (Priority: P3)

**Goal**: Users upload files to S3 (via presigned URL) and associate them with customers, opportunities, or activities.

**Independent Test**: Upload a PDF to a customer, receive presigned download URL, verify file appears in customer file list. Verify via `quickstart.md` Scenario 8.

### Backend — Files Module

- [x] T130 [US12] Create `backend/src/modules/files/files.module.ts`, `files.service.ts`, `files.controller.ts` with all endpoints from `contracts/files.md` (upload-url, confirm, list, download-url, soft-delete)
- [x] T131 [P] [US12] Create `backend/src/config/s3.config.ts` configuring AWS SDK v3 S3Client from env vars (S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY)
- [x] T132 [P] [US12] Implement presigned upload (POST URL) and presigned download (GET URL) in `files.service.ts` using `@aws-sdk/s3-presigned-post` and `@aws-sdk/s3-request-presigner`
- [x] T133 [P] [US12] Create `backend/src/modules/files/dto/`: upload-url-request.dto.ts, confirm-upload.dto.ts, file-filter.dto.ts

### Frontend — Files Module

- [x] T134 [US12] Create `frontend/src/api/files.api.ts` with `useFiles`, `useRequestUploadUrl`, `useConfirmUpload`, `useFileDownloadUrl`, `useDeleteFile`
- [x] T135 [P] [US12] Create `frontend/src/modules/files/FileUploadZone.tsx` (MUI dropzone using react-dropzone: validates file type/size ≤ 25MB, calls presigned URL flow, shows upload progress)
- [x] T136 [P] [US12] Create `frontend/src/modules/files/FileList.tsx` (list of attached files with name, uploader, date, size; download and delete actions)

**Checkpoint**: User Story 12 complete — file upload/download independently testable.

---

## Phase 15: User Story 13 — Global Search (Priority: P3)

**Goal**: Users search across customers, contacts, opportunities, activities, and tasks from a single search bar.

**Independent Test**: Search for a known company name; verify results appear across multiple entity types. Verify via `quickstart.md` Scenario 9.

### Backend — Search Module

- [x] T137 [US13] Create `backend/src/modules/search/search.module.ts`, `search.service.ts`, `search.controller.ts` with endpoint from `contracts/search.md`
- [x] T138 [P] [US13] Implement `search.service.ts` executing parallel PostgreSQL `@@to_tsquery()` queries on Customer, Contact, Opportunity (using tsvector columns), plus ILIKE queries on Activity.subject and Task.title; apply visibility scope to each query

### Frontend — Search Module

- [x] T139 [US13] Create `frontend/src/api/search.api.ts` with `useGlobalSearch` query (debounced 300ms)
- [x] T140 [P] [US13] Create `frontend/src/modules/search/GlobalSearchBar.tsx` (MUI Autocomplete in AppBar with keyboard shortcut Ctrl+K / Cmd+K, debounced query, grouped results dropdown)
- [x] T141 [P] [US13] Create `frontend/src/modules/search/SearchResultsPage.tsx` (full results page with entity-type filter tabs, paginated results per type)

**Checkpoint**: User Story 13 complete — global search independently testable.

---

## Phase 16: User Story 14 — Data Import and Export (Priority: P3)

**Goal**: Admins/managers bulk-import customers and contacts via CSV; all users export data.

**Independent Test**: Upload a 10-row customer CSV, validate, confirm import, verify records in customer list. Verify via `quickstart.md` Scenario 11.

### Backend — Import/Export Module

- [x] T142 [US14] Create `backend/src/modules/import-export/import-export.module.ts`, `import.service.ts`, `export.service.ts`, `import-export.controller.ts` with all endpoints from `contracts/import-export.md`
- [x] T143 [P] [US14] Implement `import.service.ts`: parse CSV with `csv-parse`, validate each row against Zod schema (required fields, valid enums, customer name match), create ImportJob, process rows async, write error report CSV to S3
- [x] T144 [P] [US14] Implement `export.service.ts`: stream Prisma query results through `csv-stringify` to response; honor visibility scope; support customer and contact exports

### Frontend — Import/Export

- [x] T145 [US14] Create `frontend/src/api/import-export.api.ts` with `useImportCustomers`, `useImportContacts`, `useImportJobStatus`, `useExportCustomers`, `useExportContacts`
- [x] T146 [P] [US14] Create `frontend/src/modules/import-export/ImportPage.tsx` (file upload zone for CSV, template download link, job status polling, error report download when import has errors)

**Checkpoint**: User Story 14 complete — CSV import/export independently testable.

---

## Phase 17: User Story 15 — Audit Log Access (Priority: P3)

**Goal**: Administrators search and view the full audit trail with resource/actor/date filters.

**Independent Test**: Perform login + customer create + customer status change; query audit log as admin; verify all three events present. Verify via `quickstart.md` Scenario 12.

### Backend — Audit Module

- [x] T147 [US15] Create `backend/src/modules/audit/audit.module.ts`, `audit.service.ts`, `audit.controller.ts` with endpoint from `contracts/audit.md` (paginated query with filters: actorId, resourceType, resourceId, action, date range)
- [x] T148 [P] [US15] Create `backend/src/modules/audit/dto/audit-filter.dto.ts`

### Frontend — Audit Module

- [x] T149 [US15] Create `frontend/src/api/audit.api.ts` with `useAuditLogs` query
- [x] T150 [P] [US15] Create `frontend/src/modules/audit/AuditLogPage.tsx` (admin-only route; DataTable with resourceType/action/actor/date filters; expandable row showing previousValue and newValue JSON diff)

**Checkpoint**: User Story 15 complete — audit log access independently testable.

---

## Phase 18: Polish & Cross-Cutting Concerns

**Purpose**: Finalize deployment, CI/CD, performance, and documentation

- [x] T151 [P] Write `backend/Dockerfile` multi-stage build: `node:20-alpine` builder (pnpm install + build) → production image (non-root user, no devDependencies)
- [x] T152 [P] Write `frontend/Dockerfile` multi-stage build: `node:20-alpine` Vite builder → `nginx:1.25-alpine` serving `dist/` with gzip, cache headers, SPA fallback (`try_files $uri /index.html`)
- [x] T153 [P] Write `docker-compose.yml` (production-like) composing backend, frontend, and postgres services with health checks
- [x] T154 [P] Complete Kubernetes manifests in `k8s/`: backend Deployment (readiness/liveness probes on `/health/ready` and `/health`), backend HPA (2–10 replicas at 60% CPU), frontend Deployment, Ingress with TLS, PostgreSQL StatefulSet with PVC
- [x] T155 [P] Create GitHub Actions CI pipeline `.github/workflows/ci.yml`: lint → backend Jest → frontend Vitest → Docker build → Playwright smoke test (against docker-compose stack)
- [x] T156 [P] Set up Playwright configuration in `frontend/playwright.config.ts` and create E2E tests for critical paths in `frontend/tests/e2e/`: auth.spec.ts, customer-crud.spec.ts, pipeline.spec.ts, task-notification.spec.ts
- [x] T157 [P] Configure `@nestjs/swagger` decorators on all controllers and generate OpenAPI spec at `backend/docs/openapi.json` via `backend/scripts/generate-openapi.ts`
- [x] T158 [P] Add Prometheus metrics middleware in `backend/src/common/interceptors/metrics.interceptor.ts` exposing request count, latency histograms, and error rate on `GET /metrics`
- [x] T159 [P] Run `quickstart.md` validation scenarios end-to-end and fix any integration gaps discovered
- [x] T160 Write `README.md` at repository root with project overview, prerequisites, dev setup instructions, test commands, and deployment guide

---

## Phase 19: Tests & Quality Gates

**Purpose**: Satisfy Constitution VII (automated tests for critical workflows + contract tests for all endpoints), Constitution X (WCAG 2.1 AA), and SC-003/SC-004/SC-005 performance baselines

### Backend — Unit Tests (Jest)

- [x] T163 [P] Write Jest unit tests for `backend/src/modules/auth/auth.service.spec.ts`: login success/fail, token refresh, logout, password reset flow (mock PrismaService and JwtService)
- [x] T164 [P] Write Jest unit tests for `backend/src/common/guards/visibility.guard.spec.ts`: all 5 role scenarios (SYSTEM_ADMIN sees all, SALES_MANAGER sees team, SALES_REP sees own + team members, SUPPORT_REP, READ_ONLY)
- [x] T165 [P] Write Jest unit tests for `backend/src/common/middleware/audit.middleware.spec.ts`: verify AuditLog entry written for create, update, delete, status-change operations with correct actor, resource, action fields
- [x] T166 [P] Write Jest unit tests for `backend/src/modules/customers/customers.service.spec.ts`: CRUD, status transitions (PROSPECT→ACTIVE→INACTIVE→ARCHIVED), invalid transition rejection, archive/unarchive admin-only enforcement
- [x] T167 [P] Write Jest unit tests for `backend/src/modules/tasks/tasks.service.spec.ts`: TASK_ASSIGNED notification emit, isOverdue computation (dueDate < now && status === OPEN), complete/cancel status guard
- [x] T168 [P] Write Jest unit tests for `backend/src/modules/opportunities/opportunities.service.spec.ts`: OPPORTUNITY_ASSIGNED notification emit, stage progression, close-won/close-lost terminal state enforcement

### Backend — Contract Tests (Supertest + Jest Integration)

Configure `backend/test/jest-integration.config.ts` using a dedicated test PostgreSQL DB (from `docker-compose.dev.yml`); run all files below with `pnpm test:integration`:

- [x] T169 [P] Write `backend/test/contracts/auth.contract.test.ts`: POST /login, SSO initiate, POST /refresh, POST /logout, GET /me, PATCH /me — validate status codes, response shapes, and auth header enforcement per `contracts/auth.md`
- [x] T170 [P] Write `backend/test/contracts/users.contract.test.ts`: users CRUD, deactivate/reactivate, role assign, team assign — validate RBAC (non-admin gets 403) per `contracts/users.md`
- [x] T171 [P] Write `backend/test/contracts/customers.contract.test.ts`: customers CRUD, status transitions, archive/unarchive, visibility-scoped list per `contracts/customers.md`
- [x] T172 [P] Write `backend/test/contracts/contacts.contract.test.ts`: contacts CRUD, customer association, soft-delete per `contracts/contacts.md`
- [x] T173 [P] Write `backend/test/contracts/activities.contract.test.ts`: activities CRUD, customer/contact association per `contracts/activities.md`
- [x] T174 [P] Write `backend/test/contracts/opportunities.contract.test.ts`: opportunities CRUD, move-stage, close-won/close-lost, pipeline board per `contracts/opportunities.md`
- [x] T175 [P] Write `backend/test/contracts/tasks.contract.test.ts`: tasks CRUD, complete, cancel, TASK_ASSIGNED notification verified per `contracts/tasks.md`
- [x] T176 [P] Write `backend/test/contracts/notifications.contract.test.ts`: list, mark-read, read-all; SSE stream smoke test per `contracts/notifications.md`
- [x] T177 [P] Write `backend/test/contracts/files.contract.test.ts`: upload-url, confirm, list, download-url, delete; access control per `contracts/files.md`
- [x] T178 [P] Write `backend/test/contracts/search.contract.test.ts`: global search returns results across customers/contacts/opportunities/activities/tasks per `contracts/search.md`
- [x] T179 [P] Write `backend/test/contracts/dashboard.contract.test.ts`: metrics, revenue-trend, pipeline-funnel, activity-trend, team-performance per `contracts/dashboard.md`
- [x] T180 [P] Write `backend/test/contracts/reports.contract.test.ts`: all 10 report endpoints + CSV export per `contracts/reports.md`
- [x] T181 [P] Write `backend/test/contracts/audit.contract.test.ts`: paginated audit log with actor/resource/date filters; verify SYSTEM_ADMIN only (403 for other roles) per `contracts/audit.md`
- [x] T182 [P] Write `backend/test/contracts/import-export.contract.test.ts`: CSV import customers/contacts (202 + job poll), CSV export customers/contacts per `contracts/import-export.md`

### Frontend — Unit Tests (Vitest)

- [x] T183 [P] Write Vitest unit tests for `frontend/src/modules/auth/__tests__/useAuth.spec.ts`: login mutation, logout, token refresh, AuthGuard redirect for unauthenticated users
- [x] T184 [P] Write Vitest unit tests for `frontend/src/components/__tests__/RoleGuard.spec.tsx`: renders children for permitted roles, renders fallback/redirects for denied roles

### Accessibility (axe-core + Playwright)

- [x] T185 [P] Install `@axe-core/playwright`; create `frontend/tests/e2e/a11y.spec.ts` that runs axe accessibility scan on: login page, customer list page, customer detail page, pipeline board, task list page — fail CI on any WCAG 2.1 AA violation

### Performance Baseline (k6)

- [x] T186 [P] Write k6 load test script `k8s/tests/load/crm-baseline.js` with three scenarios: (1) GET /api/v1/customers with 10k seeded records (SC-003 threshold: p95 < 3s), (2) GET /api/v1/search?q=test under 50 VUs (SC-004 threshold: p95 < 2s), (3) 100-VU ramp over 60s hitting mixed read endpoints (SC-005 threshold: error rate < 1%); add `pnpm test:load` script to `backend/package.json`

**Checkpoint**: Phase 19 complete — constitution VII MUST clauses satisfied; WCAG AA baseline established; SC-003/SC-004/SC-005 thresholds codified.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — **BLOCKS all user stories**
- **P1 User Stories (Phases 3–6)**: All depend on Phase 2; can proceed in parallel once foundation is complete
- **P2 User Stories (Phases 7–11)**: Depend on Phase 2; some depend on P1 stories:
  - US5 Activities (Phase 7) depends on US3 Customers (Phase 5) and US4 Contacts (Phase 6)
  - US6 Opportunities (Phase 8) depends on US3 Customers (Phase 5)
  - US7 Pipeline (Phase 9) depends on US6 Opportunities (Phase 8)
  - US8 Tasks (Phase 10) depends on US3 Customers (Phase 5) and US6 Opportunities (Phase 8)
  - US9 Dashboard (Phase 11) depends on US3, US6, US8 for meaningful data
- **P3 User Stories (Phases 12–17)**: Depend on Phase 2 and relevant P1/P2 stories
  - US11 Notifications (Phase 13) depends on US8 Tasks (T103 emits notifications)
  - US12 Files (Phase 14) requires US3 customers/US6 opportunities to exist
  - US13 Search (Phase 15) requires tsvector indexes from Phase 2 (T015–T016)
  - US14 Import (Phase 16) requires US3 customer/US4 contact creation logic
  - US15 Audit (Phase 17) requires audit middleware from Phase 2 (T019)
- **Polish (Phase 18)**: Depends on all user stories being complete
- **Tests (Phase 19)**: Depends on Phase 18 (all modules implemented); contract tests require a running test database

### Parallel Execution Opportunities

Once Phase 2 is complete, the following phases can be developed simultaneously:

```
Foundation Complete
        │
   ┌────┼────────────────┐
   │    │                │
  US1  US2             US3+US4 (can start in parallel)
  Auth Users           Customers/Contacts
   │    │                │
  US5 (Activities after US3+US4)
  US6 (Opportunities after US3)
  US7 (Pipeline after US6)
  US8 (Tasks after US3+US6)
  US9 (Dashboard after US3+US6+US8)
   │
  US10–US15 (P3 after respective P1/P2 stories)
```

---

## Implementation Strategy

### MVP First (Authentication + Core Data + Customer Lifecycle)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation (**critical blocker**)
3. Complete Phase 3 (US1): Authentication
4. Complete Phase 4 (US2): User Management
5. Complete Phase 5 (US3): Customer Management
6. **STOP and VALIDATE**: `curl /auth/login`, create customer, search, archive — verify Scenarios 1–3
7. **Deploy as MVP**: Users can log in and manage customers

### Incremental Delivery

| Sprint | Phases | Deliverable |
|--------|--------|-------------|
| 1 | Setup + Foundation | Deployable skeleton with health checks |
| 2 | US1 + US2 | Authentication + User management |
| 3 | US3 + US4 | Customer + Contact management |
| 4 | US5 + US6 + US7 | Activities + Opportunities + Pipeline board |
| 5 | US8 + US9 | Tasks + Dashboard |
| 6 | US10 + US11 + US12 | Reports + Notifications + Files |
| 7 | US13 + US14 + US15 | Search + Import/Export + Audit |
| 8 | Phase 18 | Polish, CI/CD, E2E tests, documentation |
| 9 | Phase 19 | Unit tests, contract tests, accessibility audit, performance baseline |

### Parallel Team Strategy

With 4+ developers after Foundation is complete:
- **Dev A**: US1 Auth + US2 Users
- **Dev B**: US3 Customers + US4 Contacts
- **Dev C**: US5 Activities + US6 Opportunities
- **Dev D**: Frontend bootstrap + shared components

All stories merge independently; pipeline board and subsequent P3 stories follow.

---

## Notes

- `[P]` tasks have no file conflicts with each other and can run in parallel within the same phase
- Each `[USN]` label maps directly to the user story in `specs/001-enterprise-crm-platform/spec.md`
- File paths are relative to the repository root
- Commit after each task or logical group; never commit a partial module that breaks the build
- Before marking a story complete, run its **Independent Test** from this file
- Tasks in `backend/src/modules/<module>/` follow NestJS conventions: module → service → controller → DTOs
- Tasks in `frontend/src/modules/<module>/` follow the page → API hook → component pattern
