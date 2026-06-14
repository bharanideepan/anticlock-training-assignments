# API Contract: Audit Log

**Base path**: `/api/v1/audit` | **Auth**: Bearer JWT required — `SYSTEM_ADMINISTRATOR` only

---

## GET /api/v1/audit/logs

**Query params**:
| Param | Type | Description |
|-------|------|-------------|
| page | int | Default 1 |
| pageSize | int | Default 50, max 100 |
| actorId | uuid | Filter by actor |
| resourceType | string | Filter by resource type (e.g., CUSTOMER) |
| resourceId | uuid | Filter by specific resource |
| action | AuditAction | Filter by action type |
| fromDate | ISO8601 | Events after this date |
| toDate | ISO8601 | Events before this date |
| sortOrder | asc\|desc | Default: desc |

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "action": "RECORD_UPDATED",
      "resourceType": "CUSTOMER",
      "resourceId": "uuid",
      "actor": { "id": "uuid", "firstName": "Jane", "lastName": "Doe", "email": "jane@example.com" },
      "previousValue": { "status": "PROSPECT" },
      "newValue": { "status": "ACTIVE" },
      "ipAddress": "192.168.1.10",
      "traceId": "abc123",
      "createdAt": "2026-06-12T08:30:00Z"
    }
  ],
  "meta": { "total": 4820, "page": 1, "pageSize": 50, "totalPages": 97 }
}
```

**Errors**: `403 INSUFFICIENT_ROLE`
