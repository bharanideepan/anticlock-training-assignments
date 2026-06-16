# Module: Customer Management

## Overview

Customers are the central entity of the CRM — they represent companies or organizations being managed. Contacts, opportunities, activities, tasks, and files all associate with a customer record. Customer visibility is team-scoped.

---

## User Stories

### US-1: Create and Manage Customers (Priority: P1)
A Sales Representative or Manager creates customer records, fills in company info, updates records, changes status, and archives inactive customers.

**Acceptance scenarios**:
1. Sales user submits new customer form → record created, creator set as owner, audit entry generated.
2. User updates status to Archived → customer removed from active lists, remains searchable with "archived" filter.
3. User applies industry filter → only matching customers displayed.
4. User searches by name → all customers with matching name/domain returned.

### US-2: Archive and Restore Customers (Priority: P1)
Archiving a customer is a terminal action that moves it out of all active views and closes all its open opportunities. Only System Administrators can restore an archived customer.

---

## Functional Requirements

- **FR-012**: Authenticated users with appropriate permission MUST be able to create, update, and view customer records.
- **FR-013**: Archived customers MUST be excluded from all default list/search views; accessible only with explicit "Archived" status filter. Only System Administrators may restore to Inactive.
- **FR-014**: Users MUST be able to search/filter customers (within visibility scope) by name, industry, status, and owner.
- **FR-015**: Each customer record MUST capture: company name, industry, website, revenue range, address, status, and owner.

---

## Status Transitions

```
PROSPECT → ACTIVE
ACTIVE   → INACTIVE
INACTIVE → ACTIVE
*        → ARCHIVED  (terminal)
ARCHIVED → INACTIVE  (admin only, via unarchive)
```

When a customer is archived: all open opportunities are automatically closed with `closeNote = "Customer archived"` and soft-deleted.

---

## API Endpoints

### GET /api/v1/customers
**Roles**: All (visibility-scoped)

**Query params**: `page`, `pageSize`, `search`, `status`, `industry`, `ownerId`, `sortBy`, `sortOrder`

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

### POST /api/v1/customers
**Roles**: SYSTEM_ADMINISTRATOR, SALES_MANAGER, SALES_REPRESENTATIVE

**Request**:
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

- `ownerId` defaults to the authenticated user's ID if omitted.
- Initial status is always `PROSPECT`.

**Response 201**: Created customer.

**Errors**: `400 OWNER_NOT_IN_VISIBILITY_SCOPE`

---

### GET /api/v1/customers/:id
**Roles**: All (visibility-scoped)

**Response 200**: Full customer object with relation counts:
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

### PATCH /api/v1/customers/:id
**Roles**: SYSTEM_ADMINISTRATOR, SALES_MANAGER, SALES_REPRESENTATIVE (owner or team)

**Request**: Any subset of POST fields (excluding `status` — use status endpoints below).

**Response 200**: Updated customer.

---

### POST /api/v1/customers/:id/status
**Roles**: SYSTEM_ADMINISTRATOR, SALES_MANAGER, SALES_REPRESENTATIVE (owner)

**Request**: `{ "status": "ACTIVE", "reason": "Contract signed" }`

**Response 200**: Updated customer.

**Errors**: `409 INVALID_STATUS_TRANSITION`

---

### POST /api/v1/customers/:id/archive
**Roles**: SYSTEM_ADMINISTRATOR, SALES_MANAGER

Sets status to ARCHIVED. All open opportunities closed with "Customer archived" note.

**Response 200**: Archived customer.

---

### POST /api/v1/customers/:id/unarchive
**Roles**: SYSTEM_ADMINISTRATOR only

Sets status to INACTIVE.

**Response 200**: Unarchived customer.

---

### GET /api/v1/customers/:id/contacts
**Roles**: All (visibility-scoped)

**Query params**: `page`, `pageSize`, `search`

**Response 200**: Paginated contact list.

---

### GET /api/v1/customers/:id/activities
**Roles**: All (visibility-scoped)

**Query params**: `page`, `pageSize`, `type`

**Response 200**: Paginated activity list (reverse-chronological).

---

### GET /api/v1/customers/:id/opportunities
**Roles**: All (visibility-scoped)

**Query params**: `page`, `pageSize`, `stageId`

**Response 200**: Paginated opportunity list.

---

### GET /api/v1/customers/:id/tasks
**Roles**: All (visibility-scoped)

**Query params**: `page`, `pageSize`, `status`

**Response 200**: Paginated task list.

---

### GET /api/v1/customers/:id/files
**Roles**: All (visibility-scoped)

**Response 200**: File list for this customer.

---

## Frontend Pages

| Route | Component | Notes |
|-------|-----------|-------|
| `/customers` | `CustomerListPage` | Paginated table with filters |
| `/customers/new` | `CustomerFormPage` | Create form |
| `/customers/:id` | `CustomerDetailPage` | Summary panel + tabs |
| `/customers/:id/edit` | `CustomerFormPage` | Pre-filled edit form |

### Customer List Page
- Columns: Company Name, Industry, Status (chip), Owner, Revenue Range, City, Created At
- Filters: Status, Industry, Owner (dropdown)
- Search: company name / website
- Row click → detail page
- "New Customer" button (for permitted roles)

### Customer Detail Page
- **Summary panel**: Company name, status chip, industry, website, revenue range, address, owner, created/updated dates
- **Actions**: Edit, Archive / Unarchive (role-gated)
- **Tabs** (lazy-loaded, max 10 records each):
  - Contacts — name, designation, email (mailto), phone (tel)
  - Activities — type chip, subject, date, notes preview
  - Opportunities — name, stage chip, revenue, close date, owner
  - Tasks — title, status chip, due date, assignee
  - Files — name, size, upload date, uploader

---

## Business Rules

- Default status on creation: `PROSPECT`. This is always enforced server-side regardless of request body.
- `ownerId` must be a user within the creating user's visibility scope.
- Archived status is terminal. Only `SYSTEM_ADMINISTRATOR` may call `/unarchive`.
- When archiving, the system atomically: sets customer status to ARCHIVED, closes all open opportunities (soft-delete + close note), fires audit events.
- Full-text search uses PostgreSQL `tsvector` on `companyName` and `website`. GIN indexed.
