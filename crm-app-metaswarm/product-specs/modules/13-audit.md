# Module: Audit Logging

## Overview

The Audit Log is an immutable, append-only record of every significant system event. It is automatically populated by Prisma middleware on all mutating operations and by AuthService for auth events. System Administrators can search and view the audit trail.

---

## User Stories

### US-1: View Audit Trail (Priority: P3)
An administrator searches the audit log to review system events — logins, record changes, status transitions, ownership changes.

**Acceptance scenarios**:
1. Admin filters audit log by resource type "Customer" and date range → all matching audit entries returned in reverse-chronological order.
2. Admin views a specific entry → sees actor identity, timestamp, resource type, resource ID, action, and changed values.
3. Non-admin user attempts to access audit log → denied with 403.

---

## Functional Requirements

- **FR-049**: System MUST generate an immutable audit entry for: login, logout, record creation, record modification, record deletion, ownership changes, and status changes.
- **FR-050**: Audit entries MUST capture: actor, timestamp, resource type, resource ID, action, previous value, new value, and IP address.
- **FR-051**: Administrators MUST be able to search audit logs by resource type, actor, and date range.

---

## What Gets Logged

| Trigger | Action Value |
|---------|-------------|
| User logs in | `LOGIN` |
| User logs out | `LOGOUT` |
| Failed login attempt | `LOGIN_FAILED` |
| Password reset completed | `PASSWORD_RESET` |
| Any auditable record created | `RECORD_CREATED` |
| Any auditable record updated | `RECORD_UPDATED` |
| Any auditable record deleted (soft) | `RECORD_DELETED` |
| Customer/opportunity status changed | `STATUS_CHANGED` |
| Opportunity/customer owner changed | `OWNERSHIP_CHANGED` |
| User role changed | `ROLE_CHANGED` |
| CSV import completed | `IMPORT_COMPLETED` |

**Auditable entities**: User, Team, Customer, Contact, Activity, Opportunity, PipelineStage, Task, File

**Actor**: The `userId` from the JWT token at time of request. Null for system-initiated events (e.g., scheduled overdue task closure).

---

## Audit Log Entry Structure

| Field | Description |
|-------|-------------|
| `id` | UUID, PK |
| `actorId` | User who performed the action (null for system events) |
| `action` | AuditAction enum value |
| `resourceType` | Entity type (e.g., "CUSTOMER", "OPPORTUNITY") |
| `resourceId` | UUID of the affected record |
| `previousValue` | Full record snapshot before the change (JSON) |
| `newValue` | Full record snapshot after the change (JSON) |
| `ipAddress` | Client IP from the request |
| `traceId` | Correlates to request log entry |
| `createdAt` | UTC timestamp |

**AuditLog is never soft-deleted and never updated — immutable by design.**

---

## API Endpoint

### GET /api/v1/audit/logs
**Auth**: Bearer JWT — SYSTEM_ADMINISTRATOR only

**Query params**:
| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Default 1 |
| `pageSize` | int | Default 50, max 100 |
| `actorId` | UUID | Filter by actor |
| `resourceType` | string | Filter by resource type (e.g., CUSTOMER) |
| `resourceId` | UUID | Filter by specific resource |
| `action` | AuditAction | Filter by action type |
| `fromDate` | ISO 8601 | Events after this date |
| `toDate` | ISO 8601 | Events before this date |
| `sortOrder` | asc/desc | Default: desc |

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

---

## Frontend Page

| Route | Component | Access |
|-------|-----------|--------|
| `/audit` | `AuditLogPage` | SYSTEM_ADMINISTRATOR only |

### Audit Log Page
- Filters: Actor (user search), Resource Type (dropdown), Action (dropdown), Date range
- Table columns: Timestamp, Actor, Action, Resource Type, Resource ID (linked), Changed Fields
- Click a row → expand to show `previousValue` and `newValue` diff
- Export to CSV (optional, admin convenience)

---

## Implementation Notes

- Audit writes use Prisma middleware that intercepts `create`, `update`, and `delete` operations on auditable models.
- The current actor's `userId` is propagated via Node.js `AsyncLocalStorage`, set in `JwtAuthGuard` at request entry. No manual threading through service layers.
- Auth events (LOGIN, LOGOUT, LOGIN_FAILED, PASSWORD_RESET) are written directly by `AuthService` (not via Prisma middleware).
- `previousValue` and `newValue` are stored as full JSON snapshots, not diff patches — this allows future replay or forensic analysis.
- No retention policy enforced in v1 (audit log grows unboundedly). Partitioning or archiving is a future concern.
