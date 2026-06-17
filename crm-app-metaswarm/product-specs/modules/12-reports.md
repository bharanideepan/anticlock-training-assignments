# Module: Reports & Analytics

## Overview

The Reports module provides aggregated, filterable business intelligence across three categories: Sales, Customer, and User Productivity. All reports support date range filtering and CSV export. Data is visibility-scoped.

---

## User Stories

### US-1: Generate Sales Reports (Priority: P3)
A Sales Manager generates a win rate report for the last 30 days, filters to a specific sales rep, and exports the result.

**Acceptance scenarios**:
1. Sales Manager requests "Revenue Performance" with date range → report shows total revenue by period.
2. User applies filter (owner = specific rep) → report data updates to reflect only that rep's records.
3. User clicks Export → report downloaded as CSV with column headers and all filtered rows.

---

## Functional Requirements

- **FR-040**: System MUST support three report categories: Sales, Customer, and User Productivity.
- **FR-041**: All reports MUST support filtering by date range and at least one entity-specific dimension.
- **FR-042**: All reports MUST support export to CSV format.

---

## Common Query Parameters (all report endpoints)

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `fromDate` | ISO 8601 | Yes | Start of reporting period |
| `toDate` | ISO 8601 | Yes | End of reporting period |
| `ownerId` | UUID | No | Filter to specific user (within visibility) |
| `teamId` | UUID | No | Filter to specific team (Manager/Admin only) |

---

## Sales Reports

### GET /api/v1/reports/sales/revenue

**Response 200**:
```json
{
  "data": {
    "totalWonRevenue": "1250000.00",
    "totalForecastRevenue": "780000.00",
    "byPeriod": [
      { "period": "2026-04", "wonRevenue": "320000.00", "forecastRevenue": "210000.00" }
    ]
  }
}
```

---

### GET /api/v1/reports/sales/win-rate

**Response 200**:
```json
{
  "data": {
    "totalClosed": 45,
    "totalWon": 28,
    "totalLost": 17,
    "winRate": 62.2,
    "byOwner": [
      { "owner": { "id": "uuid", "firstName": "Jane", "lastName": "Doe" }, "won": 8, "lost": 3, "winRate": 72.7 }
    ]
  }
}
```

---

### GET /api/v1/reports/sales/conversion-rate

**Response 200**:
```json
{
  "data": {
    "totalLeads": 120,
    "convertedToQualified": 80,
    "convertedToProposal": 55,
    "convertedToNegotiation": 38,
    "closedWon": 28,
    "leadToWinRate": 23.3
  }
}
```

---

### GET /api/v1/reports/sales/opportunity-trends

**Response 200**:
```json
{
  "data": {
    "byPeriod": [
      { "period": "2026-04", "created": 18, "won": 5, "lost": 3, "open": 10 }
    ]
  }
}
```

---

## Customer Reports

### GET /api/v1/reports/customers/growth

**Response 200**:
```json
{
  "data": {
    "byPeriod": [
      { "period": "2026-04", "new": 12, "churned": 2, "net": 10 }
    ]
  }
}
```

---

### GET /api/v1/reports/customers/distribution

**Response 200**:
```json
{
  "data": {
    "byStatus": [
      { "status": "ACTIVE", "count": 842 },
      { "status": "PROSPECT", "count": 340 },
      { "status": "INACTIVE", "count": 211 }
    ],
    "byRevenueRange": [
      { "range": "10M_50M", "count": 320 }
    ]
  }
}
```

---

### GET /api/v1/reports/customers/industry-analysis

**Response 200**:
```json
{
  "data": [
    { "industry": "Technology", "count": 380, "percentage": 25.6 }
  ]
}
```

---

## Productivity Reports

### GET /api/v1/reports/productivity/activity-completion

**Response 200**:
```json
{
  "data": {
    "totalActivities": 620,
    "byType": [
      { "type": "PHONE_CALL", "count": 185 },
      { "type": "MEETING", "count": 94 }
    ],
    "byOwner": [
      { "owner": { "id": "uuid", "firstName": "Jane", "lastName": "Doe" }, "count": 42 }
    ]
  }
}
```

---

### GET /api/v1/reports/productivity/task-completion

**Response 200**:
```json
{
  "data": {
    "totalTasks": 310,
    "completed": 248,
    "cancelled": 18,
    "overdue": 14,
    "completionRate": 80.0,
    "byAssignee": [
      { "assignee": { "id": "uuid", "firstName": "Jane", "lastName": "Doe" }, "completed": 32, "overdue": 2 }
    ]
  }
}
```

---

### GET /api/v1/reports/productivity/opportunity-ownership

**Response 200**:
```json
{
  "data": [
    {
      "owner": { "id": "uuid", "firstName": "Jane", "lastName": "Doe" },
      "openOpportunities": 8,
      "pipelineValue": "420000.00",
      "wonThisPeriod": 3,
      "wonRevenue": "180000.00"
    }
  ]
}
```

---

## CSV Export

### GET /api/v1/reports/:reportType/export

**Report type values**: `sales-revenue`, `sales-win-rate`, `sales-conversion`, `sales-opportunity-trends`, `customers-growth`, `customers-distribution`, `customers-industry`, `productivity-activity`, `productivity-task`, `productivity-opportunity`

**Same query params as the corresponding report endpoint.**

**Response**: `Content-Type: text/csv; charset=utf-8`
`Content-Disposition: attachment; filename="report-<type>-<date>.csv"`

CSV includes column headers on the first row.

**Performance target**: Full 12-month report with export in < 30 seconds.

---

## Frontend Pages

| Route | Component | Notes |
|-------|-----------|-------|
| `/reports` | `ReportPage` | Report selector + filter panel + visualization |

### Reports Page Layout
- Left sidebar (or top tabs): Report category selector (Sales / Customer / Productivity)
- Sub-selector: specific report within category
- Filter panel: date range picker (required), owner/team filters (optional)
- Report area: chart visualization + data table below
- Export button → triggers CSV download

### Report Categories & Sub-Reports

**Sales**:
- Revenue Performance
- Win Rate Analysis
- Conversion Rate (funnel)
- Opportunity Trends

**Customer**:
- Customer Growth
- Customer Distribution (by status / revenue range)
- Industry Analysis

**User Productivity**:
- Activity Completion
- Task Completion
- Opportunity Ownership

---

## Business Rules

- `fromDate` and `toDate` are required on all report endpoints — no unbounded report queries.
- All report data is visibility-scoped — a sales rep sees only their own records in reports.
- `teamId` filter is only effective for Managers and Admins; it is ignored for other roles.
- A 12-month report query must complete in < 30 seconds (SC-008).
- CSV export uses the same filter parameters as the JSON report endpoint.
