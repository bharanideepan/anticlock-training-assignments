# Module: Task Management

## Overview

Tasks are actionable items assigned to users. They can be linked to a customer or opportunity and track work that needs to happen — calls to make, follow-ups to send, meetings to schedule. Overdue tasks surface prominently in the UI and dashboard.

---

## User Stories

### US-1: Create and Manage Tasks (Priority: P2)
Users create tasks, assign them to team members, link them to customers or opportunities, and mark them complete or cancelled.

**Acceptance scenarios**:
1. User creates task with type, due date, assignee, and optional customer link → task created; assignee receives notification.
2. Open task past its due date → highlighted as overdue in task list; overdue count shown on dashboard.
3. Assignee marks task as completed → status changes, task moves to completed list with completion timestamp.

---

## Functional Requirements

- **FR-032**: Users MUST be able to create tasks with type, description, due date, assignee, and optional customer/opportunity link.
- **FR-033**: System MUST support five task types: Follow-up, Call, Meeting, Email, Internal Action Item.
- **FR-034**: Assignees MUST receive a notification when a task is assigned to them.
- **FR-035**: System MUST mark tasks as overdue when due date passes without completion.
- **FR-036**: Users MUST be able to complete or cancel tasks they own or are assigned.

---

## Task Types

| Enum Value | Display Label |
|------------|---------------|
| `FOLLOW_UP` | Follow-up |
| `CALL` | Call |
| `MEETING` | Meeting |
| `EMAIL` | Email |
| `INTERNAL_ACTION` | Internal Action Item |

---

## Task Statuses

| Enum Value | Meaning |
|------------|---------|
| `OPEN` | Active, not yet done |
| `COMPLETED` | Done; `completedAt` set |
| `CANCELLED` | Abandoned; `cancelledAt` set |

**Overdue**: A task is considered overdue when `status = OPEN` AND `dueDate < now()`. This is a computed property (`isOverdue`), not a stored status.

---

## API Endpoints

### GET /api/v1/tasks
**Roles**: All (visibility-scoped via assignee or linked customer)

**Query params**: `page`, `pageSize`, `status`, `type`, `assigneeId`, `customerId`, `opportunityId`, `overdue` (boolean), `dueDateFrom`, `dueDateTo`, `sortBy`, `sortOrder`

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

### POST /api/v1/tasks
**Roles**: SYSTEM_ADMINISTRATOR, SALES_MANAGER, SALES_REPRESENTATIVE, SUPPORT_REPRESENTATIVE

**Request**:
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

- `assigneeId` defaults to the authenticated user.
- `TASK_ASSIGNED` notification sent to assignee if different from creator.

**Response 201**: Created task.

---

### GET /api/v1/tasks/:id
**Roles**: All (visibility-scoped via assignee or linked customer)

**Response 200**: Full task object.

---

### PATCH /api/v1/tasks/:id
**Roles**: Creator or assignee or SYSTEM_ADMINISTRATOR, SALES_MANAGER

**Request**: Any subset of POST fields (excluding `status` — use action endpoints below).

**Response 200**: Updated task.

---

### POST /api/v1/tasks/:id/complete
**Roles**: Creator or assignee or SYSTEM_ADMINISTRATOR

**Response 200**: Task with `status: COMPLETED`, `completedAt` set.

**Errors**: `409 TASK_NOT_OPEN`

---

### POST /api/v1/tasks/:id/cancel
**Roles**: Creator or assignee or SYSTEM_ADMINISTRATOR

**Response 200**: Task with `status: CANCELLED`, `cancelledAt` set.

**Errors**: `409 TASK_NOT_OPEN`

---

## Frontend Pages

| Route | Component | Notes |
|-------|-----------|-------|
| `/tasks` | `TaskListPage` | Paginated list with filters |
| (dialog) | `TaskFormDialog` | Create/edit from any context |

### Task List Page
- Columns: Title, Type (chip), Status (chip), Due Date (highlighted red if overdue), Assignee, Customer, Opportunity
- Filters: Status, Type, Assignee, Customer, Due Date range, Overdue toggle
- Row click → task detail or inline expand
- "New Task" button (for permitted roles)
- Overdue tasks visually highlighted (red row accent or badge)

### Task Form (Dialog)
- Type: select (required)
- Title: text input (required)
- Description: textarea (optional)
- Due Date: date/time picker (required)
- Assignee: user searchable select (defaults to self)
- Customer: searchable select (optional)
- Opportunity: searchable select (optional, filtered by selected customer)

### Task Row (in Customer/Opportunity detail tabs)
Shows: title, status chip, due date (red if overdue), assignee name.

---

## Business Rules

- Only `OPEN` tasks can be completed or cancelled. Attempting on non-OPEN tasks returns `409 TASK_NOT_OPEN`.
- `isOverdue` is computed as `status === OPEN && dueDate < now()` — it is returned in the API response but not stored.
- When a task is assigned to a user other than the creator, a `TASK_ASSIGNED` notification is automatically sent.
- READ_ONLY users cannot create, edit, complete, or cancel tasks.
- Tasks linked to a deleted customer or opportunity are preserved for historical record.
- Overdue detection for reminders runs as a scheduled job — sends `OVERDUE_TASK` notifications to assignees.
