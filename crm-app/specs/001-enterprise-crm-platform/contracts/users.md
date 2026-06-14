# API Contract: Users & Teams

**Base paths**: `/api/v1/users`, `/api/v1/teams` | **Auth**: Bearer JWT required on all endpoints

---

## Users

### GET /api/v1/users

**Roles**: `SYSTEM_ADMINISTRATOR`, `SALES_MANAGER`

**Query params**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | int | 1 | Page number |
| pageSize | int | 20 | Max 100 |
| search | string | — | Matches firstName, lastName, email |
| roleId | uuid | — | Filter by role |
| teamId | uuid | — | Filter by team |
| status | ACTIVE\|INACTIVE | — | Filter by status |
| sortBy | string | createdAt | Field to sort |
| sortOrder | asc\|desc | desc | Sort direction |

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "jane@example.com",
      "firstName": "Jane",
      "lastName": "Doe",
      "phone": "+1-555-0200",
      "jobTitle": "Sales Rep",
      "status": "ACTIVE",
      "role": { "id": "uuid", "name": "SALES_REPRESENTATIVE" },
      "teams": [{ "id": "uuid", "name": "East Sales" }],
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ],
  "meta": { "total": 42, "page": 1, "pageSize": 20, "totalPages": 3 }
}
```

---

### POST /api/v1/users

**Roles**: `SYSTEM_ADMINISTRATOR`

**Request body**:
```json
{
  "email": "newuser@example.com",
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+1-555-0300",
  "jobTitle": "Sales Manager",
  "roleId": "uuid",
  "teamIds": ["uuid"]
}
```

**Response 201**: Created user object (same shape as list item). Activation email sent.

**Errors**: `409 EMAIL_ALREADY_EXISTS`, `400 ROLE_NOT_FOUND`

---

### GET /api/v1/users/:id

**Roles**: `SYSTEM_ADMINISTRATOR`, `SALES_MANAGER` (own team only)

**Response 200**: Single user object.

---

### PATCH /api/v1/users/:id

**Roles**: `SYSTEM_ADMINISTRATOR`

**Request body** (all optional):
```json
{
  "firstName": "Jonathan",
  "lastName": "Smith",
  "phone": "+1-555-0301",
  "jobTitle": "Senior Sales Manager"
}
```

**Response 200**: Updated user.

---

### POST /api/v1/users/:id/deactivate

**Roles**: `SYSTEM_ADMINISTRATOR`

**Response 204**. All refresh tokens revoked.

**Errors**: `404 USER_NOT_FOUND`, `409 CANNOT_DEACTIVATE_SELF`

---

### POST /api/v1/users/:id/reactivate

**Roles**: `SYSTEM_ADMINISTRATOR`

**Response 204**.

---

### POST /api/v1/users/:id/reset-password

**Roles**: `SYSTEM_ADMINISTRATOR`

**Response 202**. Password-reset email sent to user.

---

### PATCH /api/v1/users/:id/role

**Roles**: `SYSTEM_ADMINISTRATOR`

**Request body**: `{ "roleId": "uuid" }`

**Response 200**: Updated user. All refresh tokens revoked.

---

### PATCH /api/v1/users/:id/teams

**Roles**: `SYSTEM_ADMINISTRATOR`

**Request body**: `{ "teamIds": ["uuid", "uuid"] }` (replaces entire team list)

**Response 200**: Updated user with new team list.

---

## Teams

### GET /api/v1/teams

**Roles**: All authenticated

**Query params**: `page`, `pageSize`, `search`, `sortBy`, `sortOrder`

**Response 200**: Paginated list of teams `{ id, name, description, manager, memberCount }`.

---

### POST /api/v1/teams

**Roles**: `SYSTEM_ADMINISTRATOR`

**Request body**:
```json
{
  "name": "West Coast Sales",
  "description": "Covers CA, OR, WA",
  "managerId": "uuid"
}
```

**Response 201**: Created team.

---

### GET /api/v1/teams/:id

**Roles**: All authenticated

**Response 200**: Team with full member list.

---

### PATCH /api/v1/teams/:id

**Roles**: `SYSTEM_ADMINISTRATOR`

**Request body**: subset of POST fields.

**Response 200**: Updated team.

---

### DELETE /api/v1/teams/:id

**Roles**: `SYSTEM_ADMINISTRATOR`

Soft-deletes the team. Users remain; team associations are removed.

**Response 204**.

---

### POST /api/v1/teams/:id/members

**Roles**: `SYSTEM_ADMINISTRATOR`

**Request body**: `{ "userIds": ["uuid"] }`

**Response 200**: Updated team member list.

---

### DELETE /api/v1/teams/:id/members/:userId

**Roles**: `SYSTEM_ADMINISTRATOR`

**Response 204**.
