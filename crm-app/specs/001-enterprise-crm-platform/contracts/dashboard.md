# API Contract: Dashboard

**Base path**: `/api/v1/dashboard` | **Auth**: Bearer JWT required

All data is visibility-scoped (FR-000). Chart data is cached for 5 minutes.

---

## GET /api/v1/dashboard/metrics

Returns KPI metric cards for the authenticated user's role.

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
    "revenueForcast": "1230000.00",
    "openTasks": 47,
    "overdueTasks": 8,
    "period": "2026-06-01T00:00:00Z/2026-06-30T23:59:59Z"
  }
}
```

`revenueForcast` = sum(expectedRevenue × probability/100) for open opportunities in current month.

---

## GET /api/v1/dashboard/charts/revenue-trend

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

## GET /api/v1/dashboard/charts/pipeline-funnel

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

## GET /api/v1/dashboard/charts/activity-trend

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

## GET /api/v1/dashboard/charts/team-performance

**Roles**: `SYSTEM_ADMINISTRATOR`, `SALES_MANAGER`

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

## GET /api/v1/dashboard/charts/opportunity-distribution

**Response 200**:
```json
{
  "data": [
    { "industry": "Technology", "count": 28, "value": "1400000.00" },
    { "industry": "Finance", "count": 15, "value": "900000.00" }
  ]
}
```
