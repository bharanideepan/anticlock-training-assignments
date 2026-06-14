# API Contract: Opportunities & Pipeline

**Base paths**: `/api/v1/opportunities`, `/api/v1/pipeline` | **Auth**: Bearer JWT required

---

## Opportunities

### GET /api/v1/opportunities

**Roles**: All (visibility-scoped)

**Query params**:
| Param | Type | Description |
|-------|------|-------------|
| page | int | Default 1 |
| pageSize | int | Default 20, max 100 |
| search | string | Full-text on opportunity name |
| customerId | uuid | Filter by customer |
| ownerId | uuid | Filter by owner |
| stageId | uuid | Filter by pipeline stage |
| minRevenue | number | Expected revenue ≥ |
| maxRevenue | number | Expected revenue ≤ |
| closeDateFrom | ISO8601 | Expected close date from |
| closeDateTo | ISO8601 | Expected close date to |
| includeTerminal | boolean | Include Won/Lost (default false) |
| sortBy | string | Default: updatedAt |
| sortOrder | asc\|desc | Default: desc |

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Acme Enterprise Renewal",
      "expectedRevenue": "125000.00",
      "probability": 75,
      "expectedCloseDate": "2026-06-30T00:00:00Z",
      "stage": { "id": "uuid", "name": "Negotiation", "displayOrder": 4 },
      "customer": { "id": "uuid", "companyName": "Acme Corp" },
      "contact": { "id": "uuid", "firstName": "Sarah", "lastName": "Lee" },
      "owner": { "id": "uuid", "firstName": "Jane", "lastName": "Doe" },
      "createdAt": "2026-02-01T08:00:00Z",
      "updatedAt": "2026-05-20T16:00:00Z"
    }
  ],
  "meta": { "total": 85, "page": 1, "pageSize": 20, "totalPages": 5 }
}
```

---

### POST /api/v1/opportunities

**Roles**: `SYSTEM_ADMINISTRATOR`, `SALES_MANAGER`, `SALES_REPRESENTATIVE`

**Request body**:
```json
{
  "name": "NewCo Platform Deal",
  "customerId": "uuid",
  "contactId": "uuid",
  "ownerId": "uuid",
  "expectedRevenue": 50000,
  "probability": 30,
  "expectedCloseDate": "2026-09-30T00:00:00Z"
}
```

Stage defaults to the stage where `isDefault = true` (Lead).
`ownerId` defaults to authenticated user.

**Response 201**: Created opportunity.

---

### GET /api/v1/opportunities/:id

**Roles**: All (visibility-scoped)

**Response 200**: Full opportunity with stage history, task count, file count.

---

### PATCH /api/v1/opportunities/:id

**Roles**: Owner or `SYSTEM_ADMINISTRATOR`, `SALES_MANAGER`

**Request body**: Any subset of POST fields (excluding `stageId` — use `/move` endpoint).

**Response 200**: Updated opportunity.

---

### PATCH /api/v1/opportunities/:id/stage

**Roles**: Owner or `SYSTEM_ADMINISTRATOR`, `SALES_MANAGER`

Move opportunity to a different (non-terminal) stage.

**Request body**: `{ "stageId": "uuid" }`

**Response 200**: Updated opportunity.

**Errors**: `409 STAGE_IS_TERMINAL` (use close endpoints instead), `404 STAGE_NOT_FOUND`

---

### POST /api/v1/opportunities/:id/close/won

**Roles**: Owner or `SYSTEM_ADMINISTRATOR`, `SALES_MANAGER`

**Request body** (optional): `{ "closeNote": "Signed contract received." }`

**Response 200**: Opportunity with terminal Won stage, `actualCloseDate` set.

---

### POST /api/v1/opportunities/:id/close/lost

**Roles**: Owner or `SYSTEM_ADMINISTRATOR`, `SALES_MANAGER`

**Request body** (optional): `{ "closeNote": "Budget cut for Q3." }`

**Response 200**: Opportunity with terminal Lost stage.

---

## Pipeline Board

### GET /api/v1/pipeline

**Roles**: All (visibility-scoped)

Returns all active stages with their opportunity cards (non-terminal, non-deleted).

**Query params**:
| Param | Type | Description |
|-------|------|-------------|
| ownerId | uuid | Filter to a specific owner |
| search | string | Filter by opportunity name |
| closeDateFrom | ISO8601 | Filter by expected close date |
| closeDateTo | ISO8601 | Filter by expected close date |

**Response 200**:
```json
{
  "data": [
    {
      "stage": { "id": "uuid", "name": "Lead", "displayOrder": 1 },
      "opportunities": [
        {
          "id": "uuid",
          "name": "NewCo Platform Deal",
          "expectedRevenue": "50000.00",
          "expectedCloseDate": "2026-09-30T00:00:00Z",
          "owner": { "id": "uuid", "firstName": "Jane", "lastName": "Doe" }
        }
      ],
      "totalValue": "50000.00",
      "count": 1
    }
  ]
}
```

---

## Pipeline Stages (Admin)

### GET /api/v1/pipeline/stages

**Roles**: All authenticated

**Response 200**: Ordered list of all stages (including terminal).

---

### POST /api/v1/pipeline/stages

**Roles**: `SYSTEM_ADMINISTRATOR`

**Request body**: `{ "name": "Discovery", "displayOrder": 2 }`

**Response 201**: Created stage.

---

### PATCH /api/v1/pipeline/stages/:id

**Roles**: `SYSTEM_ADMINISTRATOR`

**Request body**: Subset of POST fields.

**Response 200**: Updated stage.

**Errors**: `409 CANNOT_MODIFY_TERMINAL_STAGE`

---

### DELETE /api/v1/pipeline/stages/:id

**Roles**: `SYSTEM_ADMINISTRATOR`

**Response 204**. Fails if any active opportunity is in this stage.

**Errors**: `409 STAGE_HAS_ACTIVE_OPPORTUNITIES`

---

### PATCH /api/v1/pipeline/stages/reorder

**Roles**: `SYSTEM_ADMINISTRATOR`

**Request body**: `{ "stageIds": ["uuid-1", "uuid-2", "uuid-3"] }` (full ordered list)

**Response 200**: Reordered stage list.
