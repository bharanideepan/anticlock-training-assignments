# Research: Enterprise CRM Platform

**Phase 0 Output** | **Date**: 2026-06-12 | **Plan**: [plan.md](plan.md)

All technology choices were provided as hard constraints. This document records the rationale,
patterns, and best-practice decisions made within those constraints for architecture-level
questions that the spec and user input left open.

---

## 1. Backend Architecture — NestJS Modular Monolith

**Decision**: Domain-driven module separation inside a single NestJS application. Each
domain (customers, opportunities, tasks, etc.) is a self-contained NestJS module with its
own controller, service, DTOs, and Prisma queries. No shared service singletons cross
domain boundaries except via explicit dependency injection.

**Rationale**: A modular monolith delivers the developer experience of a monorepo with a
single deployment unit. For a 1,000 concurrent-user CRM that must scale horizontally, this
avoids the operational complexity of microservices while preserving future extractability of
hot modules (e.g., notifications, reports) into separate services if load demands it.

**Alternatives considered**:
- Microservices: rejected — premature for v1; adds network latency, distributed transaction
  complexity, and significant DevOps overhead without measurable benefit at this scale.
- Single-file/feature monolith: rejected — does not enforce domain boundaries, making RBAC
  and audit concerns harder to apply consistently.

---

## 2. Database — PostgreSQL Patterns

### 2a. Soft Delete

**Decision**: All core entities carry a `deletedAt DateTime?` nullable column. A Prisma
client extension (middleware) automatically appends `WHERE "deletedAt" IS NULL` to every
`findMany`, `findFirst`, and `findUnique` operation. Hard delete is reserved for system
maintenance only.

**Rationale**: Soft delete preserves referential integrity (a deleted customer's audit trail,
activities, and opportunities remain queryable by administrators), satisfies the auditability
principle, and avoids foreign key cascade errors.

**Pattern**: Prisma client extension overrides `findMany`/`findFirst`/`findUnique` to inject
`{ where: { deletedAt: null } }`. Delete operations are overridden to perform an `update`
setting `deletedAt = new Date()`.

### 2b. Server-Side Pagination

**Decision**: Offset/limit pagination using `PageOptionsDto` (`page`, `pageSize`, `sortBy`,
`sortOrder`). All list endpoints return `PaginatedResult<T>` with `{ data, meta: { total,
page, pageSize, totalPages } }`.

**Rationale**: Cursor-based pagination is preferable for very large datasets but is
incompatible with arbitrary sort fields and random-access page navigation (required by the
DataTable UI). Offset pagination with indexed columns is sufficient at 100,000 contacts when
combined with filters that reduce the working set.

**Mitigation**: Enforce a maximum `pageSize` of 100. Add composite indexes on sort-heavy
columns (`companyName`, `createdAt`, `status`).

### 2c. Full-Text Search

**Decision**: PostgreSQL `tsvector` columns on `customers.searchVector`,
`contacts.searchVector`, and `opportunities.searchVector`. Updated via PostgreSQL triggers on
insert/update. NestJS search module queries using `@@ to_tsquery(...)`.

**Rationale**: Avoids the operational overhead of a separate search service (Elasticsearch)
for v1. PostgreSQL FTS is sufficient for 100,000 contacts with sub-2-second response times
when the `searchVector` column carries a GIN index.

**Alternatives considered**: Elasticsearch — rejected for v1 (separate service, sync lag,
operational complexity). Can be added later as the search module is isolated.

### 2d. Audit Logging

**Decision**: Prisma middleware intercepts `create`, `update`, `delete` operations on
auditable models and writes to an `AuditLog` table. The current actor's ID is propagated via
Node.js `AsyncLocalStorage` set in the `JwtAuthGuard` on each request.

**Rationale**: Centralised Prisma middleware means no module needs to manually call an audit
service — coverage is guaranteed for all DB mutations. AsyncLocalStorage avoids threading
actor context through every service call.

**Auditable models**: User, Team, Customer, Contact, Activity, Opportunity, PipelineStage,
Task, File (+ login/logout events emitted directly from AuthService).

---

## 3. Authentication & Security

### 3a. JWT Strategy

**Decision**:
- Access token: 15-minute TTL, signed HS256, payload `{ sub, email, role, teamIds }`.
  Delivered in JSON response body.
- Refresh token: 7-day TTL, cryptographically random 64-byte hex string, stored as bcrypt
  hash in `RefreshToken` table. Delivered in `httpOnly; Secure; SameSite=Strict` cookie.
  Rotated on every use (old token revoked, new token issued).

**Rationale**: Short-lived access tokens limit exposure from token theft. Storing the refresh
token hash (not plaintext) in the DB prevents DB-read attacks. Rotation means a stolen
refresh token is invalidated on first legitimate use. httpOnly cookie blocks JS-based XSS
access to the refresh token.

**Token revocation**: Refresh tokens are revoked on logout, password change, account
deactivation, and role change. Administrators can revoke all tokens for a user via the user
management API.

### 3b. SSO (SAML 2.0 / OIDC)

**Decision**: Use `passport-saml` (SAML 2.0) and `openid-client` (OIDC) as Passport.js
strategies. On successful SSO callback, the system looks up the user by email. If found and
active, JWT tokens are issued. If the email matches no user, a provisioning flow can create
the account (optional, configured per IdP). email/password login is available only for
accounts with the `SystemAdministrator` role.

**Configuration**: Administrators configure the IdP endpoint, entity ID, and certificate via
the `/api/v1/auth/sso/config` endpoint. Config stored encrypted in `SsoConfig` table.

### 3c. RBAC

**Decision**: 5 roles enforced via NestJS `RolesGuard` (checks `@Roles()` decorator) and a
`VisibilityGuard` (enforces team-scoped read access per FR-000). The visibility scope is:
- `SystemAdministrator`: sees all records
- `SalesManager`: sees all records owned by users in their team(s)
- `SalesRepresentative`: sees records owned by themselves or their team members
- `SupportRepresentative`: same scope as SalesRepresentative (read-heavy, limited write)
- `ReadOnlyUser`: same visibility scope as SalesRepresentative; all mutating endpoints return
  403

**Implementation**: `VisibilityGuard` adds a `visibilityFilter` object to the request context.
Each service's list/find queries include this filter in the Prisma `where` clause.

### 3d. Input Validation

**Decision**: Backend uses `class-validator` + `class-transformer` via NestJS `ValidationPipe`
(global). A `ZodValidationPipe` is used for complex query parameter schemas. Frontend mirrors
validation with Zod schemas in React Hook Form.

---

## 4. File Storage — S3-Compatible Object Storage

**Decision**: Files are uploaded via a presigned POST URL flow:
1. Frontend calls `POST /api/v1/files/upload-url` → backend generates presigned S3 POST URL
   (expires 5 minutes).
2. Frontend uploads directly to S3 using the presigned URL (bypasses backend for large files).
3. Frontend confirms upload with `POST /api/v1/files/confirm` → backend records file metadata
   in DB.
4. Downloads use presigned GET URLs (15-minute expiry) generated on demand.

**Rationale**: Direct-to-S3 uploads via presigned URLs eliminate backend as a file-transfer
bottleneck, reduce memory pressure, and simplify bandwidth capacity planning.

**Alternatives considered**: Streaming through backend — rejected for performance; backend
becomes a single-file-at-a-time bottleneck.

---

## 5. Frontend Architecture

### 5a. State Management

**Decision**: Server state managed entirely by TanStack Query. No global client state store
(Redux/Zustand) for v1. Auth state (current user, tokens) held in React context + local
storage (access token expiry tracking only; refresh token is httpOnly cookie).

**Rationale**: TanStack Query eliminates the need for hand-rolled caching, loading, and error
state for the dominant use case (server data). Local UI state is component-local.

### 5b. Form Validation

**Decision**: React Hook Form + Zod resolver. Zod schemas defined in `src/shared/schemas/`
are imported by both form components and API query functions, providing a single source of
truth for field shapes and validation rules.

### 5c. Routing

**Decision**: React Router v6 with lazy-loaded route modules (`React.lazy` + `Suspense`).
Route-level `AuthGuard` redirects unauthenticated users to login. `RoleGuard` renders a 403
page for routes the user's role cannot access. Route definitions in `src/router/routes.tsx`.

### 5d. Pipeline Board (Kanban)

**Decision**: `@dnd-kit/core` for drag-and-drop (keyboard accessible, works without pointer
events — required for WCAG 2.1 AA). Each stage column renders a virtual list via
`react-window` if the opportunity count per stage exceeds 50.

---

## 6. Notifications

**Decision**: In-app notifications are polled by the frontend every 30 seconds via
`GET /api/v1/notifications?unreadOnly=true`. A Server-Sent Events (SSE) endpoint
`GET /api/v1/notifications/stream` is available for real-time delivery without WebSocket
infrastructure. Email notifications are sent via Nodemailer with an SMTP transport; a simple
in-process queue (Bull/BullMQ backed by PostgreSQL advisory locks or Redis) handles retry.

**Rationale**: SSE requires no additional infrastructure beyond NestJS and covers the
< 10-second delivery SLA. A full WebSocket server is deferred to v2. For v1 email, Nodemailer
with SMTP is sufficient; switching to a transactional email provider is a config change.

---

## 7. Testing Strategy

| Layer | Tool | Scope |
|-------|------|-------|
| Backend unit | Jest | Services, guards, pipes, interceptors in isolation (Prisma mocked) |
| Backend integration | Jest + supertest | Full HTTP request/response against a test PostgreSQL DB |
| Backend contract | Jest + supertest | Each endpoint group validated against its OpenAPI contract |
| Frontend unit | Vitest + RTL | Components, hooks, Zod schemas |
| Frontend E2E | Playwright | Critical user journeys (login, customer CRUD, pipeline, task, report export) |

**Test DB strategy**: Each integration test suite uses a dedicated PostgreSQL schema, seeded
via Prisma seed scripts, and torn down after the suite. No mocking of the database in
integration tests (per constitution audit from prior engagement).

---

## 8. Deployment Strategy

### 8a. Docker

- `backend/Dockerfile`: multi-stage build — `node:20-alpine` builder → production image
  without devDependencies. Runs as non-root user.
- `frontend/Dockerfile`: multi-stage build — Vite build → Nginx `1.25-alpine` serving
  `dist/` with gzip, cache headers, and SPA fallback (`try_files $uri /index.html`).

### 8b. Kubernetes

| Resource | Purpose |
|----------|---------|
| `Deployment` (backend) | 2+ replicas; `readinessProbe` on `/health/ready`; `livenessProbe` on `/health` |
| `HPA` (backend) | Scale 2–10 replicas at 60% CPU utilization |
| `Deployment` (frontend) | 2 Nginx replicas; static content; low resource requirements |
| `StatefulSet` (postgres) | Single-node PostgreSQL with PersistentVolumeClaim; upgrade to managed DB (RDS/CloudSQL) for production |
| `Ingress` | TLS termination; path routing: `/api/` → backend, `/` → frontend |
| `ConfigMap` / `Secret` | Non-sensitive config in ConfigMap; DB URL, JWT secret, S3 credentials in Secrets |

### 8c. CI/CD Gates (per constitution quality gates)

1. All Jest tests pass (unit + integration)
2. All Vitest tests pass
3. Playwright smoke tests pass
4. No critical static analysis findings (ESLint + TypeScript strict mode)
5. Docker image builds successfully
6. Prisma migrations are backward-compatible (checked by migration diff)

---

## 9. Observability

**Decision**:
- **Logging**: Pino JSON logger injected via NestJS `LoggerModule`. Every request logs:
  `traceId` (UUID generated at request entry), `userId`, `method`, `path`, `statusCode`,
  `durationMs`. Errors include full stack trace.
- **Health checks**: `/health` (liveness — process alive) and `/health/ready` (readiness —
  DB connected, no pending critical migrations).
- **Metrics**: Expose Prometheus metrics via `@willsoto/nestjs-prometheus` on `/metrics`
  (not externally reachable; scraped by Kubernetes Prometheus operator).
- **Trace ID propagation**: `X-Trace-Id` request header accepted and forwarded; generated if
  absent. Stored in `AsyncLocalStorage` for log correlation.

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Offset pagination degrades at high offset on contacts (100k rows) | Medium | Medium | Enforce max pageSize=100; add composite indexes; consider keyset pagination for contacts in v2 |
| Prisma audit middleware adds latency per mutation | Low | Low | Audit writes are fire-and-forget (async, non-blocking); batch if p99 latency budget exceeded |
| SSO IdP downtime locks out non-admin users | Low | High | email/password fallback for SystemAdmin; document IdP failover procedure |
| S3 presigned URL expiry race condition on slow uploads | Low | Low | 5-minute presign window + confirm step; retry presign if expired |
| PostgreSQL FTS insufficient for advanced search at scale | Medium | Medium | Isolated search module; swap to Elasticsearch with no API changes in v2 |
| Refresh token DB becomes write bottleneck at scale | Low | Medium | Tokens are short-lived; if needed, migrate to Redis for refresh token store in v2 |
| Kubernetes single-node PostgreSQL StatefulSet — not HA | Medium | High | Use managed DB service (RDS/CloudSQL/PGO) for production; StatefulSet is dev/staging only |
| File upload bypasses backend — no server-side virus scan | Medium | Medium | Add S3 event → Lambda/Cloud Function virus scan hook post-upload in v2 |
