# Quickstart: Frontend E2E Audit

**Feature**: `004-frontend-e2e-audit`

## Prerequisites

| Requirement | Version | Check |
|-------------|---------|-------|
| Node.js | 20 LTS | `node --version` → `v20.x.x` |
| pnpm | latest | `pnpm --version` |
| Backend running | port 3000 | `curl http://localhost:3000/health` → `{"status":"ok"}` |
| Frontend running | port 5173 | `curl -s http://localhost:5173 | head -5` → HTML |
| Database seeded | — | `curl -s -X POST http://localhost:3000/api/v1/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@crm.local","password":"Admin@123"}' | python3 -m json.tool \| grep accessToken` |

## Setup: Install Playwright

Run from `frontend/`:

```bash
cd crm-app/frontend
pnpm add -D @playwright/test
npx playwright install chromium
```

Verify:

```bash
npx playwright --version
# Playwright v1.x.x
```

## Run the Audit

### Full audit (all routes, all roles)

```bash
cd crm-app/frontend
npx playwright test
```

Expected output:
```
Running 30 tests using 1 worker

  ✓ auth › login page renders without errors
  ✓ auth › session restores on page refresh
  ✓ routes › /dashboard renders without console errors (admin)
  ✓ routes › /customers renders without console errors (admin)
  ...
  ✓ modals › notification popover opens without ListItem button warning
  ✓ modals › search results render with ListItemButton (no button prop warning)

30 passed (45s)
```

### Run a single test file

```bash
npx playwright test e2e/tests/routes.spec.ts
```

### Show browser (headed mode for debugging)

```bash
npx playwright test --headed
```

### Show Playwright HTML report

```bash
npx playwright show-report
```

## Expected Audit Results (after fixes)

### Fixes verified by this audit

| Fix | File | Symptom Eliminated |
|-----|------|--------------------|
| `ListItem button` → `ListItemButton` | `NotificationCenter.tsx` | `React does not recognize the 'button' prop` |
| `ListItem button` → `ListItemButton` (×5) | `SearchPage.tsx` | `React does not recognize the 'button' prop` |
| `Grid item xs=…` → `Grid size={{…}}` (×12) | `DashboardPage.tsx` | `React does not recognize the 'xs' prop` / `React does not recognize the 'item' prop` |

### Console baseline after audit

Zero console errors on all routes when logged in as any seeded user role.

## Credentials Reference

See `backend/SEED_CREDENTIALS.md` for the full credential table.

Primary test accounts:
- **Admin** (full access): `admin@crm.local` / `Admin@123`
- **Sales Rep** (restricted): `salesrep@crm.local` / `SalesRep@123`

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| `Error: browserType.launch: Executable doesn't exist` | Playwright browsers not installed | `npx playwright install chromium` |
| `ERR_CONNECTION_REFUSED` on `localhost:5173` | Vite dev server not running | `pnpm dev` from `frontend/` |
| `ERR_CONNECTION_REFUSED` on `localhost:3000` | Backend not running | Start backend: `pnpm start:dev` from `backend/` |
| Auth fails (401) | Database not seeded | `cd backend && npm run seed` |
| Session not restoring | httpOnly `crm_refresh` cookie not set | Confirm backend returns `Set-Cookie: crm_refresh=…` on login |
