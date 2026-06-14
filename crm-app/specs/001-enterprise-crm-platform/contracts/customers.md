# API Contract: Customers

**Base path**: `/api/v1/customers` | **Auth**: Bearer JWT required

All list operations respect team-scoped visibility (FR-000). SystemAdmin sees all.

---

## GET /api/v1/customers

**Roles**: All (visibility-scoped)

**Query params**:
| Param | Type | Description |
|-------|------|-------------|
| page | int | Default 1 |
| pageSize | int | Default 20, max 100 |
| search | string | Full-text search (companyName, website) |
| status | CustomerStatus | PROSPECT\|ACTIVE\|INACTIVE\|ARCHIVED |
| industry | string | Exact match |
| ownerId | uuid | Filter by owner |
| sortBy | string | Default: companyName |
| sortOrder | asc\|desc | Default: asc |

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "companyName": "Acme Corp",
      "industry": "Technology",
      "website": "https://acme.com",
      "revenueRange": "10M_50M",
      "status": "ACTIVE",
      "owner": { "id": "uuid", "firstName": "Jane", "lastName": "Doe" },
      "city": "San Francisco",
      "country": "US",
      "createdAt": "2026-01-10T08:00:00Z",
      "updatedAt": "2026-03-01T12:00:00Z"
    }
  ],
  "meta": { "total": 1500, "page": 1, "pageSize": 20, "totalPages": 75 }
}
```

---

## POST /api/v1/customers

**Roles**: `SYSTEM_ADMINISTRATOR`, `SALES_MANAGER`, `SALES_REPRESENTATIVE`

**Request body**:
```json
{
  "companyName": "NewCo Ltd",
  "industry": "Finance",
  "website": "https://newco.com",
  "revenueRange": "1M_10M",
  "addressLine1": "100 Main St",
  "city": "Austin",
  "state": "TX",
  "country": "US",
  "postalCode": "78701",
  "ownerId": "uuid"
}
```

`ownerId` defaults to the authenticated user's ID if omitted.
Initial status is always `PROSPECT`.

**Response 201**: Created customer.

**Errors**: `400 OWNER_NOT_IN_VISIBILITY_SCOPE`

---

## GET /api/v1/customers/:id

**Roles**: All (visibility-scoped)

**Response 200**: Full customer object including counts:
```json
{
  "data": {
    "id": "uuid",
    "companyName": "Acme Corp",
    "...",
    "_counts": {
      "contacts": 12,
      "activities": 34,
      "openOpportunities": 3,
      "openTasks": 5,
      "files": 8
    }
  }
}
```

**Errors**: `404 CUSTOMER_NOT_FOUND`, `403 ACCESS_DENIED`

---

## PATCH /api/v1/customers/:id

**Roles**: `SYSTEM_ADMINISTRATOR`, `SALES_MANAGER`, `SALES_REPRESENTATIVE` (owner or team)

**Request body**: Any subset of POST fields (excluding `status`).

To change status, use dedicated status-transition endpoints below.

**Response 200**: Updated customer.

---

## POST /api/v1/customers/:id/status

**Roles**: `SYSTEM_ADMINISTRATOR`, `SALES_MANAGER`, `SALES_REPRESENTATIVE` (owner)

Performs a validated status transition.

**Request body**:
```json
{
  "status": "ACTIVE",
  "reason": "Contract signed"
}
```

**Response 200**: Updated customer with new status.

**Errors**: `409 INVALID_STATUS_TRANSITION` (e.g., ARCHIVED → ACTIVE by non-admin)

---

## POST /api/v1/customers/:id/archive

**Roles**: `SYSTEM_ADMINISTRATOR`, `SALES_MANAGER`

Shorthand for `{ status: ARCHIVED }`. All open opportunities are closed with note
"Customer archived".

**Response 200**: Archived customer.

---

## POST /api/v1/customers/:id/unarchive

**Roles**: `SYSTEM_ADMINISTRATOR` only

Sets status to `INACTIVE`.

**Response 200**: Unarchived customer.

---

## GET /api/v1/customers/:id/contacts

**Roles**: All (visibility-scoped)

**Query params**: `page`, `pageSize`, `search`

**Response 200**: Paginated contact list (see contacts contract).

---

## GET /api/v1/customers/:id/activities

**Roles**: All (visibility-scoped)

**Query params**: `page`, `pageSize`, `type` (ActivityType filter)

**Response 200**: Paginated activity list in reverse-chronological order.

---

## GET /api/v1/customers/:id/opportunities

**Roles**: All (visibility-scoped)

**Query params**: `page`, `pageSize`, `stageId`

**Response 200**: Paginated opportunity list.

---

## GET /api/v1/customers/:id/tasks

**Roles**: All (visibility-scoped)

**Query params**: `page`, `pageSize`, `status`

**Response 200**: Paginated task list.

---

## GET /api/v1/customers/:id/files

**Roles**: All (visibility-scoped)

**Response 200**: File list for this customer (see files contract).
