## Code Quality

- TypeScript strict mode, no `any` types (both backend and frontend)
- ESLint + Prettier enforced
- No hard deletes in normal operations (soft delete via `deletedAt`)
- No client-side visibility filtering — always enforce server-side
- All datetimes stored in UTC
- Max `pageSize` 100 — no unbounded queries

## Key Architectural Decisions

### API
- **Base URL**: `/api/v1/`
- **Response envelope**: `{ "data": ... }` for success, `{ "error": { code, message } }` for errors
- **Pagination**: `{ "data": [...], "meta": { total, page, pageSize, totalPages } }`

### Backend
- **Modular monolith**: Each domain is a self-contained NestJS module — no shared singletons across domain boundaries
- **Soft delete**: Prisma client extension auto-appends `WHERE deletedAt IS NULL` to all queries
- **Audit logging**: Prisma middleware intercepts create/update/delete; actor propagated via `AsyncLocalStorage` set in `JwtAuthGuard` — do not manually thread actor through service layers
- **RBAC**: `RolesGuard` checks `@Roles()` decorator; `VisibilityGuard` builds team-scoped Prisma `where` clause — injected into every list/find query
- **Full-text search**: PostgreSQL `tsvector` + GIN index on customers, contacts, opportunities — updated via PostgreSQL triggers

### Frontend
- **No global state store**: TanStack Query manages all server state; auth state in React context only
- **Shared Zod schemas**: `frontend/src/shared/schemas/` is single source of truth for field shapes — used by both form validation and API type definitions
- **File upload flow**: Presigned S3 POST URL → direct browser-to-S3 upload → confirm endpoint (files bypass backend entirely)
- **Notifications**: Poll every 30s via `GET /api/v1/notifications?unreadOnly=true`; SSE stream available (60s timeout, client reconnects)

### Auth
- Email/password login is **SYSTEM_ADMINISTRATOR only** — all other users authenticate via SSO (SAML 2.0 / OIDC)
- Refresh token delivered in `httpOnly; Secure; SameSite=Strict` cookie named `crm_refresh`
- Refresh token rotated on every use (7-day TTL)
