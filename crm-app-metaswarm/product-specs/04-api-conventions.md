# API Conventions

## Base URL

```
/api/v1/
```

Swagger UI: `GET /api/v1/docs`

---

## Authentication

All endpoints require a valid JWT access token except those marked **Public**.

```
Authorization: Bearer <access-token>
```

**Access token TTL**: 15 minutes
**Refresh token**: Stored in `httpOnly; Secure; SameSite=Strict` cookie named `crm_refresh`; TTL 7 days; rotated on every use.

---

## Response Envelope

### Success
```json
{ "data": <payload> }
```

### Paginated Success
```json
{
  "data": [ ... ],
  "meta": {
    "total": 1500,
    "page": 1,
    "pageSize": 20,
    "totalPages": 75
  }
}
```

### Error
```json
{
  "error": {
    "code": "CUSTOMER_NOT_FOUND",
    "message": "No customer with that ID exists or you do not have access."
  }
}
```

---

## Pagination (all list endpoints)

| Query param | Type | Default | Max | Description |
|-------------|------|---------|-----|-------------|
| `page` | int | 1 | — | Page number (1-indexed) |
| `pageSize` | int | 20 | 100 | Records per page |
| `sortBy` | string | varies | — | Column name to sort by |
| `sortOrder` | `asc` or `desc` | varies | — | Sort direction |

No unbounded queries are permitted. Every list endpoint is paginated.

---

## Common Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Full-text search (field varies per endpoint) |
| `fromDate` | ISO 8601 | Date range start (inclusive) |
| `toDate` | ISO 8601 | Date range end (inclusive) |
| `ownerId` | UUID | Filter by owning user |
| `status` | enum | Filter by entity status |

---

## Standard HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success (GET, PATCH) |
| 201 | Created (POST creating a resource) |
| 202 | Accepted (async operation started, e.g., import) |
| 204 | No content (DELETE, action endpoints with no response body) |
| 400 | Bad request / validation failure |
| 401 | Unauthenticated (missing or invalid token) |
| 403 | Forbidden (authenticated but insufficient role or visibility) |
| 404 | Resource not found |
| 409 | Conflict (duplicate, invalid state transition) |
| 500 | Internal server error |

---

## Standard Error Codes

| Code | HTTP | When |
|------|------|------|
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `REFRESH_TOKEN_INVALID` | 401 | Invalid or revoked refresh token |
| `REFRESH_TOKEN_EXPIRED` | 401 | Refresh token past TTL |
| `ROLE_NOT_PERMITTED` | 403 | Action not allowed for this role |
| `ACCOUNT_INACTIVE` | 403 | Deactivated account tried to log in |
| `ACCESS_DENIED` | 403 | Record exists but outside visibility scope |
| `INSUFFICIENT_ROLE` | 403 | Route requires a higher role |
| `CUSTOMER_NOT_FOUND` | 404 | Customer does not exist |
| `CONTACT_NOT_FOUND` | 404 | Contact does not exist |
| `OPPORTUNITY_NOT_FOUND` | 404 | Opportunity does not exist |
| `TASK_NOT_FOUND` | 404 | Task does not exist |
| `FILE_NOT_FOUND` | 404 | File does not exist |
| `USER_NOT_FOUND` | 404 | User does not exist |
| `STAGE_NOT_FOUND` | 404 | Pipeline stage does not exist |
| `NOTIFICATION_NOT_FOUND` | 404 | Notification does not exist |
| `EMAIL_ALREADY_EXISTS` | 409 | User creation with duplicate email |
| `INVALID_STATUS_TRANSITION` | 409 | Attempted disallowed status change |
| `STAGE_IS_TERMINAL` | 409 | Tried to move to terminal stage via move endpoint |
| `STAGE_HAS_ACTIVE_OPPORTUNITIES` | 409 | Tried to delete a stage with active opportunities |
| `TASK_NOT_OPEN` | 409 | Tried to complete/cancel a task that's not OPEN |
| `CANNOT_DEACTIVATE_SELF` | 409 | Admin tried to deactivate their own account |
| `CANNOT_MODIFY_TERMINAL_STAGE` | 409 | Tried to edit a Won/Lost stage |
| `TOKEN_INVALID_OR_EXPIRED` | 400 | Password reset token invalid or used |
| `CURRENT_PASSWORD_INCORRECT` | 400 | Old password doesn't match on change |
| `QUERY_TOO_SHORT` | 400 | Search query under 2 characters |
| `OWNER_NOT_IN_VISIBILITY_SCOPE` | 400 | Assigned owner is outside requesting user's scope |
| `NOT_ACTIVITY_OWNER` | 403 | Non-owner tried to edit an activity |
| `NOT_YOUR_NOTIFICATION` | 403 | Tried to read another user's notification |
| `CONTACT_NOT_LINKED_TO_CUSTOMER` | 409 | Activity contact doesn't belong to activity customer |
| `CUSTOMER_NOT_IN_VISIBILITY_SCOPE` | 403 | Contact's customer is outside requester's scope |
| `SSO_ASSERTION_INVALID` | 401 | SSO callback assertion failed validation |
| `USER_NOT_PROVISIONED` | 403 | SSO email matched no CRM user |

---

## Visibility Scoping

All list and fetch endpoints automatically apply the authenticated user's team-scoped visibility filter:

- **SYSTEM_ADMINISTRATOR**: No filter applied — sees all records.
- **SALES_MANAGER**: Sees records owned by any user in their team(s).
- **SALES_REPRESENTATIVE / SUPPORT_REPRESENTATIVE / READ_ONLY**: Sees records owned by themselves or any member of their team.

Visibility is always enforced server-side. The filter is derived from the JWT payload (`role`, `teamIds`) and injected into every Prisma query's `where` clause.

---

## Soft Delete Behaviour

Deleted records (those with `deletedAt` set) are excluded from all queries automatically via Prisma client extension. They do not appear in list pages, search results, or counts — but are preserved in the database for audit and referential integrity purposes.

Exception: **AuditLog** is never soft-deleted (immutable by design).

---

## Audit Triggers

The following operations automatically create an `AuditLog` entry:

- User login / logout / failed login / password reset
- Record created (any auditable entity)
- Record updated (field change recorded in `previousValue` / `newValue`)
- Record deleted (soft delete)
- Status changed (e.g., PROSPECT → ACTIVE)
- Ownership changed
- Role changed
- CSV import completed

---

## Idempotency Notes

- `POST /api/v1/notifications/read-all` — safe to call multiple times (no-op if already all-read).
- Password reset and SSO callback endpoints consume their tokens on use — not idempotent.
- Import confirmation (`POST /api/v1/files/confirm`) — idempotent for same `fileId`.
