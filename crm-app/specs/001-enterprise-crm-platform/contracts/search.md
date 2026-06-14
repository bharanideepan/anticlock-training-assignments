# API Contract: Global Search

**Base path**: `/api/v1/search` | **Auth**: Bearer JWT required

Results are visibility-scoped (FR-000).

---

## GET /api/v1/search

**Query params**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| q | string | Yes | Search query (min 2 chars) |
| types | string | No | Comma-separated: customer,contact,opportunity,activity,task |
| page | int | No | Default 1 |
| pageSize | int | No | Default 10 per type, max 20 |

**Response 200**:
```json
{
  "data": {
    "customers": {
      "items": [
        { "id": "uuid", "type": "customer", "title": "Acme Corp", "subtitle": "Technology · Active", "url": "/customers/uuid" }
      ],
      "total": 3
    },
    "contacts": {
      "items": [
        { "id": "uuid", "type": "contact", "title": "Sarah Lee", "subtitle": "Acme Corp · VP of Sales", "url": "/contacts/uuid" }
      ],
      "total": 1
    },
    "opportunities": {
      "items": [
        { "id": "uuid", "type": "opportunity", "title": "Acme Renewal", "subtitle": "Negotiation · $125,000", "url": "/opportunities/uuid" }
      ],
      "total": 2
    },
    "activities": { "items": [], "total": 0 },
    "tasks": { "items": [], "total": 0 }
  },
  "query": "acme",
  "totalResults": 6
}
```

**Errors**: `400 QUERY_TOO_SHORT` (< 2 characters)
