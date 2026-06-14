# Feature Specification: Dashboard Seed Enrichment

**Feature Branch**: `010-dashboard-seed-enrichment`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User description: "is it possible to seed more data to look the dashboard good"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Dashboard Metrics All Show Non-Zero Values (Priority: P1)

When a developer opens the dashboard after running the seed, every metric card shows a meaningful non-zero value. Currently "Won This Month", "Overdue Tasks", and "Revenue Forecast" appear as 0 because the seed uses hardcoded historical dates that no longer fall in the current month or within the activity tracking window.

**Why this priority**: The metric cards are the first thing visible on the dashboard. Zeros on "Won This Month" and an empty Revenue Trend chart give the impression the CRM is broken rather than seeded.

**Independent Test**: Run the seed against a fresh database, open the dashboard as admin, and verify all 8 metric cards show values greater than zero.

**Acceptance Scenarios**:

1. **Given** a freshly seeded database, **When** the dashboard loads, **Then** "Total Customers" ≥ 12, "New This Month" ≥ 3, "Active Opps" ≥ 8, "Won This Month" ≥ 2, "Pipeline Value" > $500,000, "Revenue Forecast" > $100,000, "Open Tasks" ≥ 6, "Overdue Tasks" ≥ 2.
2. **Given** a freshly seeded database, **When** today's date is any date the seed is run, **Then** "Won This Month" reflects wins that occurred in the same calendar month as the seed run date (using relative date generation, not hardcoded months).

---

### User Story 2 — Activity Trend Chart Shows Data for All 14 Days (Priority: P1)

The "Activity Trend — 14 Days" chart shows per-day activity counts across all 5 types (Phone Call, Meeting, Email, Note, Follow-Up). After seeding, every day in the 14-day window should show at least 1 activity rather than a flat zero line.

**Why this priority**: A flat activity trend chart looks identical to an empty database, undermining any demo or review of the CRM.

**Independent Test**: After seeding, the activity trend chart renders visible bars or lines across all 14 days, with at least 2–3 different activity types represented each day.

**Acceptance Scenarios**:

1. **Given** seed data exists, **When** the Activity Trend chart renders, **Then** at least 10 of the 14 days have at least 1 activity, and all 5 activity types appear at least twice across the window.
2. **Given** the seed is re-run one month later, **When** the Activity Trend chart renders, **Then** it still shows data (activities use relative date offsets, not hardcoded calendar dates).

---

### User Story 3 — Revenue Trend Shows Growth Pattern Over 6 Months (Priority: P2)

The "Revenue Trend — 6 Months" chart shows won revenue and forecast revenue per calendar month. After seeding, each of the 6 months should contain at least one won opportunity with a close date in that month, creating a visible trend line rather than sporadic spikes.

**Why this priority**: A revenue trend with 4 empty months and 2 spikes does not look like a functioning sales pipeline; it makes charts appear broken.

**Independent Test**: After seeding, the Revenue Trend chart shows non-zero wonRevenue for at least 4 of the last 6 months, with an upward or varied trend.

**Acceptance Scenarios**:

1. **Given** seed data exists, **When** the Revenue Trend chart renders, **Then** at least 4 of 6 months show non-zero won revenue.
2. **Given** seed data exists, **When** the Revenue Trend chart renders, **Then** forecast revenue (open opportunities × probability) is non-zero for all 6 months.

---

### User Story 4 — Team Performance Table Has Meaningful Per-Rep Numbers (Priority: P2)

The "Team Performance — This Month" table shows won opportunities, won revenue, activities logged, and tasks completed per sales representative for the current month. After seeding, each rep row should show at least 1 activity and 1 completed task to confirm the table is working.

**Why this priority**: An all-zeros team performance table is indistinguishable from no data and doesn't demonstrate the CRM's reporting capability.

**Independent Test**: Log in as Sales Manager, open the dashboard, and verify each sales rep row in the Team Performance table shows non-zero "Activities Logged" and at least 1 "Won Opportunities" or "Tasks Completed" for the current month.

**Acceptance Scenarios**:

1. **Given** seed data exists, **When** the Team Performance table renders, **Then** at least 2 sales rep rows show ≥ 1 activity logged this month.
2. **Given** seed data exists, **When** the Team Performance table renders, **Then** at least 1 rep shows ≥ 1 won opportunity this month and non-zero won revenue.

---

### Edge Cases

- What happens when the seed is run mid-month (e.g., day 3)? The relative date approach still generates activities in the last 14 days.
- What happens if seed is re-run in a different month? Won opportunities and activities remain correctly in the relative window.
- Activities with `scheduledAt` far in the past should not be removed — they contribute to historical records on customer detail pages.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All activity dates in the seed that populate the Activity Trend chart MUST use relative offsets (e.g., "3 days ago", "1 day ago") so they always fall within the 14-day trailing window, regardless of when the seed is run.
- **FR-002**: The seed MUST include at least 14 activities with `scheduledAt` in the last 14 days (one per day at minimum), covering all 5 activity types.
- **FR-003**: The seed MUST include at least 6 won opportunities with `actualCloseDate` distributed across the last 6 calendar months (one close per month at minimum) so the Revenue Trend chart has data in each month.
- **FR-004**: At least 2 of the won opportunities MUST have `actualCloseDate` in the current calendar month so the "Won This Month" metric is non-zero.
- **FR-005**: The seed MUST include at least 4 completed tasks with `completedAt` in the current calendar month so the Team Performance table shows task completion per rep.
- **FR-006**: The seed MUST include at least 4 activities per sales representative with `scheduledAt` in the current month so the Team Performance "Activities Logged" column is non-zero.
- **FR-007**: The existing seed data (customers, contacts, pipeline stages, users, team) MUST be preserved — the enrichment adds new records, it does not replace existing ones.
- **FR-008**: The seed MUST remain idempotent — duplicate-check logic MUST cover all new records to prevent errors on re-run.
- **FR-009**: All new opportunities added for Revenue Trend coverage MUST have realistic expected revenue values and be linked to existing seeded customers.
- **FR-010**: New activities added for the 14-day window MUST be linked to existing seeded customers and contacts where available.

### Key Entities

- **Opportunity** (enriched): Additional won records with `actualCloseDate` spread across months Jan–Jun of the current year; revenue values ranging from $15,000 to $350,000.
- **Activity** (enriched): 14+ records with relative `scheduledAt` dates (last 0–13 days), distributed across all 5 types and multiple customers/contacts/sales reps.
- **Task** (enriched): 4+ completed tasks with `completedAt` in the current month, assigned to sales reps.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After seeding, all 8 dashboard metric cards show values greater than zero.
- **SC-002**: After seeding, the Activity Trend chart shows at least 1 data point for 10 of 14 days.
- **SC-003**: After seeding, the Revenue Trend chart shows non-zero won revenue in at least 4 of the last 6 months.
- **SC-004**: After seeding, the Team Performance table shows at least 1 activity logged per sales rep for the current month.
- **SC-005**: The seed command continues to complete in under 30 seconds and remains idempotent (re-run produces no errors and no duplicate records).
- **SC-006**: Running the seed in any calendar month produces a visually populated dashboard (no charts are entirely flat or zero).

## Assumptions

- Today's date is used as the reference point for "this month" and "last 14 days" — the seed generates dates relative to the run time, not hardcoded to specific calendar dates.
- The existing 002-database-seed data (12 customers, 22 contacts, pipeline stages, users, team) is already applied; this spec enriches on top of that foundation.
- File attachments are still excluded from seeding (same as 002-database-seed assumption).
- The goal is visual richness for demos and development; statistical accuracy of the sales data is not required.
- Existing activities with hardcoded May 2026 dates are kept for historical record purposes (they appear on customer detail pages); new relative-date activities are added in parallel to populate the 14-day dashboard chart.
