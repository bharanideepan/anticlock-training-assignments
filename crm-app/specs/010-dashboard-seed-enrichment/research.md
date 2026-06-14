# Research: Dashboard Seed Enrichment

**Date**: 2026-06-14

No NEEDS CLARIFICATION items were present in the spec. This document records confirmed implementation facts derived from reading `dashboard.service.ts`.

---

## Decision 1: Activity Trend Query Window

**Decision**: Seed activities with `scheduledAt` spanning the last **30 days** (not 14).

**Rationale**: `DashboardService.getActivityTrend(days = 30)` defaults to 30 days. The frontend `useActivityTrend(days = 30)` also defaults to 30. The `ActivityTrendChart` component calls this hook without overriding the default. One activity per day × 30 days ensures a fully populated chart.

**Alternatives considered**: Seeding 14 days (based on the chart title "Activity Trend — 14 Days"). Rejected because the API and hook both default to 30, and the service renders 30 day labels regardless of the UI title.

---

## Decision 2: "New This Month" Does NOT Need Extra Customers

**Decision**: No new customers need to be seeded for the "New This Month" card.

**Rationale**: The service queries `customer.createdAt` between month start and month end. Because Prisma defaults `createdAt` to `now()`, all 12 existing customers were created when the seed first ran. If re-seeding in June (first time), all 12 customers get `createdAt = June 2026` and all 12 show as "new this month". This card is already non-zero after any fresh seed.

**Alternatives considered**: Adding 3 explicitly-dated customers. Rejected as unnecessary — the existing data already satisfies SC-001 for this card.

---

## Decision 3: Won Opportunities — Month Coverage via Relative Helpers

**Decision**: Add helper functions `monthStart(monthsAgo)` and `monthEnd(monthsAgo)` to the seed to generate month-boundary dates at runtime.

**Rationale**: Hardcoded calendar months (e.g., `new Date('2026-01-15')`) cause the seed to produce stale data when run months later. Using `new Date(now.getFullYear(), now.getMonth() - N, 15)` generates a date 15 days into the month that is N months before the current month, regardless of run date.

**Alternatives considered**: Hardcoding 6 specific months (e.g., Jan–Jun 2026). Rejected because the seed would need to be updated every month to remain useful.

---

## Decision 4: Team Performance Activities Use `createdAt`, Not `scheduledAt`

**Decision**: New activities added for Team Performance must be inserted by the seed (so Prisma defaults `createdAt` to now), not given a historical `createdAt` value.

**Rationale**: `getTeamPerformance()` queries `activity.createdAt >= periodStart` — it counts when the activity record was logged, not when the meeting/call occurred. The 30 new activities added for the Activity Trend (using relative `scheduledAt`) will be inserted fresh each first-time seed run, so their `createdAt` will be the seed run date. As long as the seed runs in June, the June activities have `createdAt` in June and count for Team Performance.

**Alternatives considered**: Setting `createdAt` explicitly on new activities. Rejected because Prisma schema uses `@default(now())` and does not expose `createdAt` as a writable field in the activity model without raw queries.

---

## Decision 5: Won Opportunities — Minimum 6 New Records

**Decision**: Add 6 new won opportunities, one per month for months 5, 4, 3, 2, 1, and 0 months ago (i.e., the 6 most recent months ending with the current month).

**Rationale**: The existing seed has won opportunities only in March 2026 (Acme Cloud Migration, `actualCloseDate: 2026-03-01`) and April 2026 (Mu Data Platform, `actualCloseDate: 2026-04-15`). Months 1 (January), 2 (February), 5 (May), and 6 (June) are missing. The 6-month Revenue Trend needs non-zero bars in at least 4 months.

**New records needed**:
- 5 months ago (January 2026) — new won deal
- 4 months ago (February 2026) — new won deal  
- 3 months ago (March 2026) — ALREADY EXISTS (Acme Cloud Migration)
- 2 months ago (April 2026) — ALREADY EXISTS (Mu Data Platform)
- 1 month ago (May 2026) — new won deal
- 0 months ago (June 2026, current) — 2 new won deals (for "Won This Month" ≥ 2)

Total new won opportunities: 4 (one each for Jan, Feb, May) + 2 (June) = 6 additional records.

---

## Decision 6: Forecast Revenue — Use `expectedCloseDate` on Existing Open Opps

**Decision**: Set `expectedCloseDate` on the 10 existing open opportunities to spread across the 6-month window.

**Rationale**: `getRevenueTrend()` forecasts revenue from open opportunities with `expectedCloseDate` falling in each month. None of the existing 10 open opportunities have an `expectedCloseDate` set (it's not in the current seed). By updating the existing opportunity `upsert` logic (or adding `expectedCloseDate` to their definition), forecast revenue bars will appear.

**Implementation approach**: Change the idempotent check for open opportunities from `findFirst` + skip to `upsert` with `update: { expectedCloseDate }`, OR add `expectedCloseDate` to the initial `create` data object (so it only applies to fresh seeds). Since the existing seed uses `findFirst → skip if exists`, the cleanest fix is to add `expectedCloseDate` to the create data for the 10 existing opportunities so new seeds get it, and add a separate `update` pass for already-seeded opportunities.

---

## Confirmed Query Windows Summary

| Chart / Card | Field Queried | Window |
|---|---|---|
| Activity Trend | `activity.scheduledAt` | last 30 days from now |
| Team Performance Activities | `activity.createdAt` | current calendar month |
| Team Performance Tasks | `task.completedAt` | current calendar month |
| Won This Month | `opportunity.actualCloseDate` + stage WON | current calendar month |
| Revenue Trend (won) | `opportunity.actualCloseDate` + stage WON | per month × 6 months |
| Revenue Trend (forecast) | `opportunity.expectedCloseDate` + open | per month × 6 months |
| New Customers | `customer.createdAt` | current calendar month |
| Pipeline Funnel | active opportunities | current state (no date filter) |
