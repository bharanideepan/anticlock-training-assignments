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

## Coverage

Coverage thresholds are defined in `crm-app-metaswarm/.coverage-thresholds.json` — this is the **source of truth**. This is a BLOCKING gate — work units cannot be committed if thresholds are not met.

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
