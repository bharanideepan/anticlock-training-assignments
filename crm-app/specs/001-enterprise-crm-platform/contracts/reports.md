# API Contract: Reports

**Base path**: `/api/v1/reports` | **Auth**: Bearer JWT required

All reports are visibility-scoped (FR-000). Reports support date range filtering and CSV export.

**Common query params** (all report endpoints):
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| fromDate | ISO8601 | Yes | Start of reporting period |
| toDate | ISO8601 | Yes | End of reporting period |
| ownerId | uuid | No | Filter to a specific user |
| teamId | uuid | No | Filter to a specific team (Manager/Admin only) |

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

## Export

### GET /api/v1/reports/:reportType/export

**Report types**: `sales-revenue`, `sales-win-rate`, `sales-conversion`,
`sales-opportunity-trends`, `customers-growth`, `customers-distribution`,
`customers-industry`, `productivity-activity`, `productivity-task`,
`productivity-opportunity`

**Same query params as the corresponding report endpoint.**

**Response**: `Content-Type: text/csv; charset=utf-8`
`Content-Disposition: attachment; filename="report-<type>-<date>.csv"`

CSV includes column headers on first row.
