# Module: Notifications

## Overview

The notification system delivers in-app and email alerts for task assignments, opportunity assignments, due date reminders, overdue tasks, and customer status changes. In-app notifications are polled or streamed; email uses SMTP via Nodemailer.

---

## User Stories

### US-1: Receive and Read Notifications (Priority: P3)
Users receive in-app notifications for events relevant to them and can mark them as read individually or in bulk.

**Acceptance scenarios**:
1. Task assigned to User A → User A sees new notification in notification center AND receives email within 5 minutes.
2. Task due tomorrow → assignee receives due-date reminder notification.
3. User opens notification center → sees all unread notifications; can mark read individually or all at once.

---

## Functional Requirements

- **FR-043**: System MUST deliver in-app notifications for: task assignment, opportunity assignment, due date reminders (24 hours before), overdue tasks, and customer status changes (INACTIVE or ARCHIVED transitions for the customer's owner).
- **FR-044**: System MUST send email notifications for the same event types.
- **FR-045**: Users MUST be able to mark notifications as read individually or in bulk.

---

## Notification Types

| Type | Trigger | Recipient |
|------|---------|-----------|
| `TASK_ASSIGNED` | Task created/updated with a new assignee | The assignee (if different from creator) |
| `OPPORTUNITY_ASSIGNED` | Opportunity created/ownership changed | The new owner |
| `DUE_DATE_REMINDER` | 24 hours before task due date | The task assignee |
| `OVERDUE_TASK` | Task past due date and still OPEN | The task assignee |
| `CUSTOMER_UPDATED` | Customer status changes to INACTIVE or ARCHIVED | The customer's owner |

---

## Delivery Mechanism

- **In-app polling**: Frontend polls `GET /api/v1/notifications?unreadOnly=true` every 30 seconds.
- **SSE (real-time)**: `GET /api/v1/notifications/stream` — Server-Sent Events; connection closes after 60 seconds, client reconnects automatically. Target < 10 seconds from trigger event to in-app delivery.
- **Email**: Sent via Nodemailer (SMTP). In-process queue with retry handles transient failures.

---

## API Endpoints

### GET /api/v1/notifications
**Auth**: Bearer JWT (user-scoped — always returns only the authenticated user's notifications)

**Query params**: `page`, `pageSize` (max 50), `unreadOnly` (boolean, default false)

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "TASK_ASSIGNED",
      "title": "New task assigned to you",
      "body": "Bob Smith assigned you 'Send renewal proposal' due 2026-05-20.",
      "resourceType": "TASK",
      "resourceId": "uuid",
      "isRead": false,
      "createdAt": "2026-05-01T09:05:00Z"
    }
  ],
  "meta": { "total": 12, "unreadCount": 5, "page": 1, "pageSize": 20, "totalPages": 1 }
}
```

---

### GET /api/v1/notifications/stream
**Auth**: Bearer JWT

**Response**: `Content-Type: text/event-stream`

```
data: {"id":"uuid","type":"TASK_ASSIGNED","title":"New task assigned","isRead":false,"createdAt":"..."}

data: {"id":"uuid","type":"OVERDUE_TASK","title":"Task overdue","isRead":false,"createdAt":"..."}
```

Connection closes after 60 seconds; client reconnects automatically.

---

### POST /api/v1/notifications/:id/read
**Auth**: Bearer JWT

Marks a single notification as read.

**Response 204**

**Errors**: `404 NOTIFICATION_NOT_FOUND`, `403 NOT_YOUR_NOTIFICATION`

---

### POST /api/v1/notifications/read-all
**Auth**: Bearer JWT

Marks all unread notifications for the authenticated user as read.

**Response 204**

---

## Frontend Components

| Component | Usage |
|-----------|-------|
| `NotificationBell` | Header icon with unread count badge |
| `NotificationCenter` | Full list page at `/notifications` |
| `NotificationItem` | Single notification row with type icon and link |

### Notification Bell (Header)
- Badge shows unread count (capped at 99+)
- Click → dropdown or navigate to `/notifications`
- Refreshes count every 30 seconds or on SSE event

### Notification Center (`/notifications`)
- List of all notifications, newest first
- Unread notifications visually distinguished (bold or background)
- "Mark all as read" button at top
- Click notification → navigate to `resourceType`/`resourceId` target page
- Infinite scroll or pagination

### Notification Item
- Icon: varies by type (task icon, deal icon, calendar icon, etc.)
- Title: notification title
- Body: short description
- Time: relative timestamp ("2 hours ago")
- Read state: unread = bold/highlighted background

---

## Business Rules

- Notifications are always scoped to the authenticated user — users can never see other users' notifications.
- `resourceType` and `resourceId` link the notification to the triggering entity (used for navigation on click).
- Email delivery mirrors in-app for all notification types. Email content includes a direct link to the relevant record.
- Scheduled reminder job runs daily to detect tasks due within 24 hours (`DUE_DATE_REMINDER`) and overdue tasks (`OVERDUE_TASK`).
- A notification is created only once per event — the scheduler checks whether a reminder was already sent before creating a duplicate.
