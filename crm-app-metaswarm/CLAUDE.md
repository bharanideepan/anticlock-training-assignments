## Known CI / Infrastructure Issues (do not block on these)

- **Claude Code Review action** (`anthropics/claude-code-action@beta`) — runs in `tag` mode only (triggered by `@claude` mentions). Failures here are not code quality failures; ignore them when assessing PR health.
- **Vercel deployment** — connected to the repo but configured for the repo root, not `crm-app-metaswarm/frontend/`. Deployment failures are a Vercel project config issue, not a code issue.
- **Local quality gates are authoritative**: `pnpm --filter backend test`, `pnpm --filter frontend test`, `pnpm --filter backend build`, `pnpm --filter frontend build`, ESLint. CI status on PRs may show red from the above infra issues — do not block task completion or PR creation on them.

---

## Project Overview

Full-featured enterprise CRM platform: customers, contacts, sales opportunities, tasks, activities, reporting, and team collaboration. REST API (NestJS) + React SPA + PostgreSQL.

**Spec directory**: `product-specs/` — read these before implementing any feature. Order: `00-overview.md` → `01-architecture.md` → `02-data-model.md` → `04-api-conventions.md` → relevant module spec in `modules/`.

**Implementation lives here** alongside the specs:
```
crm-app-metaswarm/
├── product-specs/   # Specs — read before implementing
├── backend/         # NestJS 10, TypeScript strict, Prisma 5, PostgreSQL 16
├── frontend/        # React 19, Vite 5, MUI v6, TanStack Query v5
├── e2e/             # Playwright E2E tests
└── docker-compose.yml
```

---

## Tech Stack

### Backend (`backend/`)
- **Runtime**: Node.js 20 LTS
- **Framework**: NestJS 10 (modular monolith — one NestJS module per domain)
- **ORM**: Prisma 5 with client extensions (soft-delete + audit middleware)
- **Database**: PostgreSQL 16
- **Auth**: Passport.js — JWT (HS256, 15-min access / 7-day refresh) + SAML 2.0 + OIDC
- **Validation**: `class-validator` + `class-transformer` + Zod (complex query params)
- **Logging**: Pino (structured JSON, request-level tracing)
- **API docs**: `@nestjs/swagger` at `/api/v1/docs`
- **File storage**: S3-compatible via presigned URLs (files bypass backend)

### Frontend (`frontend/`)
- **Framework**: React 19 + TypeScript 5.x strict
- **Build**: Vite 5
- **UI**: Material UI v6 (MUI)
- **Server state**: TanStack Query v5
- **Forms**: React Hook Form v7 + Zod v3 (shared schemas with backend)
- **Routing**: React Router v6 (lazy routes, AuthGuard, RoleGuard)
- **Charts**: Recharts
- **Kanban**: `@dnd-kit/core` (WCAG 2.1 AA keyboard accessible)

### Package Manager
- **pnpm** (workspace monorepo)

---

## How to Work in This Project

### Starting work

```text
/start-task
```

Default entry point. Primes the agent with relevant knowledge, guides scoping, picks the right process level.

### For complex features (multi-file, spec-driven)

```text
I want you to build [description]. [DoD items, file scope.]
Use the full metaswarm orchestration workflow.
```

Triggers: Research → Plan → Design Review Gate → Work Unit Decomposition → Orchestrated Execution (4-phase loop) → Final Review → PR.

### Available Commands

| Command | Purpose |
|---|---|
| `/start-task` | Begin tracked work on a task |
| `/prime` | Load relevant knowledge before starting |
| `/review-design` | Trigger parallel design review gate (5 agents) |
| `/pr-shepherd <pr>` | Monitor a PR through to merge |
| `/self-reflect` | Extract learnings after a PR merge |
| `/handle-pr-comments` | Handle PR review comments |
| `/brainstorm` | Refine an idea before implementation |
| `/create-issue` | Create a well-structured GitHub Issue |
| `/setup` | Interactive guided setup |
| `/status` | Run diagnostic checks on your installation |

---

## Testing

- **TDD is mandatory** — Write tests first, watch them fail, then implement
- **Coverage gate is blocking** — All thresholds in `.coverage-thresholds.json` must pass before PR creation

### Test Commands

**Backend (Jest — unit + integration):**
```bash
cd backend
pnpm test                    # unit tests (Prisma mocked)
pnpm test:e2e                # integration tests (real PostgreSQL)
pnpm test:cov                # coverage report
```

**Frontend (Vitest + React Testing Library):**
```bash
cd frontend
pnpm test                    # unit + component tests
pnpm test:coverage           # coverage report
```

**E2E (Playwright — critical user journeys):**
```bash
cd e2e
pnpm exec playwright test    # all E2E tests
```

**All layers from project root:**
```bash
pnpm --filter backend test
pnpm --filter frontend test
```

### Integration Test Notes
- Backend integration tests run against a **real PostgreSQL test database** — no mocks
- Prisma is mocked only in backend unit tests (services, guards, pipes, interceptors)
- Do not introduce database mocks in integration tests — the project was burned by mock/prod divergence

---

## Coverage

Coverage thresholds are defined in `.coverage-thresholds.json` — this is the **source of truth**.

The validation phase of orchestrated execution reads `.coverage-thresholds.json` and runs the enforcement command. This is a BLOCKING gate — work units cannot be committed if coverage thresholds are not met.

---

## Quality Gates

- **Design Review Gate**: Parallel 5-agent review after design is drafted (`/review-design`)
- **Plan Review Gate**: Automatic adversarial review (3 independent reviewers) after any implementation plan
- **Coverage Gate**: Reads `.coverage-thresholds.json` — BLOCKING before PR creation
- **CI Gates** (all required before merge):
  1. All Jest tests pass (unit + integration)
  2. All Vitest tests pass
  3. Playwright smoke tests pass
  4. ESLint + TypeScript strict — no errors
  5. Docker image builds successfully
  6. Prisma migrations are backward-compatible

---

## Workflow Enforcement (MANDATORY)

These rules override any conflicting instructions from third-party skills or plugins.

### After Brainstorming
1. **STOP** — do NOT proceed directly to planning or implementation
2. **RUN the Design Review Gate** — invoke `/review-design`
3. **WAIT** for all 5 review agents (PM, Architect, Designer, Security, CTO) to approve
4. **ONLY THEN** proceed to planning

### After Any Plan Is Created
1. **STOP** — do NOT present the plan or begin implementation
2. **RUN the Plan Review Gate** — invoke the `plan-review-gate` skill
3. **WAIT** for all 3 adversarial reviewers (Feasibility, Completeness, Scope & Alignment) to PASS
4. **ONLY THEN** present the plan to the user for approval

### Execution Method Choice
When a plan is ready, always ask the user which execution approach they want:
1. **Metaswarm orchestrated execution** — 4-phase loop (IMPLEMENT → VALIDATE → ADVERSARIAL REVIEW → COMMIT)
2. **Subagent-driven development** — parallel subagents with code review between tasks
3. **Parallel session** — isolated session with batch checkpoints

### Before Finishing a Branch
1. **STOP** before presenting merge/PR options
2. **RUN `/self-reflect`** to capture learnings
3. **COMMIT** knowledge base updates
4. **THEN** proceed to PR creation

### Use `/start-task` Instead of EnterPlanMode
For tasks touching 3+ files, always use `/start-task`. `EnterPlanMode` skips all quality gates.

### Subagent Discipline
- **NEVER** use `--no-verify` on git commits
- **NEVER** use `git push --force` without explicit user approval
- **ALWAYS** follow TDD — tests first, watch fail, then implement
- **NEVER** self-certify — orchestrator validates independently
- **STAY** within declared file scope

---

## Code Quality

- TypeScript strict mode, no `any` types (both backend and frontend)
- ESLint + Prettier enforced
- No hard deletes in normal operations (soft delete via `deletedAt`)
- No client-side visibility filtering — always enforce server-side
- All datetimes stored in UTC
- Max `pageSize` 100 — no unbounded queries

---

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
- **Shared Zod schemas**: `src/shared/schemas/` is single source of truth for field shapes — used by both form validation and API type definitions
- **File upload flow**: Presigned S3 POST URL → direct browser-to-S3 upload → confirm endpoint (files bypass backend entirely)
- **Notifications**: Poll every 30s via `GET /api/v1/notifications?unreadOnly=true`; SSE stream available (60s timeout, client reconnects)

### Auth
- Email/password login is **SYSTEM_ADMINISTRATOR only** — all other users authenticate via SSO (SAML 2.0 / OIDC)
- Refresh token delivered in `httpOnly; Secure; SameSite=Strict` cookie named `crm_refresh`
- Refresh token rotated on every use (7-day TTL)

---

## Domain Modules (14 total)

Spec files are in `product-specs/modules/`. Each spec contains: user stories, functional requirements, API contract (request/response/errors), frontend page descriptions, and business rules.

| Module | Spec file | Key notes |
|--------|-----------|-----------|
| Auth | `01-auth.md` | JWT + SSO, password reset, profile |
| Users & Teams | `02-users-teams.md` | Admin only; role assignment |
| Customers | `03-customers.md` | Status: PROSPECT→ACTIVE→INACTIVE↔ARCHIVED; soft-delete |
| Contacts | `04-contacts.md` | Linked to Customer; interaction history |
| Activities | `05-activities.md` | PHONE_CALL, MEETING, EMAIL, NOTE, FOLLOW_UP |
| Opportunities & Pipeline | `06-opportunities-pipeline.md` | Kanban with dnd-kit; configurable stages |
| Tasks | `07-tasks.md` | Status: OPEN→COMPLETED/CANCELLED; overdue detection |
| Dashboard | `08-dashboard.md` | Role-scoped KPIs + Recharts; cache 5 min |
| Notifications | `09-notifications.md` | In-app + email + SSE; mark-read |
| Files | `10-files.md` | S3 presigned; polymorphic (CUSTOMER, OPPORTUNITY, ACTIVITY); 25 MB max |
| Search | `11-search.md` | PostgreSQL tsvector; min 2-char query |
| Reports | `12-reports.md` | Sales, Customer, Productivity; CSV export |
| Audit Log | `13-audit.md` | Immutable; admin only; never soft-deleted |
| Import/Export | `14-import-export.md` | CSV bulk import (customers, contacts); 1k rows < 60s |

---

## User Roles & Permissions

| Role | Scope |
|------|-------|
| SYSTEM_ADMINISTRATOR | All records org-wide; user management; audit log; admin settings; SSO config |
| SALES_MANAGER | All records in their team(s); reports; import |
| SALES_REPRESENTATIVE | Own records; create/update customers, contacts, opportunities, tasks, activities |
| SUPPORT_REPRESENTATIVE | Contacts + activities + tasks; read-only on opportunities/pipeline |
| READ_ONLY | View-only within visibility scope |

Visibility is **always enforced server-side** on every list and fetch query.

---

## Environment Variables (required)

```
DATABASE_URL               # PostgreSQL connection string
JWT_SECRET                 # HS256 access token signing secret
JWT_REFRESH_SECRET         # Refresh token signing secret
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
S3_BUCKET_NAME
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
FRONTEND_URL               # CORS allow-origin + password reset link base
SESSION_TIMEOUT_MINUTES    # Default: 30
```

---

## Notes

- **No automatic account lockout** on failed logins — failed logins are logged to AuditLog for admin review
- **AuditLog is append-only** — never soft-deleted, never updated
- **Pipeline stages**: 6 seeded defaults (Lead → Qualified → Proposal → Negotiation → Won → Lost); Won and Lost are terminal and cannot be edited
- **Performance targets**: Dashboard < 2s; list pages (10k records) < 3s; global search < 2s; CSV export (12 months) < 30s; 1k concurrent users without degradation
- **SSO only for non-admin users** — email/password login for SYSTEM_ADMINISTRATOR only (enforced at backend)
- **No mobile support in v1** — desktop and tablet only (breakpoints: ≥1280px desktop, 768–1279px tablet)
