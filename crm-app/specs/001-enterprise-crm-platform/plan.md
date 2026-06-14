# Implementation Plan: Enterprise CRM Platform

**Branch**: `001-enterprise-crm-platform` | **Date**: 2026-06-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-enterprise-crm-platform/spec.md`

## Summary

Build a production-grade enterprise CRM as a full-stack web application. The backend is a
NestJS modular monolith with domain-driven module separation, Prisma ORM, PostgreSQL, and JWT
authentication (access token + rotating refresh token). The frontend is a React 19 SPA using
TypeScript, Vite, Material UI, TanStack Query, React Hook Form, and Zod. The system enforces
team-scoped RBAC for data visibility, immutable audit logging via Prisma middleware,
server-side pagination on all list endpoints, soft-delete on core entities, and S3-compatible
file storage. Deployed as Docker containers orchestrated by Kubernetes with horizontal
autoscaling on the stateless backend.

## Technical Context

**Language/Version**: TypeScript 5.x — Node.js 20 LTS (backend), browser ES2022+ (frontend)

**Primary Dependencies**:
- Backend: NestJS 10, Prisma 5, Passport.js (JWT + SAML + OIDC strategies),
  class-validator, class-transformer, @nestjs/swagger, Pino (logging), Nodemailer
- Frontend: React 19, Vite 5, Material UI v6, TanStack Query v5, React Hook Form v7, Zod v3,
  React Router v6, Recharts (dashboard visualizations)

**Storage**: PostgreSQL 16 (primary relational store) + S3-compatible object storage (file
attachments, import/export CSVs)

**Testing**:
- Backend: Jest (unit + integration tests, supertest for HTTP)
- Frontend: Vitest + React Testing Library (unit/component), Playwright (E2E)

**Target Platform**: Linux containers (Docker), orchestrated via Kubernetes

**Project Type**: REST API web service (NestJS) + React SPA (Vite)

**Performance Goals**:
- List pages: < 3 s at 10,000 records with server-side pagination
- Search: < 2 s for up to 1,000 matched results
- Report generation + export: < 30 s for 12-month range
- Dashboard: < 2 s on cached/aggregated data
- In-app notification delivery: < 10 s from triggering event

**Constraints**:
- Server-side pagination required on every list endpoint (no unbounded queries)
- Soft delete on all core entities (customers, contacts, opportunities, tasks, activities, files)
- Team-scoped data visibility enforced server-side on every data-access operation (FR-000)
- JWT access token TTL: 15 minutes; refresh token TTL: 7 days (httpOnly cookie, rotated)
- File upload max size: 25 MB per file
- 99.9% monthly uptime SLA (SC-011)
- SSO (SAML 2.0 / OIDC) primary auth; email/password restricted to System Administrator

**Scale/Scope**:
- 10,000+ customers, 100,000+ contacts, 1,000+ concurrent users
- Stateless NestJS instances behind a Kubernetes HorizontalPodAutoscaler
- Refresh token state stored in PostgreSQL (not Redis) for v1 simplicity

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Evidence / Notes |
|-----------|--------|-----------------|
| I. Enterprise Grade Quality | ✅ PASS | Production stack, typed end-to-end, all CI gates required before merge |
| II. API First Design | ✅ PASS | REST `/api/v1/` versioning; OpenAPI via @nestjs/swagger; frontend consumes API exclusively |
| III. Security By Default | ✅ PASS | JWT on every route; class-validator + Zod input validation; secrets via env; httpOnly cookie for refresh token |
| IV. RBAC | ✅ PASS | 5 roles; NestJS RolesGuard + VisibilityGuard; team-scoped read access per FR-000 |
| V. Auditability | ✅ PASS | AuditLog entity; Prisma middleware intercepts all mutations; 90-day retention |
| VI. Scalability | ✅ PASS | Stateless backend; paginated queries only; Kubernetes HPA for horizontal scaling |
| VII. Testability | ✅ PASS | Jest (backend), Vitest (frontend), Playwright (E2E); contract tests per endpoint group |
| VIII. Consistency | ✅ PASS | TypeScript everywhere; canonical error format `{ error: { code, message } }`; shared Zod schemas |
| IX. Observability | ✅ PASS | Pino structured JSON logging; `/health` + `/health/ready`; trace IDs via AsyncLocalStorage |
| X. User Experience | ✅ PASS | MUI responsive grid; TanStack Query loading/error states; WCAG 2.1 AA via MUI defaults |

**No violations.** Standard 2-project (backend + frontend) web-app layout is the minimal
justified structure for a full-stack CRM; a single project would conflate two independent
deployment units.

## Project Structure

### Documentation (this feature)

```text
specs/001-enterprise-crm-platform/
├── plan.md              # This file
├── research.md          # Phase 0 — technology decisions and rationale
├── data-model.md        # Phase 1 — entity model, schema, state machines
├── quickstart.md        # Phase 1 — runnable validation guide
├── contracts/           # Phase 1 — REST API contracts per domain
│   ├── auth.md
│   ├── users.md
│   ├── customers.md
│   ├── contacts.md
│   ├── activities.md
│   ├── opportunities.md
│   ├── pipeline.md
│   ├── tasks.md
│   ├── notifications.md
│   ├── files.md
│   ├── search.md
│   ├── dashboard.md
│   ├── reports.md
│   ├── audit.md
│   └── import-export.md
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   ├── auth/           # Login (email/pwd + SSO SAML/OIDC), token refresh, password reset
│   │   ├── users/          # User CRUD, role/team assignment, profile
│   │   ├── teams/          # Team CRUD, membership management
│   │   ├── customers/      # Customer CRUD, status lifecycle, archive/unarchive
│   │   ├── contacts/       # Contact CRUD, customer association, interaction history
│   │   ├── activities/     # Activity creation/edit, customer timeline
│   │   ├── opportunities/  # Opportunity CRUD, stage transitions, close won/lost
│   │   ├── pipeline/       # Pipeline board aggregation, stage configuration
│   │   ├── tasks/          # Task CRUD, assignment, complete/cancel
│   │   ├── notifications/  # In-app notification delivery, email dispatch, mark-read
│   │   ├── files/          # S3 upload, presigned download URL, record association
│   │   ├── search/         # Full-text search across entity types (PostgreSQL tsvector)
│   │   ├── reports/        # Sales, customer, and productivity report generation + CSV export
│   │   ├── dashboard/      # Role-scoped metric aggregation and chart data
│   │   ├── audit/          # Audit log query API
│   │   └── import-export/  # CSV import validation + processing, CSV export
│   ├── common/
│   │   ├── guards/         # JwtAuthGuard, RolesGuard, VisibilityGuard
│   │   ├── decorators/     # @Roles(), @CurrentUser(), @Public()
│   │   ├── interceptors/   # AuditInterceptor, TransformResponseInterceptor
│   │   ├── filters/        # GlobalExceptionFilter (canonical error shape)
│   │   ├── pipes/          # ZodValidationPipe
│   │   └── pagination/     # PageOptionsDto, PaginatedResult<T>
│   ├── config/             # ConfigModule — env validation, S3, DB, JWT, mail, SSO
│   ├── prisma/             # PrismaService, PrismaModule, soft-delete middleware, audit middleware
│   └── main.ts             # Bootstrap: global pipes, filters, CORS, Swagger, Pino logger
├── test/
│   ├── unit/               # Jest unit tests per module
│   └── integration/        # Jest + supertest HTTP integration tests
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── Dockerfile
└── package.json

frontend/
├── src/
│   ├── api/                # TanStack Query hooks per domain (useCustomers, useOpportunities…)
│   ├── modules/
│   │   ├── auth/           # LoginPage, SsoCallbackPage, PasswordResetPage, ChangePasswordPage
│   │   ├── dashboard/      # DashboardPage, MetricCard, RevenueChart, PipelineFunnel
│   │   ├── users/          # UserListPage, UserFormPage (admin only), UserDetailPage
│   │   ├── customers/      # CustomerListPage, CustomerDetailPage, CustomerFormPage
│   │   ├── contacts/       # ContactListPage, ContactDetailPage, ContactFormPage
│   │   ├── activities/     # ActivityTimeline, ActivityFormDialog
│   │   ├── opportunities/  # OpportunityListPage, OpportunityFormPage, OpportunityDetailPage
│   │   ├── pipeline/       # PipelineBoardPage (Kanban), StageColumn, OpportunityCard
│   │   ├── tasks/          # TaskListPage, TaskFormDialog, TaskDetailPage
│   │   ├── notifications/  # NotificationCenter, NotificationBell, NotificationItem
│   │   ├── reports/        # ReportPage, ReportFilters, ExportButton
│   │   ├── files/          # FileUploadZone, FileList, FileItem
│   │   ├── search/         # GlobalSearchBar, SearchResultsPage, SearchResultGroup
│   │   └── audit/          # AuditLogPage, AuditLogFilters (admin only)
│   ├── shared/
│   │   ├── components/     # DataTable, ConfirmDialog, PageHeader, Breadcrumb, StatusChip
│   │   ├── hooks/          # useAuth, usePagination, useDebounce, useFileUpload
│   │   ├── schemas/        # Shared Zod validation schemas (mirrors backend DTO validation)
│   │   └── types/          # TypeScript interfaces for all API response shapes
│   ├── router/             # React Router v6 — lazy routes + AuthGuard + RoleGuard
│   ├── theme/              # MUI theme (palette, typography, breakpoints)
│   └── main.tsx
├── tests/
│   ├── unit/               # Vitest component + hook tests
│   └── e2e/                # Playwright test suites
├── Dockerfile
└── package.json

k8s/
├── namespace.yaml
├── ingress.yaml
├── backend/
│   ├── deployment.yaml     # NestJS pods (replicas: 2+)
│   ├── service.yaml
│   ├── configmap.yaml
│   └── hpa.yaml            # HorizontalPodAutoscaler (CPU 60%)
├── frontend/
│   ├── deployment.yaml     # Nginx serving built React SPA
│   └── service.yaml
└── postgres/
    ├── statefulset.yaml
    └── pvc.yaml
```

**Structure Decision**: Option 2 (Web application) — `backend/` and `frontend/` at repo root
with a shared `k8s/` directory. This respects independent build pipelines, dependency graphs,
and deployment lifecycles while keeping both in one monorepo.

## Complexity Tracking

> No constitution violations requiring justification.
