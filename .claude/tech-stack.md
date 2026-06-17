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
