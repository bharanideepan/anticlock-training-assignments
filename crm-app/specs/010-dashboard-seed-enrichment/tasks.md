# Tasks: Dashboard Seed Enrichment

**Input**: Design documents from `specs/010-dashboard-seed-enrichment/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Not requested — manual dashboard verification per quickstart.md is the validation approach.

**Organization**: Tasks are grouped by user story. All changes land in one file (`backend/prisma/seed.ts`), so tasks are sequential (no [P] markers — same file cannot be edited in parallel).

## Format: `[ID] [Story] Description`

- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- All tasks target `backend/prisma/seed.ts` unless otherwise noted

## Path Conventions

- **Backend seed script**: `backend/prisma/seed.ts`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add date helper utilities that all subsequent seed phases depend on

- [x] T001 Add date helper functions `past(days)`, `monthMid(monthsAgo)`, `monthStart(monthsAgo)`, `monthEnd(monthsAgo)` at the top of `backend/prisma/seed.ts` (after imports, before the main function). `past(N)` returns `new Date(Date.now() - N * 86400000)`. `monthMid(N)` returns the 15th of the month N months before now. These helpers eliminate hardcoded calendar dates.

**Checkpoint**: Helper functions defined and TypeScript compiles — run `pnpm prisma generate` in `backend/` to verify no type errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No schema changes or new dependencies needed. Phase 2 is satisfied by Phase 1 completion.

**⚠️ CRITICAL**: Helpers from Phase 1 MUST be in place before any seed phase below can be written.

---

## Phase 3: User Story 1 — Dashboard Metrics All Show Non-Zero Values (Priority: P1) 🎯 MVP

**Goal**: All 8 metric cards show values greater than zero after seeding

**Independent Test**: Run `pnpm seed`, open dashboard as admin, verify all 8 cards are non-zero. Key cards to check: "Won This Month" ≥ 2, "Revenue Forecast" > $100,000.

### Implementation for User Story 1

- [x] T002 [US1] Add seed phase "Won Opportunities — Current Month" in `backend/prisma/seed.ts`: insert 2 won opportunities with `stage: 'WON'`, `actualCloseDate: monthMid(0)`, `probability: 100`, linked to 2 different existing customers (e.g., Acme Corp, TechStart Inc), owned by 2 different sales rep users. Use `findFirst` + skip-if-exists idempotency keyed on `name`.

- [x] T003 [US1] Add seed phase "Expected Close Dates — Open Opportunities" in `backend/prisma/seed.ts`: update `expectedCloseDate` on 4 existing open opportunities (by name lookup) spreading them across months -2 to +3 relative to now. Use `updateMany` or named `update` calls. This populates the Revenue Forecast metric card and forecast bars in Revenue Trend.

**Checkpoint**: Run `pnpm seed`, open dashboard. "Won This Month" card shows ≥ 2 and "Revenue Forecast" card shows > $0.

---

## Phase 4: User Story 2 — Activity Trend Chart Populated (Priority: P1)

**Goal**: Activity Trend chart shows at least 1 data point per day across the 30-day window

**Independent Test**: Run `pnpm seed`, open dashboard, verify Activity Trend chart has visible bars/lines on at least 10 of the visible days and all 5 activity types appear.

### Implementation for User Story 2

- [x] T004 [US2] Add seed phase "Relative-Date Activities" in `backend/prisma/seed.ts`: insert 30 activities, one per day for days 0–29 ago using `scheduledAt: past(i)`. Cycle through all 5 types: `['PHONE_CALL', 'MEETING', 'EMAIL', 'NOTE', 'FOLLOW_UP']` using `types[i % 5]`. Rotate `userId` across 3 sales rep users and `customerId` across 3 existing customers. Use `findFirst` + skip-if-exists keyed on `(subject, userId, scheduledAt date string)` to ensure idempotency.

**Checkpoint**: Run `pnpm seed`, open dashboard. Activity Trend chart shows non-zero bars across multiple days and at least 3 different activity types are visible.

---

## Phase 5: User Story 3 — Revenue Trend Shows 6-Month Growth Pattern (Priority: P2)

**Goal**: Revenue Trend chart shows non-zero won revenue in at least 4 of the last 6 months

**Independent Test**: Run `pnpm seed`, open dashboard Revenue Trend chart. At least 4 of 6 month columns show non-zero won revenue. All 6 months show non-zero forecast revenue.

### Implementation for User Story 3

- [x] T005 [US3] Add seed phase "Won Opportunities — Historical Months" in `backend/prisma/seed.ts`: insert 4 won opportunities filling the gap months — 5 months ago (January), 4 months ago (February), and 1 month ago (May). Note: months 3 and 2 months ago (March: Acme Cloud Migration, April: Mu Data Platform) already exist in the seed. Use `stage: 'WON'`, `actualCloseDate: monthMid(N)`, `probability: 100`, realistic `expectedRevenue` values ($25,000–$200,000), linked to existing customers. Skip-if-exists keyed on `name`.

**Note**: `expectedCloseDate` on open opportunities was already added in T003 (Phase 3), so forecast bars are already populated. This phase covers only the won revenue gap months.

**Checkpoint**: Run `pnpm seed`, open dashboard Revenue Trend chart. At least 4 of 6 month bars show won revenue (filled bars), and all 6 months show forecast revenue (lighter bars).

---

## Phase 6: User Story 4 — Team Performance Table Has Meaningful Per-Rep Numbers (Priority: P2)

**Goal**: Team Performance table shows at least 1 activity and 1 completed task per sales rep for the current month

**Independent Test**: Log in as Sales Manager, open dashboard Team Performance table. At least 2 rep rows show ≥ 1 "Activities Logged" and at least 1 rep shows ≥ 1 "Tasks Completed".

### Implementation for User Story 4

- [x] T006 [US4] Add seed phase "Completed Tasks — This Month" in `backend/prisma/seed.ts`: insert 4 completed tasks with `status: 'COMPLETED'`, `completedAt: monthMid(0)` (or day 1–4 of current month), `dueDate` same as `completedAt`, assigned to 2 different sales rep users, linked to existing customers. Use `findFirst` + skip-if-exists keyed on `title`.

**Note**: Team Performance "Activities Logged" is satisfied by the 30 activities added in T004 — those activities have `createdAt = now()` (set by Prisma at insert time), which falls in the current month. No additional activity records are needed for Team Performance.

**Checkpoint**: Log in as Sales Manager, open Team Performance table. At least 2 reps show ≥ 1 activity this month and at least 1 rep shows ≥ 1 task completed.

---

## Phase 7: Polish & Validation

**Purpose**: Confirm idempotency and run end-to-end quickstart validation

- [x] T007 Run `pnpm seed` from `backend/` and verify clean exit (exit code 0, no TypeScript errors, no Prisma errors). Confirm console output shows all new seed phases completing.

- [x] T008 Re-run `pnpm seed` immediately (second run) and verify idempotency: exit code 0, no "unique constraint" or duplicate record errors, all metric card values remain identical to first run.

- [x] T009 Execute all validation steps in `specs/010-dashboard-seed-enrichment/quickstart.md` — verify all 6 success criteria (SC-001 through SC-006) pass.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — add helpers first
- **Foundational (Phase 2)**: Satisfied by Phase 1 — no separate tasks
- **US1 (Phase 3)**: Depends on Phase 1 (helpers) — T002, T003
- **US2 (Phase 4)**: Depends on Phase 1 (helpers) — T004 can follow T003 sequentially
- **US3 (Phase 5)**: Depends on Phase 1 (helpers) and T002/T003 (won opp pattern established) — T005
- **US4 (Phase 6)**: Depends on Phase 1 (helpers) — T006; logically follows US2 to confirm createdAt coverage
- **Polish (Phase 7)**: Depends on all implementation phases — T007, T008, T009

### User Story Dependencies

- **US1 (P1)**: Start after Phase 1 — no story dependencies
- **US2 (P1)**: Start after Phase 1 — no story dependencies (but schedule after US1 since same file)
- **US3 (P2)**: Start after US1 (won opp pattern established) — T005 adds to the same won-opp block
- **US4 (P2)**: Start after US2 (activity pattern established) — T006 adds to same block as tasks

### Within Each Phase

- Tasks in each phase must be executed sequentially (all modify `backend/prisma/seed.ts`)
- Each phase appends a new logical block to the seed file
- Idempotency (`findFirst` + skip) must be included in EVERY new record creation

---

## Parallel Example

No true parallelism is available — all tasks edit the same file (`backend/prisma/seed.ts`). Tasks execute sequentially in the order T001 → T002 → ... → T009.

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 — P1 Only)

1. Complete Phase 1: Add helpers
2. Complete Phase 3: US1 — won opps in current month + expectedCloseDate on open opps
3. Complete Phase 4: US2 — 30 daily activities
4. **STOP and VALIDATE**: Run `pnpm seed`, open dashboard, confirm metric cards and Activity Trend are populated
5. Deliver MVP if ready — dashboard looks good for demos at this point

### Incremental Delivery

1. Helpers → US1 → Validate metric cards (Revenue Forecast, Won This Month)
2. Add US2 → Validate Activity Trend chart
3. Add US3 → Validate Revenue Trend 6-month bars
4. Add US4 → Validate Team Performance table
5. Polish → Full idempotency check

---

## Notes

- All tasks target `backend/prisma/seed.ts` — sequential execution required
- Skip-if-exists keyed on `name` (opportunities/tasks) or `(subject, userId, scheduledAt)` (activities)
- Use `past(N)` for activity scheduledAt; use `monthMid(N)` for opportunity close dates
- Do NOT modify `createdAt` on any record — Prisma defaults handle it; Team Performance counts `createdAt` from when the seed runs
- Existing records (customers, contacts, users, pipeline stages, Mar/Apr won opps) are never touched
