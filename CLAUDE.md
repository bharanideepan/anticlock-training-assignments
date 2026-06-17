# Enterprise CRM Platform — Claude Code Instructions

## Behavioral Guidelines

These apply to all work in this project. Bias toward caution over speed — for trivial tasks, use judgment.

### 1. Think Before Coding

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

Touch only what you must. Clean up only your own mess.

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that **your** changes made unused.
- Don't remove pre-existing dead code unless asked.

Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

---


This project uses [metaswarm](https://github.com/dsifry/metaswarm), a multi-agent orchestration framework for Claude Code. It provides 18 specialized agents, a 9-phase development workflow, and quality gates that enforce TDD, coverage thresholds, and spec-driven development.

## Project Layout

```
anti-clock-training/              [GIT ROOT]
└── crm-app-metaswarm/            [THE PROJECT — specs + implementation]
    ├── product-specs/            # Read before implementing any feature
    │   ├── 00-overview.md
    │   ├── 01-architecture.md
    │   ├── 02-data-model.md
    │   ├── 03-design-system.md
    │   ├── 04-api-conventions.md
    │   └── modules/              # 14 module specs (01-auth.md … 14-import-export.md)
    ├── backend/                  # NestJS 10, Prisma 5, PostgreSQL 16
    ├── frontend/                 # React 19, Vite 5, MUI v6
    ├── e2e/                      # Playwright E2E tests
    └── docker-compose.yml
```

**All implementation work happens inside `crm-app-metaswarm/`.** Agents working in worktrees must `cd crm-app-metaswarm/` before running any build, test, or migration commands.

**Read specs before implementing any feature.** Order: `00-overview.md` → `01-architecture.md` → `02-data-model.md` → `04-api-conventions.md` → the relevant module spec in `modules/`.

---

## Project Overview

Full-featured enterprise CRM: customers, contacts, sales opportunities, tasks, activities, reporting, and team collaboration. REST API (NestJS) + React SPA + PostgreSQL.

---

## Tech Stack

### Backend (`crm-app-metaswarm/backend/`)
- **Runtime**: Node.js 20 LTS
- **Framework**: NestJS 10 (modular monolith — one NestJS module per domain)
- **ORM**: Prisma 5 with client extensions (soft-delete + audit middleware)
- **Database**: PostgreSQL 16
- **Auth**: Passport.js — JWT (HS256, 15-min access / 7-day refresh) + SAML 2.0 + OIDC
- **Validation**: `class-validator` + `class-transformer` + Zod (complex query params)
- **Logging**: Pino (structured JSON, request-level tracing)
- **API docs**: `@nestjs/swagger` at `/api/v1/docs`
- **File storage**: S3-compatible via presigned URLs (files bypass backend)

### Frontend (`crm-app-metaswarm/frontend/`)
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
cd crm-app-metaswarm/backend
pnpm test                    # unit tests (Prisma mocked)
pnpm test:e2e                # integration tests (real PostgreSQL)
pnpm test:cov                # coverage report
```

**Frontend (Vitest + React Testing Library):**
```bash
cd crm-app-metaswarm/frontend
pnpm test                    # unit + component tests
pnpm test:coverage           # coverage report
```

**E2E (Playwright — critical user journeys):**
```bash
cd crm-app-metaswarm/e2e
pnpm exec playwright test
```

**All layers from project root:**
```bash
cd crm-app-metaswarm
pnpm --filter backend test
pnpm --filter frontend test
```

### Integration Test Notes
- Backend integration tests run against a **real PostgreSQL test database** — no mocks
- Prisma is mocked only in backend unit tests (services, guards, pipes, interceptors)
- Do not introduce database mocks in integration tests

---

## Coverage

Coverage thresholds are defined in `crm-app-metaswarm/.coverage-thresholds.json` — this is the **source of truth**. This is a BLOCKING gate — work units cannot be committed if thresholds are not met.

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
- **ALWAYS** `cd crm-app-metaswarm/` before running build/test/migration commands

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
- **Shared Zod schemas**: `frontend/src/shared/schemas/` is single source of truth for field shapes — used by both form validation and API type definitions
- **File upload flow**: Presigned S3 POST URL → direct browser-to-S3 upload → confirm endpoint (files bypass backend entirely)
- **Notifications**: Poll every 30s via `GET /api/v1/notifications?unreadOnly=true`; SSE stream available (60s timeout, client reconnects)

### Auth
- Email/password login is **SYSTEM_ADMINISTRATOR only** — all other users authenticate via SSO (SAML 2.0 / OIDC)
- Refresh token delivered in `httpOnly; Secure; SameSite=Strict` cookie named `crm_refresh`
- Refresh token rotated on every use (7-day TTL)

---

## Domain Modules (14 total)

Spec files in `crm-app-metaswarm/product-specs/modules/`.

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

- **No automatic account lockout** on failed logins — logged to AuditLog for admin review
- **AuditLog is append-only** — never soft-deleted, never updated
- **Pipeline stages**: 6 seeded defaults (Lead → Qualified → Proposal → Negotiation → Won → Lost); Won and Lost are terminal and cannot be edited
- **Performance targets**: Dashboard < 2s; list pages (10k records) < 3s; global search < 2s; CSV export (12 months) < 30s; 1k concurrent users without degradation
- **SSO only for non-admin users** — email/password login for SYSTEM_ADMINISTRATOR only
- **No mobile support in v1** — desktop and tablet only (≥1280px desktop, 768–1279px tablet)
