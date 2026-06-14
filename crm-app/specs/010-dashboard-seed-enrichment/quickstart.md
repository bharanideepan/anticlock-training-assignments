# Quickstart: Dashboard Seed Enrichment Validation

**Feature**: Dashboard Seed Enrichment (`010-dashboard-seed-enrichment`)
**Target file**: `backend/prisma/seed.ts`

---

## Prerequisites

- Docker Compose running (`docker compose up -d`)
- Backend dependencies installed (`cd backend && pnpm install`)
- Database migrations applied (`pnpm prisma migrate dev`)
- No previous seed data required — seed is idempotent

---

## Step 1: Run the Seed

```bash
cd backend
pnpm seed
```

**Expected output** (no errors, exits 0):

```
Seeding users...
Seeding customers...
...
Seeding activities (30 relative-date)... ✓
Seeding won opportunities (6 new)... ✓
Seeding completed tasks (4 this month)... ✓
Seeding expectedCloseDate on open opportunities... ✓
Seed complete.
```

Seed must complete in under 30 seconds.

---

## Step 2: Open the Dashboard

1. Start frontend: `cd frontend && pnpm dev`
2. Navigate to `http://localhost:5173`
3. Log in as admin: `admin@crm.dev` / `Admin123!`

---

## Step 3: Verify Metric Cards

All 8 cards in the top row must show non-zero values:

| Card | Expected Minimum |
|---|---|
| Total Customers | ≥ 12 |
| New This Month | ≥ 3 |
| Active Opps | ≥ 8 |
| Won This Month | ≥ 2 |
| Pipeline Value | > $500,000 |
| Revenue Forecast | > $100,000 |
| Open Tasks | ≥ 6 |
| Overdue Tasks | ≥ 2 |

---

## Step 4: Verify Activity Trend Chart

Chart title: **Activity Trend — 14 Days** (or 30 days depending on view)

- At least 10 of 14 visible days show a non-zero bar/line
- All 5 activity types (Phone Call, Meeting, Email, Note, Follow-Up) appear at least once across the window
- Chart is NOT a flat zero line

---

## Step 5: Verify Revenue Trend Chart

Chart title: **Revenue Trend — 6 Months**

- At least 4 of the 6 month columns show non-zero **Won Revenue** (solid/filled bar)
- All 6 months show non-zero **Forecast Revenue** (lighter/outline bar)
- Chart shows visible variation (not a single spike)

---

## Step 6: Verify Team Performance Table

Switch to Sales Manager role: `manager@crm.dev` / `Manager123!`

- At least 2 sales rep rows show ≥ 1 activity logged this month
- At least 1 rep shows ≥ 1 won opportunity this month
- At least 1 rep shows ≥ 1 task completed this month

---

## Step 7: Idempotency Check

Re-run the seed immediately:

```bash
pnpm seed
```

- Seed must complete without errors
- All metric card values must be identical to Step 3 (no duplicates)

---

## Validation Summary

| Scenario | Pass Condition |
|---|---|
| SC-001: All metric cards non-zero | All 8 cards show values ≥ expected minimum |
| SC-002: Activity Trend populated | ≥ 10 of 14 days have data |
| SC-003: Revenue Trend 4+ months | ≥ 4 of 6 months have non-zero won revenue |
| SC-004: Team Performance activities | ≥ 2 reps show ≥ 1 activity this month |
| SC-005: Seed idempotent | Re-run produces no errors, no duplicate records |
| SC-006: Any run month | Re-running in a different month still produces populated dashboard |
