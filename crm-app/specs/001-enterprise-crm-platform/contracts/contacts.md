# API Contract: Contacts

**Base path**: `/api/v1/contacts` | **Auth**: Bearer JWT required

All list operations respect team-scoped visibility (FR-000).

---

## GET /api/v1/contacts

**Roles**: All (visibility-scoped)

**Query params**:
| Param | Type | Description |
|-------|------|-------------|
| page | int | Default 1 |
| pageSize | int | Default 20, max 100 |
| search | string | Full-text search (name, email) |
| customerId | uuid | Filter by customer |
| sortBy | string | Default: lastName |
| sortOrder | asc\|desc | Default: asc |

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "firstName": "Mark",
      "lastName": "Johnson",
      "email": "mark.johnson@acme.com",
      "phone": "+1-555-0400",
      "designation": "CTO",
      "department": "Engineering",
      "customer": { "id": "uuid", "companyName": "Acme Corp" },
      "createdAt": "2026-01-20T09:00:00Z"
    }
  ],
  "meta": { "total": 340, "page": 1, "pageSize": 20, "totalPages": 17 }
}
```

---

## POST /api/v1/contacts

**Roles**: `SYSTEM_ADMINISTRATOR`, `SALES_MANAGER`, `SALES_REPRESENTATIVE`, `SUPPORT_REPRESENTATIVE`

**Request body**:
```json
{
  "firstName": "Sarah",
  "lastName": "Lee",
  "email": "sarah.lee@acme.com",
  "phone": "+1-555-0401",
  "designation": "VP of Sales",
  "department": "Sales",
  "notes": "Key decision maker",
  "customerId": "uuid"
}
```

**Response 201**: Created contact.

**Errors**: `404 CUSTOMER_NOT_FOUND`, `403 CUSTOMER_NOT_IN_VISIBILITY_SCOPE`

---

## GET /api/v1/contacts/:id

**Roles**: All (visibility-scoped via parent customer)

**Response 200**: Full contact with interaction summary:
```json
{
  "data": {
    "id": "uuid",
    "firstName": "Sarah",
    "lastName": "Lee",
    "email": "sarah.lee@acme.com",
    "phone": "+1-555-0401",
    "designation": "VP of Sales",
    "department": "Sales",
    "notes": "Key decision maker",
    "customer": { "id": "uuid", "companyName": "Acme Corp" },
    "_counts": { "activities": 8, "opportunities": 2 },
    "createdAt": "2026-01-20T09:00:00Z",
    "updatedAt": "2026-04-10T14:30:00Z"
  }
}
```

---

## PATCH /api/v1/contacts/:id

**Roles**: `SYSTEM_ADMINISTRATOR`, `SALES_MANAGER`, `SALES_REPRESENTATIVE`, `SUPPORT_REPRESENTATIVE`

**Request body**: Any subset of POST fields (excluding `customerId`).

**Response 200**: Updated contact.

---

## DELETE /api/v1/contacts/:id

**Roles**: `SYSTEM_ADMINISTRATOR`, `SALES_MANAGER`

Soft delete. Contact remains in activity/opportunity history.

**Response 204**.

---

## GET /api/v1/contacts/:id/activities

**Roles**: All (visibility-scoped)

**Query params**: `page`, `pageSize`, `type`

**Response 200**: Paginated activity list (reverse-chronological).
