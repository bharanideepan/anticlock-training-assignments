# Architecture & Technical Stack

## Technology Choices

### Backend
| Concern | Choice | Notes |
|---------|--------|-------|
| Runtime | Node.js 20 LTS | |
| Language | TypeScript 5.x (strict mode) | |
| Framework | NestJS 10 (modular monolith) | Domain-driven module separation |
| ORM | Prisma 5 | Client extensions for soft-delete and audit middleware |
| Database | PostgreSQL 16 | Primary relational store |
| Authentication | Passport.js (JWT + SAML + OIDC strategies) | |
| Validation | `class-validator` + `class-transformer` + Zod | Global `ValidationPipe`; Zod for complex query params |
| API docs | `@nestjs/swagger` | OpenAPI at `/api/v1/docs` |
| Logging | Pino (structured JSON) | Request-level logging with trace IDs |
| Email | Nodemailer (SMTP) | Password resets and notification emails |
| File storage | S3-compatible object storage | Presigned URL flow — files bypass backend |

### Frontend
| Concern | Choice | Notes |
|---------|--------|-------|
| Language | TypeScript 5.x | |
| Framework | React 19 | |
| Build tool | Vite 5 | |
| UI library | Material UI v6 (MUI) | Component library + theme customization |
| Server state | TanStack Query v5 | Caching, loading, error states |
| Forms | React Hook Form v7 + Zod v3 | Shared Zod schemas with backend |
| Routing | React Router v6 | Lazy-loaded routes; AuthGuard + RoleGuard |
| Charts | Recharts | Revenue trend, pipeline funnel, activity trends |
| Kanban | `@dnd-kit/core` | Drag-and-drop; keyboard accessible (WCAG 2.1 AA) |
| Virtual lists | `react-window` | Virtualize stage columns when > 50 cards |

### Testing
| Layer | Tool | Coverage |
|-------|------|---------|
| Backend unit | Jest | Services, guards, pipes, interceptors (Prisma mocked) |
| Backend integration | Jest + supertest | Full HTTP against test PostgreSQL DB — no mocks |
| Frontend unit | Vitest + React Testing Library | Components, hooks, Zod schemas |
| Frontend E2E | Playwright | Critical user journeys |

### Infrastructure
| Component | Technology |
|-----------|-----------|
| Containerization | Docker (multi-stage builds) |
| Orchestration | Kubernetes |
| Horizontal scaling | Kubernetes HPA (CPU threshold 60%; 2–10 replicas) |
| Database | PostgreSQL StatefulSet (dev/staging); managed DB (RDS/CloudSQL) for production |
| Ingress | TLS termination; `/api/` → backend, `/` → frontend |

---

## Project Structure

```
crm-app/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/            # Login, SSO, token refresh, password reset
│   │   │   ├── users/           # User CRUD, role assignment, profile
│   │   │   ├── teams/           # Team CRUD, membership management
│   │   │   ├── customers/       # Customer CRUD, status lifecycle
│   │   │   ├── contacts/        # Contact CRUD, interaction history
│   │   │   ├── activities/      # Activity creation/edit, customer timeline
│   │   │   ├── opportunities/   # Opportunity CRUD, stage transitions
│   │   │   ├── pipeline/        # Pipeline board aggregation, stage config
│   │   │   ├── tasks/           # Task CRUD, complete/cancel
│   │   │   ├── notifications/   # In-app delivery, email dispatch, mark-read
│   │   │   ├── files/           # S3 presigned upload/download, record link
│   │   │   ├── search/          # Full-text search (PostgreSQL tsvector)
│   │   │   ├── reports/         # Report generation + CSV export
│   │   │   ├── dashboard/       # Role-scoped metrics and chart data
│   │   │   ├── audit/           # Audit log query API
│   │   │   └── import-export/   # CSV import validation + processing
│   │   ├── common/
│   │   │   ├── guards/          # JwtAuthGuard, RolesGuard, VisibilityGuard
│   │   │   ├── decorators/      # @Roles(), @CurrentUser(), @Public()
│   │   │   ├── interceptors/    # AuditInterceptor, TransformResponseInterceptor
│   │   │   ├── filters/         # GlobalExceptionFilter (canonical error shape)
│   │   │   ├── pipes/           # ZodValidationPipe
│   │   │   └── pagination/      # PageOptionsDto, PaginatedResult<T>
│   │   ├── config/              # ConfigModule — env, S3, DB, JWT, mail, SSO
│   │   ├── prisma/              # PrismaService, soft-delete middleware, audit middleware
│   │   └── main.ts              # Global pipes, filters, CORS, Swagger, Pino
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── api/                 # TanStack Query hooks per domain
│   │   ├── modules/
│   │   │   ├── auth/            # LoginPage, SsoCallbackPage, PasswordResetPage
│   │   │   ├── dashboard/       # DashboardPage, MetricCard, charts
│   │   │   ├── users/           # UserListPage, UserFormPage (admin only)
│   │   │   ├── customers/       # CustomerListPage, CustomerDetailPage, CustomerFormPage
│   │   │   ├── contacts/        # ContactListPage, ContactDetailPage, ContactFormPage
│   │   │   ├── activities/      # ActivityTimeline, ActivityFormDialog
│   │   │   ├── opportunities/   # OpportunityListPage, OpportunityFormPage, Detail
│   │   │   ├── pipeline/        # PipelineBoardPage (Kanban), StageColumn, Card
│   │   │   ├── tasks/           # TaskListPage, TaskFormDialog
│   │   │   ├── notifications/   # NotificationCenter, NotificationBell
│   │   │   ├── reports/         # ReportPage, ReportFilters, ExportButton
│   │   │   ├── files/           # FileUploadZone, FileList
│   │   │   ├── search/          # GlobalSearchBar, SearchResultsPage
│   │   │   └── audit/           # AuditLogPage (admin only)
│   │   ├── shared/
│   │   │   ├── components/      # DataTable, ConfirmDialog, PageHeader, StatusChip
│   │   │   ├── hooks/           # useAuth, usePagination, useDebounce
│   │   │   ├── schemas/         # Shared Zod validation schemas
│   │   │   └── types/           # TypeScript interfaces for API response shapes
│   │   ├── router/              # React Router v6 — lazy routes, AuthGuard, RoleGuard
│   │   ├── theme/               # MUI theme (palette, typography, breakpoints)
│   │   └── main.tsx
│   └── Dockerfile
│
├── k8s/
│   ├── namespace.yaml
│   ├── ingress.yaml
│   ├── backend/
│   │   ├── deployment.yaml      # NestJS pods (min 2 replicas)
│   │   ├── service.yaml
│   │   └── hpa.yaml             # HPA: CPU 60%, max 10 replicas
│   ├── frontend/
│   │   ├── deployment.yaml      # Nginx serving React SPA
│   │   └── service.yaml
│   └── postgres/
│       ├── statefulset.yaml
│       └── pvc.yaml
│
└── e2e/                         # Playwright E2E tests
```

---

## Backend Architecture Decisions

### Modular Monolith
Each domain is a self-contained NestJS module (controller + service + DTOs + Prisma queries). No shared service singletons cross domain boundaries except via explicit dependency injection. This preserves future extractability to microservices if load requires it.

### Soft Delete
All core entities carry `deletedAt DateTime?`. A Prisma client extension automatically appends `WHERE deletedAt IS NULL` to every `findMany`, `findFirst`, and `findUnique`. Hard delete is reserved for system maintenance only.

### Server-Side Pagination
Offset/limit pagination via `PageOptionsDto { page, pageSize, sortBy, sortOrder }`. All list endpoints return `PaginatedResult<T> { data, meta: { total, page, pageSize, totalPages } }`. Max `pageSize` is 100.

### Full-Text Search
PostgreSQL `tsvector` columns on `customers`, `contacts`, and `opportunities`. Updated via PostgreSQL triggers on insert/update. Queries use `@@ to_tsquery(...)` with a GIN index.

### Audit Logging
Prisma middleware intercepts `create`, `update`, `delete` on auditable models and writes to `AuditLog`. Actor context is propagated via Node.js `AsyncLocalStorage` set in `JwtAuthGuard` — no manual passing through service layers needed.

### JWT Strategy
- **Access token**: 15-minute TTL, HS256, payload `{ sub, email, role, teamIds }`. Delivered in JSON response body.
- **Refresh token**: 7-day TTL, 64-byte cryptographically random hex, stored as bcrypt hash in `RefreshToken` table. Delivered in `httpOnly; Secure; SameSite=Strict` cookie `crm_refresh`. Rotated on every use.

### RBAC Implementation
- `RolesGuard` checks `@Roles()` decorator on each controller method.
- `VisibilityGuard` builds a `visibilityFilter` Prisma `where` clause based on the current user's role and team memberships. All service list/find queries include this filter.

---

## Frontend Architecture Decisions

### State Management
Server state is managed entirely by TanStack Query. No global client state store (Redux/Zustand) for v1. Auth state held in React context.

### Form Validation
React Hook Form + Zod resolver. Zod schemas in `src/shared/schemas/` are shared between form components and API type definitions — single source of truth for field shapes and validation rules.

### File Upload Flow
1. Frontend calls `POST /api/v1/files/upload-url` — backend generates presigned S3 POST URL (5-min expiry).
2. Frontend uploads directly to S3 (bypasses backend for bandwidth).
3. Frontend calls `POST /api/v1/files/confirm` — backend records file metadata.
4. Downloads use presigned GET URLs (15-min expiry) generated on demand.

### Notifications
- Polled every 30 seconds via `GET /api/v1/notifications?unreadOnly=true`.
- SSE endpoint `GET /api/v1/notifications/stream` available for real-time delivery (connection closes after 60 seconds; client reconnects).

---

## CI/CD Gates (all required before merge)

1. All Jest tests pass (unit + integration)
2. All Vitest tests pass
3. Playwright smoke tests pass
4. No critical static analysis findings (ESLint + TypeScript strict mode)
5. Docker image builds successfully
6. Prisma migrations are backward-compatible

---

## Performance Targets

| Operation | Target |
|-----------|--------|
| List pages (10,000 records, paginated) | < 3 seconds |
| Global search (1,000 matches) | < 2 seconds |
| Report generation + CSV export (12 months) | < 30 seconds |
| Dashboard (cached/aggregated data) | < 2 seconds |
| In-app notification delivery | < 10 seconds from event |
| Dashboard chart cache TTL | 5 minutes |

---

## Observability

- **Logging**: Pino JSON logger. Every request logs: `traceId`, `userId`, `method`, `path`, `statusCode`, `durationMs`. Errors include full stack trace.
- **Health checks**: `GET /health` (liveness) and `GET /health/ready` (readiness — DB connected, no pending migrations).
- **Metrics**: Prometheus endpoint at `/metrics` (internal only; scraped by Kubernetes Prometheus operator).
- **Trace IDs**: `X-Trace-Id` request header accepted and forwarded; generated if absent. Stored in `AsyncLocalStorage`.

---

## Environment Variables (required)

```
DATABASE_URL           # PostgreSQL connection string
JWT_SECRET             # HS256 signing secret
JWT_REFRESH_SECRET     # Separate secret for refresh tokens
AWS_ACCESS_KEY_ID      # S3 credentials
AWS_SECRET_ACCESS_KEY
AWS_REGION
S3_BUCKET_NAME
SMTP_HOST              # Nodemailer SMTP config
SMTP_PORT
SMTP_USER
SMTP_PASS
FRONTEND_URL           # CORS allow-origin + password reset link base
SESSION_TIMEOUT_MINUTES  # Default 30
```
