# Project Context (Maintained by Orchestrator)

## Tooling
- Package manager: pnpm (workspace monorepo)
- Test runner: Jest (`jest.config.js` — rootDir: src, regex: `.*\.spec\.ts$`)
- Integration tests: Jest (`test/jest-e2e.json` — regex: `.integration.spec.ts$`)
- Frontend test runner: Vitest
- Linter: ESLint
- Build: `nest build` (backend), `vite build` (frontend)
- Working dir for all commands: `crm-app-metaswarm/`

## Key Commands
```bash
cd crm-app-metaswarm
pnpm --filter backend test          # unit tests
pnpm --filter backend test:e2e      # integration tests (real PostgreSQL)
pnpm --filter backend test:cov      # coverage
pnpm --filter backend build         # typecheck + build
pnpm --filter frontend test         # vitest
pnpm --filter frontend build        # vite build
```

## Completed Work Units (Auth Module — WU-001 through WU-006)
| WU | Title | Key Files | Notes |
|----|-------|-----------|-------|
| Auth WU-001 | Auth infrastructure | backend/src/auth/*, main.ts | All auth DTOs, module wired |
| Auth WU-002 | Strategies + guards | auth/strategies/*, auth/guards/* | JwtAuthGuard, RolesGuard |
| Auth WU-003 | AuthService | auth.service.ts + spec | AES-256-GCM SSO, manual audit logs |
| Auth WU-004 | AuthController | auth.controller.ts + spec | 12 endpoints |
| Auth WU-005 | Integration tests | test/auth.integration.spec.ts | Real PostgreSQL |
| Auth WU-006 | Frontend auth | frontend/src/context/AuthContext.tsx, pages/auth/* | |

## Users & Teams Module — WU-001 in progress

## Established Patterns
- NestJS module pattern: `@Global()` for shared modules (PrismaModule only)
- ConfigModule: registered globally in AppModule
- PrismaModule: @Global, exports PrismaService — available everywhere without explicit import
- **Audit logging is MANUAL** — `prisma.auditLog.create({ data: { action: AuditAction.XXX, resourceType: 'User', resourceId: id } })` — no middleware
- Response envelope: `{ "data": ... }` for success; paginated: `{ "data": [...], "meta": { total, page, pageSize, totalPages } }`
- Error throwing: `throw new NotFoundException({ code: 'USER_NOT_FOUND', message: '...' })`
- API base: `/api/v1/`
- Soft delete: `deletedAt` nullable DateTime on domain models
- AuthService cross-module: `revokeAllUserTokens(userId)` at auth.service.ts:232; `requestPasswordReset(email)` at auth.service.ts:165 — both exported from AuthModule
- Guards exported from AuthModule: `JwtAuthGuard`, `RolesGuard`
- Decorators: `@CurrentUser()` injects `{ sub, email, role, teamIds }`; `@Roles(...)` sets role metadata
- Prisma User full include: `{ role: true, teamMemberships: { include: { team: true } } }`
- Integration tests: override MAILER_SERVICE with mock transport (see auth.integration.spec.ts)
- Frontend routing: `<Route element={<AuthGuard />}>` wrapping protected routes; RoleGuard nested inside

## Active Services
- PrismaService (global) — database access
- AuthService — JWT, SSO, password reset, profile (exported from AuthModule)
- JwtAuthGuard, RolesGuard (exported from AuthModule)

## File Structure (after Auth module)
```
crm-app-metaswarm/
├── backend/
│   ├── prisma/schema.prisma          # All 17 models (User, Team, TeamMember, Role, etc.)
│   ├── test/jest-e2e.json            # Integration test config (.integration.spec.ts$)
│   │   └── auth.integration.spec.ts  # Auth integration tests (pattern to follow)
│   ├── jest.config.js                # Unit test config
│   └── src/
│       ├── app.module.ts             # Root module (ConfigModule, LoggerModule, PrismaModule, AuthModule)
│       ├── main.ts                   # Bootstrap (ValidationPipe, cookie-parser, ClassSerializer)
│       ├── prisma/                   # PrismaModule (@Global)
│       ├── auth/                     # AuthModule (strategies, guards, DTOs, service, controller)
│       └── health/                   # HealthController
├── frontend/
│   └── src/
│       ├── App.tsx                   # React Router routes
│       ├── api/auth.api.ts           # TanStack Query hooks for auth
│       ├── context/AuthContext.tsx   # Auth state (no global store)
│       ├── guards/AuthGuard.tsx      # Route guard
│       ├── guards/RoleGuard.tsx      # Role-based route guard
│       ├── shared/schemas/auth.schema.ts  # Zod schemas
│       └── pages/auth/              # Login, SSO callback, password reset pages
└── e2e/                              # Playwright
```
