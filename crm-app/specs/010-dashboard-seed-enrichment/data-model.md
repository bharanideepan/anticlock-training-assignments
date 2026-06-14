# Data Model: Dashboard Seed Enrichment

**Feature**: Dashboard Seed Enrichment
**Branch**: `010-dashboard-seed-enrichment`

No schema changes. This feature adds data records only. The Prisma schema is unchanged.

---

## Enriched Entities

### Activity (30 new records)

Existing model fields used:

| Field | Type | Seed Value |
|---|---|---|
| `type` | Enum: PHONE_CALL, MEETING, EMAIL, NOTE, FOLLOW_UP | Cycled in order across 30 records |
| `scheduledAt` | DateTime | `now() - N days` where N = 0..29 (one per day) |
| `customerId` | Int FK | Rotated across 3 existing customers |
| `contactId` | Int FK? | Rotated across existing contacts (optional) |
| `userId` | Int FK | Rotated across 3 sales rep users |
| `subject` | String | Auto-generated label per type |
| `notes` | String? | Auto-generated description |
| `createdAt` | DateTime | Prisma default `now()` — set by DB at insert time |

**Idempotency key**: composite `(subject, scheduledAt, userId)` — skip if matching record exists.

**Why**: `getActivityTrend(days=30)` queries `scheduledAt >= now - 30d`. These 30 records guarantee a non-zero bar for every day in the 30-day window.

---

### Opportunity (6 new won records + expectedCloseDate on 4 open records)

#### 6 New Won Opportunities

| Field | Type | Seed Value |
|---|---|---|
| `name` | String | Unique name per month (e.g., "Q2 Enterprise Deal — Jan") |
| `stage` | Enum | WON |
| `actualCloseDate` | DateTime | 15th of each target month (relative: `monthsAgo(N)`) |
| `expectedRevenue` | Decimal | Varied: $25k–$350k |
| `customerId` | Int FK | Rotated across existing customers |
| `userId` | Int FK | Rotated across sales reps |
| `probability` | Int | 100 |

**Target months** (relative to seed run date):
- 5 months ago — 1 new record
- 4 months ago — 1 new record
- 3 months ago — already covered (Acme Cloud Migration)
- 2 months ago — already covered (Mu Data Platform)
- 1 month ago — 1 new record
- 0 months ago (current) — 2 new records

**Idempotency key**: `name` — skip if matching record exists.

#### 4 Open Opportunities with `expectedCloseDate`

The 10 existing open opportunities currently have no `expectedCloseDate`. 4 of them will have `expectedCloseDate` added (spread across months -2 through +3 relative to now) so `getRevenueTrend()` forecast bars are non-zero.

**Update strategy**: Separate `upsert` pass on known opportunity names — sets `expectedCloseDate` on existing records.

---

### Task (4 new completed records)

| Field | Type | Seed Value |
|---|---|---|
| `title` | String | Unique label per task |
| `status` | Enum | COMPLETED |
| `completedAt` | DateTime | Current month, days 1–4 |
| `dueDate` | DateTime | Same as `completedAt` |
| `customerId` | Int FK | Rotated across existing customers |
| `userId` | Int FK | Rotated across 2 sales rep users |

**Idempotency key**: `title` — skip if matching record exists.

**Why**: `getTeamPerformance()` queries `completedAt >= periodStart` for the current calendar month.

---

## Relationships Used (Unchanged)

```
User ──< Activity
User ──< Opportunity
User ──< Task
Customer ──< Activity
Customer ──< Opportunity
Customer ──< Task
Contact ──< Activity (optional FK)
```

All foreign keys reference records already created by the existing seed (002-database-seed). No new customers, contacts, users, or pipeline stages are created.

---

## Helper Functions (Seed Script Only)

These are TypeScript helpers added to `seed.ts` — not schema entities:

| Helper | Returns | Purpose |
|---|---|---|
| `past(days)` | `Date` | `now() - days * 86400000` |
| `monthStart(monthsAgo)` | `Date` | First day of target month |
| `monthEnd(monthsAgo)` | `Date` | Last day of target month |
| `monthMid(monthsAgo)` | `Date` | 15th of target month |
