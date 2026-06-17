# Module: Global Search

## Overview

Global search lets users search across all entity types (customers, contacts, opportunities, activities, tasks) from a single input. Results are grouped by type, visibility-scoped, and filterable. Backed by PostgreSQL full-text search (`tsvector` + GIN index).

---

## User Stories

### US-1: Search Across All Entities (Priority: P3)
A user types a query in the global search bar and sees matching results from multiple entity types.

**Acceptance scenarios**:
1. User searches "Acme" → results grouped by type (customers, contacts, opportunities, etc.) all containing "Acme" in their name or description.
2. User filters results to "Opportunities only" → only opportunity results displayed.
3. Search returns no results → clear "No results found" message with suggestion to broaden search.

---

## Functional Requirements

- **FR-052**: System MUST provide global search covering customers, contacts, opportunities, activities, and tasks.
- **FR-053**: Global search results MUST be filterable by entity type.
- Minimum query length: 2 characters.
- Results are visibility-scoped (FR-000).

---

## Search Coverage

| Entity | Fields Searched |
|--------|----------------|
| Customer | `companyName`, `website` |
| Contact | `firstName`, `lastName`, `email` |
| Opportunity | `name` |
| Activity | `subject`, `description` |
| Task | `title`, `description` |

---

## API Endpoint

### GET /api/v1/search
**Auth**: Bearer JWT

**Query params**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | Yes | Search query (min 2 chars) |
| `types` | string | No | Comma-separated filter: `customer,contact,opportunity,activity,task` |
| `page` | int | No | Default 1 |
| `pageSize` | int | No | Default 10 per type, max 20 |

**Response 200**:
```json
{
  "data": {
    "customers": {
      "items": [
        {
          "id": "uuid",
          "type": "customer",
          "title": "Acme Corp",
          "subtitle": "Technology · Active",
          "url": "/customers/uuid"
        }
      ],
      "total": 3
    },
    "contacts": {
      "items": [
        {
          "id": "uuid",
          "type": "contact",
          "title": "Sarah Lee",
          "subtitle": "Acme Corp · VP of Sales",
          "url": "/contacts/uuid"
        }
      ],
      "total": 1
    },
    "opportunities": {
      "items": [
        {
          "id": "uuid",
          "type": "opportunity",
          "title": "Acme Renewal",
          "subtitle": "Negotiation · $125,000",
          "url": "/opportunities/uuid"
        }
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

---

## Frontend Components

| Component | Usage |
|-----------|-------|
| `GlobalSearchBar` | Header input with autocomplete dropdown |
| `SearchResultsPage` | Full results page at `/search?q=...` |
| `SearchResultGroup` | Section per entity type in results |

### Global Search Bar (Header)
- Max 280px wide
- Debounced input: 300ms delay before firing API request
- Autocomplete dropdown shows top 3–5 results per type (summary only)
- Press Enter or "View all results" → navigate to `/search?q=...`
- Min 2 characters to trigger results

### Search Results Page (`/search`)
- Shows full results grouped by entity type
- Filter tabs: All | Customers | Contacts | Opportunities | Activities | Tasks
- Each result row: title, subtitle, entity type icon, clickable to navigate to record
- "No results found" state with suggestion to broaden the query
- Pagination per group

---

## Implementation Notes

- Customer, contact, and opportunity searches use `tsvector` columns (PostgreSQL FTS) with GIN indexes for sub-2-second performance.
- Activity and task searches fall back to `ILIKE` pattern matching on `subject`/`description` and `title`/`description` respectively (no `tsvector` on these entities in v1).
- All results are filtered by the user's team-scoped visibility before being returned.
- The `url` field in each result item can be used directly for client-side navigation.
