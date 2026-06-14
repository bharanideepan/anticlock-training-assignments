# API Contract: Tasks

**Base path**: `/api/v1/tasks` | **Auth**: Bearer JWT required

---

## GET /api/v1/tasks

**Roles**: All (visibility-scoped)

**Query params**:
| Param | Type | Description |
|-------|------|-------------|
| page | int | Default 1 |
| pageSize | int | Default 20, max 100 |
| status | TaskStatus | OPEN\|COMPLETED\|CANCELLED |
| type | TaskType | FOLLOW_UP\|CALL\|MEETING\|EMAIL\|INTERNAL_ACTION |
| assigneeId | uuid | Filter by assignee |
| customerId | uuid | Filter by linked customer |
| opportunityId | uuid | Filter by linked opportunity |
| overdue | boolean | true = only tasks past dueDate with status OPEN |
| dueDateFrom | ISO8601 | Due date from |
| dueDateTo | ISO8601 | Due date to |
| sortBy | string | Default: dueDate |
| sortOrder | asc\|desc | Default: asc |

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "FOLLOW_UP",
      "title": "Send renewal proposal",
      "description": "Follow up after the meeting on the 10th.",
      "status": "OPEN",
      "dueDate": "2026-05-20T17:00:00Z",
      "isOverdue": true,
      "assignee": { "id": "uuid", "firstName": "Jane", "lastName": "Doe" },
      "createdBy": { "id": "uuid", "firstName": "Bob", "lastName": "Smith" },
      "customer": { "id": "uuid", "companyName": "Acme Corp" },
      "opportunity": { "id": "uuid", "name": "Acme Renewal" },
      "createdAt": "2026-05-01T09:00:00Z"
    }
  ],
  "meta": { "total": 28, "page": 1, "pageSize": 20, "totalPages": 2 }
}
```

---

## POST /api/v1/tasks

**Roles**: `SYSTEM_ADMINISTRATOR`, `SALES_MANAGER`, `SALES_REPRESENTATIVE`, `SUPPORT_REPRESENTATIVE`

**Request body**:
```json
{
  "type": "CALL",
  "title": "Introductory call",
  "description": "First contact with the new procurement lead.",
  "dueDate": "2026-06-05T15:00:00Z",
  "assigneeId": "uuid",
  "customerId": "uuid",
  "opportunityId": "uuid"
}
```

`assigneeId` defaults to authenticated user.

**Response 201**: Created task. `TASK_ASSIGNED` notification sent to assignee if different from creator.

---

## GET /api/v1/tasks/:id

**Roles**: All (visibility-scoped via assignee or linked customer)

**Response 200**: Full task object.

---

## PATCH /api/v1/tasks/:id

**Roles**: Creator or assignee or `SYSTEM_ADMINISTRATOR`, `SALES_MANAGER`

**Request body**: Any subset of POST fields (excluding `status` — use action endpoints).

**Response 200**: Updated task.

---

## POST /api/v1/tasks/:id/complete

**Roles**: Creator or assignee or `SYSTEM_ADMINISTRATOR`

**Response 200**: Task with `status: COMPLETED`, `completedAt` set.

**Errors**: `409 TASK_NOT_OPEN`

---

## POST /api/v1/tasks/:id/cancel

**Roles**: Creator or assignee or `SYSTEM_ADMINISTRATOR`

**Response 200**: Task with `status: CANCELLED`, `cancelledAt` set.

**Errors**: `409 TASK_NOT_OPEN`
