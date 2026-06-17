# Module: Contact Management

## Overview

Contacts are individual people associated with a customer company. They are the primary human touchpoints for deals and interactions. Contacts inherit visibility from their parent customer.

---

## User Stories

### US-1: Create and Manage Contacts (Priority: P1)
A user creates a contact record linked to an existing customer, fills in personal/professional details, and updates as needed.

**Acceptance scenarios**:
1. User creates contact linked to customer → contact appears in customer's contact list and global contact list.
2. User updates phone number → change saved, audit record created.
3. User views contact with recorded activities → interaction history shown in reverse-chronological order.

---

## Functional Requirements

- **FR-016**: Users MUST be able to create and update contact records associated with a customer.
- **FR-017**: Each contact MUST capture: full name, email, phone number, designation, department, and notes.
- **FR-018**: Users MUST be able to search contacts by name or email.
- **FR-019**: Contact's interaction history MUST be displayed in reverse-chronological order.

---

## API Endpoints

### GET /api/v1/contacts
**Roles**: All (visibility-scoped via parent customer)

**Query params**: `page`, `pageSize`, `search` (name, email), `customerId`, `sortBy`, `sortOrder`

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

### POST /api/v1/contacts
**Roles**: SYSTEM_ADMINISTRATOR, SALES_MANAGER, SALES_REPRESENTATIVE, SUPPORT_REPRESENTATIVE

**Request**:
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

### GET /api/v1/contacts/:id
**Roles**: All (visibility-scoped via parent customer)

**Response 200**:
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

### PATCH /api/v1/contacts/:id
**Roles**: SYSTEM_ADMINISTRATOR, SALES_MANAGER, SALES_REPRESENTATIVE, SUPPORT_REPRESENTATIVE

**Request**: Any subset of POST fields (excluding `customerId` — contact cannot be re-linked to a different customer).

**Response 200**: Updated contact.

---

### DELETE /api/v1/contacts/:id
**Roles**: SYSTEM_ADMINISTRATOR, SALES_MANAGER

Soft delete. Contact remains in activity/opportunity history.

**Response 204**

---

### GET /api/v1/contacts/:id/activities
**Roles**: All (visibility-scoped)

**Query params**: `page`, `pageSize`, `type`

**Response 200**: Paginated activity list (reverse-chronological).

---

## Frontend Pages

| Route | Component | Notes |
|-------|-----------|-------|
| `/contacts` | `ContactListPage` | Paginated table |
| `/contacts/new` | `ContactFormPage` | Create form (customerId pre-filled if coming from customer detail) |
| `/contacts/:id` | `ContactDetailPage` | Summary panel + tabs |
| `/contacts/:id/edit` | `ContactFormPage` | Pre-filled edit form |

### Contact List Page
- Columns: Full Name, Email, Phone, Designation, Department, Company, Created At
- Filters: Customer (dropdown), Search
- Row click → detail page
- "New Contact" button (for permitted roles)

### Contact Detail Page
- **Summary panel**: Full name, designation, department, company (linked), notes
  - Email: displayed as clickable `mailto:` link with mail icon
  - Phone: displayed as clickable `tel:` link with phone icon
  - If field is empty: show "—" (not omit the row)
- **Actions**: Edit button (role-gated), Delete (admin/manager only)
- **Tabs** (lazy-loaded, max 10 records each):
  - Activities — type chip, subject, date, notes preview; "Log Activity" button pre-linked to this contact
  - Opportunities — name (clickable), stage chip, revenue, close date

---

## Business Rules

- A contact is always linked to exactly one customer and cannot be re-linked (`customerId` is immutable after creation).
- Contact visibility is derived from the parent customer's visibility — if you can see the customer, you can see its contacts.
- Soft-deleted contacts remain in activity and opportunity records for historical accuracy.
- Full-text search uses PostgreSQL `tsvector` on `firstName`, `lastName`, and `email`. GIN indexed.
