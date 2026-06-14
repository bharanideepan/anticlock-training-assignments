# Quickstart: Database Seed Validation

**Date**: 2026-06-12 | **Feature**: [spec.md](spec.md)

This guide validates the database seed feature end-to-end. All scenarios map directly to the
spec's Success Criteria (SC-001 through SC-007).

---

## Prerequisites

1. PostgreSQL running and `DATABASE_URL` set in `backend/.env`
2. All Prisma migrations applied:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```
3. Backend dependencies installed:
   ```bash
   npm install
   ```

---

## Running the Seed

```bash
cd backend
npm run seed
```

Expected terminal output (abbreviated):
```
Seeded 5 roles
Seeded 6 users
Seeded 1 team with 2 members
Seeded 6 pipeline stages
Seeded 12 customers
Seeded 22 contacts
Seeded 14 opportunities
Seeded 15 activities
Seeded 12 tasks
Seeded 12 audit log entries
Seeded 18 notifications
Seed completed successfully.
```

The command must exit with code 0. Verify: `echo $?` prints `0`.

---

## SC-001: Seed Completes in Under 30 Seconds

```bash
time npm run seed
```

Expected: `real` time < 30.000s.

---

## SC-002: All 5 Role Accounts Can Log In

Start the backend (`npm run start:dev`), then test each credential pair against `POST /api/v1/auth/login`:

| Email | Password | Expected Response |
|-------|----------|-------------------|
| admin@crm.local | Admin@123 | 200 + `accessToken` |
| manager@crm.local | Manager@123 | 200 + `accessToken` |
| salesrep@crm.local | SalesRep@123 | 200 + `accessToken` |
| support@crm.local | Support@123 | 200 + `accessToken` |
| readonly@crm.local | ReadOnly@123 | 200 + `accessToken` |

Full credentials in [`SEED_CREDENTIALS.md`](../../backend/SEED_CREDENTIALS.md).

---

## SC-003: Pipeline Board Shows Opportunities in 4+ Stages

Log in as `manager@crm.local`, open `GET /api/v1/pipeline/board`.

Expected: Opportunities present in Lead, Qualified, Proposal, Negotiation, Won, and Lost stages
(all 6 stages populated).

---

## SC-004: Dashboard Metrics Are Non-Zero

`GET /api/v1/dashboard` with a valid token.

Expected JSON includes:
- `customers.total` ≥ 12
- `opportunities.count` ≥ 14
- `opportunities.pipelineValue` > 0
- `tasks.open` ≥ 8

---

## SC-005: Audit Log Contains 10+ Searchable Entries

`GET /api/v1/audit?limit=20` logged in as admin.

Expected:
- `total` ≥ 12
- Entries covering `LOGIN`, `RECORD_CREATED`, `RECORD_UPDATED`, `STATUS_CHANGED`

Filter by actor: `GET /api/v1/audit?actorId=<salesrep-id>` returns ≥ 3 entries.

---

## SC-006: Idempotency — Running Twice Produces Identical State

```bash
# Run once
npm run seed

# Capture counts
npx prisma db execute --sql "SELECT 'users' as tbl, COUNT(*) FROM users UNION ALL SELECT 'customers', COUNT(*) FROM customers UNION ALL SELECT 'contacts', COUNT(*) FROM contacts;"

# Run again
npm run seed

# Same query — counts must be identical
npx prisma db execute --sql "SELECT 'users' as tbl, COUNT(*) FROM users UNION ALL SELECT 'customers', COUNT(*) FROM customers UNION ALL SELECT 'contacts', COUNT(*) FROM contacts;"
```

Expected: Both outputs match exactly. The second seed run prints the same log lines and exits 0.

---

## SC-007: Global Search Returns Results

`GET /api/v1/search?q=Acme`

Expected results include:
- At least 1 Customer result (Acme Corporation)
- At least 1 Contact result (Alice Acme or Bob Acme)
- At least 1 Opportunity result (Acme ERP Upgrade or Acme Cloud Migration)

`GET /api/v1/search?q=Beta` returns Beta Logistics customer + Beta contacts + Beta opportunities.

---

## Additional Spot-Checks

### Overdue Tasks (FR-006)

`GET /api/v1/tasks?status=OPEN&overdue=true` — expects ≥ 2 results with `dueDate` in the past.

### RBAC Visibility (User Story 2)

Log in as `salesrep@crm.local`:
- `GET /api/v1/customers` — returns only customers owned by salesrep (4 records)
- `GET /api/v1/audit` — returns 403 Forbidden

Log in as `readonly@crm.local`:
- `POST /api/v1/customers` — returns 403 Forbidden
- `GET /api/v1/customers` — returns empty list (no owned customers)

### Customer Detail Completeness (User Story 4)

`GET /api/v1/customers/<acme-id>/contacts` — ≥ 2 contacts
`GET /api/v1/activities?customerId=<acme-id>` — ≥ 3 activities
`GET /api/v1/opportunities?customerId=<acme-id>` — ≥ 2 opportunities
`GET /api/v1/tasks?customerId=<acme-id>` — ≥ 2 tasks
Files section: empty state (expected — no files seeded)

### Notification Center (User Story 5)

`GET /api/v1/notifications` logged in as any user — ≥ 3 unread notifications present.

Admin audit log: `GET /api/v1/audit` — ≥ 10 entries visible.
