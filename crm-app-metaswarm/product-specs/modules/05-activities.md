# Module: Activity Tracking

## Overview

Activities are logged interactions between users and customers/contacts. They form the chronological history of every engagement — calls, meetings, emails, notes, and follow-ups. The activity timeline is the primary daily-use feature for Sales Representatives and Support Representatives.

---

## User Stories

### US-1: Log Customer Interactions (Priority: P2)
A user logs a phone call, meeting, email, note, or follow-up against a customer and optionally a contact.

**Acceptance scenarios**:
1. User logs a phone call with date, duration, and notes → activity appears in customer timeline, audit entry created.
2. User edits activity notes → updated notes saved, reflected in timeline.
3. User views customer with multiple activities → all activities shown in reverse-chronological order with type, date, and description.

---

## Functional Requirements

- **FR-020**: Users MUST be able to create activity records of types: Phone Call, Meeting, Email, Note, Follow-up.
- **FR-021**: Each activity MUST be associated with a customer; contact association is optional.
- **FR-022**: Users MUST be able to edit activity records they created.
- **FR-023**: Customer activity timeline MUST be displayed in reverse-chronological order.

---

## Activity Types

| Enum Value | Display Label |
|------------|---------------|
| `PHONE_CALL` | Phone Call |
| `MEETING` | Meeting |
| `EMAIL` | Email |
| `NOTE` | Note |
| `FOLLOW_UP` | Follow-up |

---

## API Endpoints

### GET /api/v1/activities
**Roles**: All (visibility-scoped via parent customer)

**Query params**: `page`, `pageSize`, `customerId`, `contactId`, `type`, `createdById`, `fromDate`, `toDate`, `sortBy`, `sortOrder`

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

### POST /api/v1/activities
**Roles**: SYSTEM_ADMINISTRATOR, SALES_MANAGER, SALES_REPRESENTATIVE, SUPPORT_REPRESENTATIVE

**Request**:
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

**Errors**: `404 CUSTOMER_NOT_FOUND`, `404 CONTACT_NOT_FOUND`, `409 CONTACT_NOT_LINKED_TO_CUSTOMER`

---

### GET /api/v1/activities/:id
**Roles**: All (visibility-scoped via parent customer)

**Response 200**: Full activity object with attached file list.

---

### PATCH /api/v1/activities/:id
**Roles**: Owner (`createdById`) or SYSTEM_ADMINISTRATOR, SALES_MANAGER

**Request**: Any subset of POST fields.

**Response 200**: Updated activity.

**Errors**: `403 NOT_ACTIVITY_OWNER`

---

### DELETE /api/v1/activities/:id
**Roles**: Owner or SYSTEM_ADMINISTRATOR

Soft delete.

**Response 204**

---

## Frontend Pages

| Route | Component | Notes |
|-------|-----------|-------|
| `/activities` | `ActivityListPage` | Global activity feed |
| (inline dialog) | `ActivityFormDialog` | Create/edit from customer or contact detail |

### Activity List Page
- Columns: Type (chip), Subject, Customer, Contact, Created By, Scheduled At, Duration
- Filters: Type, Customer, Date range, Created By
- Row click → customer detail (activities tab) or activity detail

### Activity Form (Dialog / Page)
- Type: select (Phone Call, Meeting, Email, Note, Follow-up)
- Subject: text input (required)
- Description: textarea (optional)
- Customer: searchable select (required); pre-filled if opened from customer context
- Contact: searchable select (optional, filtered by selected customer)
- Scheduled At: date/time picker (optional)
- Duration: number input in minutes (optional)

### Activity Row (in Customer/Contact detail tabs)
Shows: type chip + subject + date + notes preview (max 80 chars, truncated with ellipsis).

---

## Business Rules

- `customerId` is required on all activities.
- `contactId` is optional — but if provided, the contact MUST belong to the same customer. If not → `409 CONTACT_NOT_LINKED_TO_CUSTOMER`.
- Only the creator (`createdById`) can edit an activity; admins and managers can override.
- Activities are displayed newest-first (reverse `createdAt`) in customer/contact timelines.
- Activities have files attached via the File module using `resourceType = ACTIVITY`.
