# API Contract: Activities

**Base path**: `/api/v1/activities` | **Auth**: Bearer JWT required

---

## GET /api/v1/activities

**Roles**: All (visibility-scoped)

**Query params**:
| Param | Type | Description |
|-------|------|-------------|
| page | int | Default 1 |
| pageSize | int | Default 20, max 100 |
| customerId | uuid | Filter by customer |
| contactId | uuid | Filter by contact |
| type | ActivityType | PHONE_CALL\|MEETING\|EMAIL\|NOTE\|FOLLOW_UP |
| createdById | uuid | Filter by creator |
| fromDate | ISO8601 | Scheduled after |
| toDate | ISO8601 | Scheduled before |
| sortBy | string | Default: createdAt |
| sortOrder | asc\|desc | Default: desc |

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "PHONE_CALL",
      "subject": "Q2 renewal discussion",
      "description": "Discussed renewal terms, follow-up required.",
      "scheduledAt": "2026-04-15T14:00:00Z",
      "durationMinutes": 30,
      "customer": { "id": "uuid", "companyName": "Acme Corp" },
      "contact": { "id": "uuid", "firstName": "Sarah", "lastName": "Lee" },
      "createdBy": { "id": "uuid", "firstName": "Jane", "lastName": "Doe" },
      "createdAt": "2026-04-15T14:30:00Z"
    }
  ],
  "meta": { "total": 120, "page": 1, "pageSize": 20, "totalPages": 6 }
}
```

---

## POST /api/v1/activities

**Roles**: `SYSTEM_ADMINISTRATOR`, `SALES_MANAGER`, `SALES_REPRESENTATIVE`, `SUPPORT_REPRESENTATIVE`

**Request body**:
```json
{
  "type": "MEETING",
  "subject": "Product demo",
  "description": "Demonstrated new features to the engineering team.",
  "scheduledAt": "2026-05-10T10:00:00Z",
  "durationMinutes": 60,
  "customerId": "uuid",
  "contactId": "uuid"
}
```

**Response 201**: Created activity.

**Errors**: `404 CUSTOMER_NOT_FOUND`, `404 CONTACT_NOT_FOUND`,
`409 CONTACT_NOT_LINKED_TO_CUSTOMER`

---

## GET /api/v1/activities/:id

**Roles**: All (visibility-scoped via parent customer)

**Response 200**: Full activity object with attached file list.

---

## PATCH /api/v1/activities/:id

**Roles**: Owner (`createdById`) or `SYSTEM_ADMINISTRATOR`, `SALES_MANAGER`

**Request body**: Any subset of POST fields.

**Response 200**: Updated activity.

**Errors**: `403 NOT_ACTIVITY_OWNER`

---

## DELETE /api/v1/activities/:id

**Roles**: Owner or `SYSTEM_ADMINISTRATOR`

Soft delete.

**Response 204**.
