# Active Plan
<!-- approved: 2026-06-16 -->
<!-- gate-iterations: 1 -->
<!-- user-approved: true -->
<!-- status: in-progress -->

## Project scaffold — pnpm workspace monorepo with NestJS + React + docker-compose

GitHub Issue: https://github.com/bharanideepan/anticlock-training-assignments/issues/1

## Work Units

### WU-001: pnpm workspace root
- TDD test: pnpm install exits 0 from crm-app-metaswarm/
- Create: package.json (pnpm workspaces), .npmrc, .gitignore, .prettierrc, .prettierignore, .coverage-thresholds.json
- DoD: pnpm install succeeds

### WU-002: Backend skeleton
- TDD test: AppController smoke test — pnpm --filter backend test
- Create: backend/package.json, backend/tsconfig.json, backend/tsconfig.build.json, backend/jest.config.ts, backend/.eslintrc.js, backend/src/main.ts, backend/src/app.module.ts, backend/src/app.controller.ts, backend/src/app.controller.spec.ts, backend/prisma/schema.prisma, backend/Dockerfile
- DoD: pnpm --filter backend build passes, pnpm --filter backend test passes

### WU-003: Backend health + Swagger
- TDD test: GET /health returns 200 { "data": { "status": "ok" } }
- Create: backend/src/health/health.controller.ts, backend/src/health/health.controller.spec.ts
- Modify: backend/src/main.ts (Swagger + HealthController wiring)
- DoD: GET /health returns 200, Swagger accessible at /api/v1/docs

### WU-004: Frontend skeleton
- TDD test: App component renders without crashing (Vitest + RTL)
- Create: frontend/package.json, frontend/tsconfig.json, frontend/tsconfig.node.json, frontend/vite.config.ts, frontend/.eslintrc.cjs, frontend/src/main.tsx, frontend/src/App.tsx, frontend/src/App.test.tsx, frontend/Dockerfile
- DoD: pnpm --filter frontend build passes, pnpm --filter frontend test passes

### WU-005: E2E + docker-compose
- TDD test: Playwright smoke test — app loads at http://localhost:5173
- Create: e2e/package.json, e2e/playwright.config.ts, e2e/tests/smoke.spec.ts, docker-compose.yml
- DoD: docker compose up starts PostgreSQL 16, Playwright smoke test passes

## Full DoD
1. pnpm install from crm-app-metaswarm/ succeeds
2. docker compose up starts PostgreSQL 16
3. pnpm --filter backend build — zero TypeScript errors
4. pnpm --filter frontend build — zero TypeScript errors
5. pnpm --filter backend test passes
6. pnpm --filter frontend test passes
7. Playwright smoke test passes
8. GET /health returns 200
9. Swagger at GET /api/v1/docs accessible
10. ESLint passes in both packages
11. No TypeScript any types
