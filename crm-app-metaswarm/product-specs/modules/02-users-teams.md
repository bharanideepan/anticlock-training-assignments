# Module: User & Team Management

## Overview

Administrators create and manage user accounts, assign roles, and organize users into teams. Teams define the visibility scope for data access — a user's team membership determines which records they can see.

---

## User Stories

### US-1: Create and Manage User Accounts (Priority: P1)
A System Administrator creates new user accounts, assigns roles, assigns teams, deactivates / reactivates accounts, and resets passwords on behalf of users.

**Acceptance scenarios**:
1. Admin creates user with all required fields + role → user account created, activation email sent, role enforced on first login.
2. Admin deactivates active user → user can no longer log in; data remains intact; all refresh tokens revoked.
3. Admin changes user's role → updated permissions take effect on user's next action; all refresh tokens revoked.
4. Admin resets user's password → user receives password-reset notification.

### US-2: Manage Teams (Priority: P1)
An admin creates teams, assigns a manager, and adds/removes members. Team membership drives visibility scoping for all data-access operations.

---

## Functional Requirements

- **FR-007**: Administrators MUST be able to create, update, deactivate, and reactivate user accounts.
- **FR-008**: System MUST support five roles: System Administrator, Sales Manager, Sales Representative, Support Representative, Read-Only User.
- **FR-009**: Each user MUST be assigned exactly one role at any time.
- **FR-010**: Administrators MUST be able to assign users to one or more teams.
- **FR-011**: Administrators MUST be able to reset a user's password on their behalf.

---

## API Endpoints — Users

### GET /api/v1/users
**Roles**: SYSTEM_ADMINISTRATOR, SALES_MANAGER

**Query params**: `page`, `pageSize`, `search` (name/email), `roleId`, `teamId`, `status`, `sortBy`, `sortOrder`

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
**Roles**: SYSTEM_ADMINISTRATOR

**Request**:
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

**Response 201**: Created user. Activation email sent.

**Errors**: `409 EMAIL_ALREADY_EXISTS`, `400 ROLE_NOT_FOUND`

---

### GET /api/v1/users/:id
**Roles**: SYSTEM_ADMINISTRATOR, SALES_MANAGER (own team only)

**Response 200**: Single user object.

---

### PATCH /api/v1/users/:id
**Roles**: SYSTEM_ADMINISTRATOR

**Request** (all optional): `{ "firstName": "...", "lastName": "...", "phone": "...", "jobTitle": "..." }`

**Response 200**: Updated user.

---

### POST /api/v1/users/:id/deactivate
**Roles**: SYSTEM_ADMINISTRATOR

**Response 204** — all refresh tokens revoked.

**Errors**: `404 USER_NOT_FOUND`, `409 CANNOT_DEACTIVATE_SELF`

---

### POST /api/v1/users/:id/reactivate
**Roles**: SYSTEM_ADMINISTRATOR

**Response 204**

---

### POST /api/v1/users/:id/reset-password
**Roles**: SYSTEM_ADMINISTRATOR

**Response 202** — password-reset email sent to user.

---

### PATCH /api/v1/users/:id/role
**Roles**: SYSTEM_ADMINISTRATOR

**Request**: `{ "roleId": "uuid" }`

**Response 200**: Updated user. All refresh tokens revoked.

---

### PATCH /api/v1/users/:id/teams
**Roles**: SYSTEM_ADMINISTRATOR

**Request**: `{ "teamIds": ["uuid", "uuid"] }` — replaces the entire team list.

**Response 200**: Updated user with new team list.

---

## API Endpoints — Teams

### GET /api/v1/teams
**Roles**: All authenticated

**Query params**: `page`, `pageSize`, `search`, `sortBy`, `sortOrder`

**Response 200**: Paginated list: `{ id, name, description, manager: {id, name}, memberCount }`

---

### POST /api/v1/teams
**Roles**: SYSTEM_ADMINISTRATOR

**Request**:
```json
{ "name": "West Coast Sales", "description": "Covers CA, OR, WA", "managerId": "uuid" }
```

**Response 201**: Created team.

---

### GET /api/v1/teams/:id
**Roles**: All authenticated

**Response 200**: Team with full member list.

---

### PATCH /api/v1/teams/:id
**Roles**: SYSTEM_ADMINISTRATOR

**Request**: Subset of POST fields.

**Response 200**: Updated team.

---

### DELETE /api/v1/teams/:id
**Roles**: SYSTEM_ADMINISTRATOR

Soft-deletes the team. User accounts remain; team associations are removed.

**Response 204**

---

### POST /api/v1/teams/:id/members
**Roles**: SYSTEM_ADMINISTRATOR

**Request**: `{ "userIds": ["uuid"] }`

**Response 200**: Updated member list.

---

### DELETE /api/v1/teams/:id/members/:userId
**Roles**: SYSTEM_ADMINISTRATOR

**Response 204**

---

## Frontend Pages

| Route | Component | Access |
|-------|-----------|--------|
| `/users` | `UserListPage` | ADMIN, MANAGER (view) |
| `/users/new` | `UserFormPage` | ADMIN |
| `/users/:id` | `UserDetailPage` | ADMIN, MANAGER (own team) |
| `/users/:id/edit` | `UserFormPage` | ADMIN |

### User List Page
- Columns: Name, Email, Role, Teams, Status, Created At
- Filters: Role, Team, Status, Search
- Actions: Create User button (admin only); row click → detail page

### User Detail Page
- Profile section: name, email, phone, job title, status chip
- Role section: current role with change button (admin only)
- Teams section: team list with add/remove (admin only)
- Actions: Deactivate / Reactivate, Reset Password (admin only)

---

## Business Rules

- A user must always have exactly one role.
- Changing a user's role or deactivating their account immediately revokes all their refresh tokens — their next API call will fail, forcing re-authentication.
- An admin cannot deactivate their own account (`CANNOT_DEACTIVATE_SELF`).
- Soft-deleted teams preserve historical record ownership — existing customers, opportunities, etc. retain their original `ownerId`.
- Sales Managers can view users in their own team but cannot create, edit, or deactivate users.
