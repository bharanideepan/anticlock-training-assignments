# API Contract: Notifications

**Base path**: `/api/v1/notifications` | **Auth**: Bearer JWT required

Notifications are always scoped to the authenticated user.

---

## GET /api/v1/notifications

**Query params**:
| Param | Type | Description |
|-------|------|-------------|
| page | int | Default 1 |
| pageSize | int | Default 20, max 50 |
| unreadOnly | boolean | Default false |

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

## GET /api/v1/notifications/stream

**Description**: Server-Sent Events endpoint for real-time notification delivery.

**Response**: `Content-Type: text/event-stream`

```text
data: {"id":"uuid","type":"TASK_ASSIGNED","title":"New task assigned","isRead":false,"createdAt":"..."}

data: {"id":"uuid","type":"OVERDUE_TASK","title":"Task overdue","isRead":false,"createdAt":"..."}
```

Connection closes after 60 seconds; client reconnects automatically.

---

## POST /api/v1/notifications/:id/read

Marks a single notification as read.

**Response 204**.

**Errors**: `404 NOTIFICATION_NOT_FOUND`, `403 NOT_YOUR_NOTIFICATION`

---

## POST /api/v1/notifications/read-all

Marks all unread notifications as read.

**Response 204**.
