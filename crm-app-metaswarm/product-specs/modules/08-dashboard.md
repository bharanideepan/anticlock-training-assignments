# Module: Role-Based Dashboard

## Overview

The dashboard is the landing page for all authenticated users. It displays KPI metric cards and data visualizations scoped to the user's role and team visibility. Chart data is cached for up to 5 minutes; KPI tiles update on page refresh.

---

## User Stories

### US-1: Role-Adapted Dashboard View (Priority: P2)
Each user sees a dashboard tailored to their role: Sales Managers see team-wide performance; Sales Reps see their own data. The dashboard shows key metrics and visualizations.

**Acceptance scenarios**:
1. Sales Manager opens dashboard → sees aggregate metrics (total customers, active opportunities, pipeline value, open tasks) and team performance charts.
2. Sales Representative opens dashboard → sees only opportunities and tasks they own or their team members own.
3. Dashboard metric card updates when underlying data changes (within one page-refresh cycle).

---

## Functional Requirements

- **FR-037**: Role-adapted dashboard displaying metrics relevant to the user's role.
- **FR-038**: Dashboard MUST display: total customers, new customers (current period), active opportunities, won/lost opportunities, pipeline value, revenue forecast, open tasks, overdue tasks.
- **FR-039**: Dashboard MUST include: revenue trend chart, pipeline funnel, opportunity distribution, team performance (Managers/Admins only), activity trend.

---

## KPI Metric Cards

All values are visibility-scoped to the authenticated user.

| Metric | Description |
|--------|-------------|
| Total Customers | Count of all non-archived customers in scope |
| New Customers (Period) | Customers created in current calendar month |
| Active Opportunities | Non-terminal, non-deleted opportunities |
| Won (Period) | Opportunities closed as Won in current month |
| Lost (Period) | Opportunities closed as Lost in current month |
| Pipeline Value | Sum of `expectedRevenue` for all open opportunities |
| Revenue Forecast | Sum of (`expectedRevenue × probability/100`) for open opportunities in current calendar year |
| Open Tasks | Tasks with status OPEN |
| Overdue Tasks | Tasks with status OPEN and `dueDate < now()` |

**"Period"** in v1 = current calendar month (January–December).

---

## Charts

### 1. Revenue Trend (Line Chart)
- X-axis: months (configurable range, default 6, max 24)
- Y-axis: revenue amount
- Series: Won Revenue vs. Forecast Revenue
- Empty state: "No revenue data for this period."

### 2. Pipeline Funnel (Funnel/Bar Chart)
- Shows each non-terminal stage with count and total value of opportunities
- Empty state: "No active opportunities in the pipeline."

### 3. Activity Trend (Bar Chart)
- X-axis: days (configurable range, default 30, max 90)
- Y-axis: activity count
- Grouped by activity type (Phone Call, Meeting, Email, Note, Follow-up)
- Empty state: "No activities logged in this period."

### 4. Team Performance (Table/Bar — Manager & Admin Only)
- Per team member: Won Opportunities, Won Revenue, Activities Logged, Tasks Completed, Open Opportunities
- Empty state: "No team data available."

### 5. Opportunity Distribution (Pie/Bar Chart)
- Breakdown by industry: count and total value of opportunities
- Empty state: "No opportunity data available."

---

## API Endpoints

### GET /api/v1/dashboard/metrics
**Auth**: Bearer JWT

**Response 200**:
```json
{
  "data": {
    "totalCustomers": 1482,
    "newCustomersThisPeriod": 38,
    "activeOpportunities": 94,
    "wonOpportunitiesThisPeriod": 12,
    "lostOpportunitiesThisPeriod": 5,
    "pipelineValue": "4520000.00",
    "revenueForecast": "1230000.00",
    "openTasks": 47,
    "overdueTasks": 8,
    "period": "2026-06-01T00:00:00Z/2026-06-30T23:59:59Z"
  }
}
```

---

### GET /api/v1/dashboard/charts/revenue-trend
**Query params**: `months` (int, default 6, max 24)

**Response 200**:
```json
{
  "data": {
    "labels": ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"],
    "wonRevenue": [85000, 120000, 95000, 140000, 110000, 125000],
    "forecastRevenue": [90000, 115000, 100000, 135000, 105000, 0]
  }
}
```

---

### GET /api/v1/dashboard/charts/pipeline-funnel

**Response 200**:
```json
{
  "data": [
    { "stage": "Lead", "count": 32, "value": "960000.00" },
    { "stage": "Qualified", "count": 24, "value": "840000.00" },
    { "stage": "Proposal", "count": 18, "value": "720000.00" },
    { "stage": "Negotiation", "count": 12, "value": "600000.00" }
  ]
}
```

---

### GET /api/v1/dashboard/charts/activity-trend
**Query params**: `days` (int, default 30, max 90)

**Response 200**:
```json
{
  "data": {
    "labels": ["2026-05-14", "..."],
    "phoneCall": [3, 5, 2, 4],
    "meeting": [1, 2, 1, 3],
    "email": [8, 6, 9, 7],
    "note": [2, 1, 3, 2],
    "followUp": [4, 3, 5, 4]
  }
}
```

---

### GET /api/v1/dashboard/charts/team-performance
**Roles**: SYSTEM_ADMINISTRATOR, SALES_MANAGER

**Response 200**:
```json
{
  "data": [
    {
      "user": { "id": "uuid", "firstName": "Jane", "lastName": "Doe" },
      "wonOpportunities": 5,
      "wonRevenue": "320000.00",
      "activitiesLogged": 42,
      "tasksCompleted": 18,
      "openOpportunities": 8
    }
  ]
}
```

---

### GET /api/v1/dashboard/charts/opportunity-distribution

**Response 200**:
```json
{
  "data": [
    { "industry": "Technology", "count": 28, "value": "1400000.00" },
    { "industry": "Finance", "count": 15, "value": "900000.00" }
  ]
}
```

---

## Frontend Page

| Route | Component |
|-------|-----------|
| `/dashboard` | `DashboardPage` |

### Layout (at 1280px viewport — all must be visible without scrolling)
```
┌──────────┬────────────┬────────────┬────────────┐
│ Total    │ Open       │ Pipeline   │ Revenue    │
│ Customers│ Opps       │ Value      │ Forecast   │
├──────────┴────────────┴────────────┴────────────┤
│  Revenue Trend (line chart, 6 months)            │
│  Pipeline Funnel (funnel/bar chart)              │
├──────────────────────┬──────────────────────────┤
│  Activity Trend      │  Opportunity Distribution │
│  (bar chart, 30d)    │  (pie/bar chart)          │
├──────────────────────┴──────────────────────────┤
│  Team Performance (Manager/Admin only)           │
└─────────────────────────────────────────────────┘
```

**KPI card structure**:
- Icon relevant to the metric
- Value: 18–24px bold number
- Label: 11–12px regular text (not all-caps)
- Trend indicator: optional ↑/↓ vs. prior period

**Empty state**: When all KPI values are zero (new environment), show "0" values — never hide the cards. Charts show empty state message, not blank areas.

---

## Caching

- Chart data: cached for 5 minutes (acceptable staleness as defined in SC-006)
- KPI metric tiles: no cache — always fresh on page load
- Cache is per-user (scoped to visibility)
