# Data Model

## Entity Relationship Overview

```
User ──────────────── Role (many-to-one)
User ──────────────── Team (many-to-many via TeamMember)
Customer ──────────── User as owner (many-to-one)
Contact ───────────── Customer (many-to-one)
Activity ──────────── Customer (many-to-one)
Activity ──────────── Contact (optional many-to-one)
Opportunity ────────── Customer (many-to-one)
Opportunity ────────── Contact (optional many-to-one)
Opportunity ────────── PipelineStage (many-to-one)
Opportunity ────────── User as owner (many-to-one)
Task ───────────────── User as assignee (many-to-one)
Task ───────────────── Customer (optional many-to-one)
Task ───────────────── Opportunity (optional many-to-one)
Notification ───────── User (many-to-one)
File ───────────────── Polymorphic (resourceType + resourceId)
AuditLog ───────────── Polymorphic (resourceType + resourceId)
RefreshToken ───────── User (many-to-one)
ImportJob ──────────── User as uploader (many-to-one)
```

---

## Entities

### User

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, default uuid() | |
| email | String | UNIQUE, NOT NULL | Lowercase; login identifier |
| passwordHash | String? | nullable | Null for SSO-only users |
| firstName | String | NOT NULL | |
| lastName | String | NOT NULL | |
| phone | String? | nullable | |
| jobTitle | String? | nullable | |
| status | UserStatus | NOT NULL, default ACTIVE | |
| roleId | UUID | FK → Role.id, NOT NULL | |
| createdAt | DateTime | NOT NULL, default now() | |
| updatedAt | DateTime | NOT NULL, @updatedAt | |
| deletedAt | DateTime? | nullable | Soft delete |

**Enum UserStatus**: `ACTIVE`, `INACTIVE`

**Indexes**: `email` (unique), `roleId`, `status`, `deletedAt`

---

### Role

System-seeded — not user-creatable via API.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | RoleName | UNIQUE, NOT NULL |

**Enum RoleName**: `SYSTEM_ADMINISTRATOR`, `SALES_MANAGER`, `SALES_REPRESENTATIVE`, `SUPPORT_REPRESENTATIVE`, `READ_ONLY`

---

### Team

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | String | UNIQUE, NOT NULL |
| description | String? | nullable |
| managerId | UUID? | FK → User.id, nullable |
| createdAt | DateTime | NOT NULL |
| updatedAt | DateTime | NOT NULL |
| deletedAt | DateTime? | nullable |

---

### TeamMember (junction)

| Column | Type | Constraints |
|--------|------|-------------|
| userId | UUID | PK (composite), FK → User.id |
| teamId | UUID | PK (composite), FK → Team.id |
| joinedAt | DateTime | NOT NULL, default now() |

---

### Customer

Central CRM entity representing a company or organization.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| companyName | String | NOT NULL | |
| industry | String? | nullable | |
| website | String? | nullable | URL |
| revenueRange | RevenueRange? | nullable | |
| addressLine1 | String? | nullable | |
| addressLine2 | String? | nullable | |
| city | String? | nullable | |
| state | String? | nullable | |
| country | String? | nullable | |
| postalCode | String? | nullable | |
| status | CustomerStatus | NOT NULL, default PROSPECT | |
| ownerId | UUID | FK → User.id, NOT NULL | |
| searchVector | tsvector? | | Updated by DB trigger |
| createdAt | DateTime | NOT NULL | |
| updatedAt | DateTime | NOT NULL | |
| deletedAt | DateTime? | nullable | |

**Enum CustomerStatus**: `PROSPECT`, `ACTIVE`, `INACTIVE`, `ARCHIVED`

**Enum RevenueRange**: `UNDER_1M`, `1M_10M`, `10M_50M`, `50M_250M`, `OVER_250M`

**Status transitions**:
```
PROSPECT → ACTIVE
ACTIVE   → INACTIVE
INACTIVE → ACTIVE
*        → ARCHIVED  (terminal; only SystemAdmin may reverse to INACTIVE)
```

**Indexes**: `(status, ownerId, deletedAt)` B-tree composite, `searchVector` GIN

---

### Contact

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| firstName | String | NOT NULL |
| lastName | String | NOT NULL |
| email | String? | nullable |
| phone | String? | nullable |
| designation | String? | nullable |
| department | String? | nullable |
| notes | String? | nullable |
| customerId | UUID | FK → Customer.id, NOT NULL |
| searchVector | tsvector? | Updated by DB trigger |
| createdAt | DateTime | NOT NULL |
| updatedAt | DateTime | NOT NULL |
| deletedAt | DateTime? | nullable |

**Indexes**: `(customerId, deletedAt)` B-tree, `searchVector` GIN

---

### Activity

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| type | ActivityType | NOT NULL |
| subject | String | NOT NULL |
| description | String? | nullable |
| scheduledAt | DateTime? | nullable |
| durationMinutes | Int? | nullable |
| customerId | UUID | FK → Customer.id, NOT NULL |
| contactId | UUID? | FK → Contact.id, nullable |
| createdById | UUID | FK → User.id, NOT NULL |
| createdAt | DateTime | NOT NULL |
| updatedAt | DateTime | NOT NULL |
| deletedAt | DateTime? | nullable |

**Enum ActivityType**: `PHONE_CALL`, `MEETING`, `EMAIL`, `NOTE`, `FOLLOW_UP`

**Indexes**: `(customerId, createdAt DESC)` B-tree, `contactId`, `createdById`, `deletedAt`

---

### PipelineStage

Admin-configurable. Seeded with six default stages.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| name | String | NOT NULL | |
| displayOrder | Int | NOT NULL | Position in pipeline |
| isDefault | Boolean | NOT NULL, default false | Assigned to new opportunities |
| isTerminal | Boolean | NOT NULL, default false | Won/Lost stages |
| terminalOutcome | TerminalOutcome? | nullable | Only on terminal stages |
| createdAt | DateTime | NOT NULL | |
| updatedAt | DateTime | NOT NULL | |
| deletedAt | DateTime? | nullable | Only deletable if no active opportunities |

**Enum TerminalOutcome**: `WON`, `LOST`

**Seeded defaults**: Lead (order 1), Qualified (2), Proposal (3), Negotiation (4), Won (5, terminal, WON), Lost (6, terminal, LOST)

---

### Opportunity

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | String | NOT NULL |
| customerId | UUID | FK → Customer.id, NOT NULL |
| contactId | UUID? | FK → Contact.id, nullable |
| ownerId | UUID | FK → User.id, NOT NULL |
| stageId | UUID | FK → PipelineStage.id, NOT NULL |
| expectedRevenue | Decimal(15,2)? | nullable |
| probability | Int? | 0–100, nullable |
| expectedCloseDate | DateTime? | nullable |
| actualCloseDate | DateTime? | nullable |
| closeNote | String? | nullable |
| searchVector | tsvector? | Updated by DB trigger |
| createdAt | DateTime | NOT NULL |
| updatedAt | DateTime | NOT NULL |
| deletedAt | DateTime? | nullable |

**Business rules**:
- `actualCloseDate` is set when the opportunity moves to a terminal stage.
- When a customer is archived, all open opportunities are closed with `closeNote = "Customer archived"` and `deletedAt` is set.
- New opportunities default to the stage where `isDefault = true` (Lead).

**Indexes**: `(stageId, ownerId, deletedAt)` B-tree, `customerId`, `expectedCloseDate`, `searchVector` GIN

---

### Task

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| type | TaskType | NOT NULL |
| title | String | NOT NULL |
| description | String? | nullable |
| status | TaskStatus | NOT NULL, default OPEN |
| dueDate | DateTime | NOT NULL |
| completedAt | DateTime? | nullable |
| cancelledAt | DateTime? | nullable |
| assigneeId | UUID | FK → User.id, NOT NULL |
| createdById | UUID | FK → User.id, NOT NULL |
| customerId | UUID? | FK → Customer.id, nullable |
| opportunityId | UUID? | FK → Opportunity.id, nullable |
| createdAt | DateTime | NOT NULL |
| updatedAt | DateTime | NOT NULL |
| deletedAt | DateTime? | nullable |

**Enum TaskType**: `FOLLOW_UP`, `CALL`, `MEETING`, `EMAIL`, `INTERNAL_ACTION`

**Enum TaskStatus**: `OPEN`, `COMPLETED`, `CANCELLED`

**State transitions**: `OPEN → COMPLETED`, `OPEN → CANCELLED`

**Indexes**: `(assigneeId, status, dueDate)` B-tree, `customerId`, `opportunityId`, `deletedAt`

---

### Notification

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| userId | UUID | FK → User.id, NOT NULL |
| type | NotificationType | NOT NULL |
| title | String | NOT NULL |
| body | String | NOT NULL |
| resourceType | String? | nullable |
| resourceId | UUID? | nullable |
| isRead | Boolean | NOT NULL, default false |
| readAt | DateTime? | nullable |
| createdAt | DateTime | NOT NULL |

**Enum NotificationType**: `TASK_ASSIGNED`, `OPPORTUNITY_ASSIGNED`, `DUE_DATE_REMINDER`, `OVERDUE_TASK`, `CUSTOMER_UPDATED`

**Indexes**: `(userId, isRead, createdAt DESC)` B-tree

---

### File

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| originalName | String | NOT NULL |
| mimeType | String | NOT NULL |
| sizeBytes | BigInt | NOT NULL |
| s3Key | String | NOT NULL |
| s3Bucket | String | NOT NULL |
| resourceType | ResourceType | NOT NULL |
| resourceId | UUID | NOT NULL |
| uploadedById | UUID | FK → User.id, NOT NULL |
| createdAt | DateTime | NOT NULL |
| deletedAt | DateTime? | nullable |

**Enum ResourceType**: `CUSTOMER`, `OPPORTUNITY`, `ACTIVITY`

**Indexes**: `(resourceType, resourceId)` composite, `uploadedById`, `deletedAt`

---

### AuditLog

Immutable — no soft delete, no updates.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| actorId | UUID? | nullable | Null for system-initiated events |
| action | AuditAction | NOT NULL | |
| resourceType | String | NOT NULL | |
| resourceId | UUID? | nullable | |
| previousValue | Json? | nullable | Full previous record snapshot |
| newValue | Json? | nullable | Full new record snapshot |
| ipAddress | String? | nullable | |
| traceId | String? | nullable | Correlates to request log |
| createdAt | DateTime | NOT NULL | |

**Enum AuditAction**: `LOGIN`, `LOGOUT`, `LOGIN_FAILED`, `PASSWORD_RESET`, `RECORD_CREATED`, `RECORD_UPDATED`, `RECORD_DELETED`, `STATUS_CHANGED`, `OWNERSHIP_CHANGED`, `ROLE_CHANGED`, `IMPORT_COMPLETED`

**Indexes**: `(resourceType, resourceId, createdAt DESC)` B-tree, `actorId`, `action`

---

### RefreshToken

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| tokenHash | String | NOT NULL |
| userId | UUID | FK → User.id, NOT NULL |
| expiresAt | DateTime | NOT NULL |
| revokedAt | DateTime? | nullable |
| replacedByTokenId | UUID? | nullable |
| createdAt | DateTime | NOT NULL |

**Indexes**: `tokenHash` (unique), `userId`, `expiresAt`

---

### PasswordResetToken

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| tokenHash | String | NOT NULL |
| userId | UUID | FK → User.id, NOT NULL |
| expiresAt | DateTime | NOT NULL (now + 1 hour) |
| usedAt | DateTime? | nullable |
| createdAt | DateTime | NOT NULL |

---

### SsoConfig

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| provider | SsoProvider | NOT NULL |
| config | Json | NOT NULL (encrypted at rest) |
| isActive | Boolean | NOT NULL, default false |
| createdAt | DateTime | NOT NULL |
| updatedAt | DateTime | NOT NULL |

**Enum SsoProvider**: `SAML`, `OIDC`

---

### ImportJob

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| type | ImportType | NOT NULL |
| status | ImportStatus | NOT NULL, default PENDING |
| totalRows | Int? | nullable |
| processedRows | Int | NOT NULL, default 0 |
| errorRows | Int | NOT NULL, default 0 |
| uploadedById | UUID | FK → User.id, NOT NULL |
| inputS3Key | String | NOT NULL |
| resultS3Key | String? | nullable |
| errorDetails | Json? | nullable |
| createdAt | DateTime | NOT NULL |
| updatedAt | DateTime | NOT NULL |

**Enum ImportType**: `CUSTOMER`, `CONTACT`

**Enum ImportStatus**: `PENDING`, `VALIDATING`, `PROCESSING`, `COMPLETED`, `FAILED`

---

## State Machines

### Customer Status
```
[PROSPECT] ──→ [ACTIVE] ──→ [INACTIVE]
     │              │             │
     └──────────────┴─────────────┴──→ [ARCHIVED]
                                        (admin-only reversal to INACTIVE)
```

### Opportunity (Stage Progression)
```
[Lead] → [Qualified] → [Proposal] → [Negotiation] → [Won]  (terminal)
                                                   → [Lost] (terminal)
Any open stage → closed with note "Customer archived" (system action on customer archive)
```

### Task Status
```
[OPEN] → [COMPLETED]
[OPEN] → [CANCELLED]
```

### Import Job Status
```
[PENDING] → [VALIDATING] → [PROCESSING] → [COMPLETED]
                 │                │
                 └────────────────┴──→ [FAILED]
```

---

## Key Database Indexes

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| customers | `(status, ownerId, deletedAt)` | B-tree composite | Default list filter |
| customers | `searchVector` | GIN | Full-text search |
| contacts | `(customerId, deletedAt)` | B-tree | Customer contact list |
| contacts | `searchVector` | GIN | Full-text search |
| opportunities | `(stageId, ownerId, deletedAt)` | B-tree | Pipeline board query |
| opportunities | `searchVector` | GIN | Full-text search |
| activities | `(customerId, createdAt DESC)` | B-tree | Customer timeline |
| tasks | `(assigneeId, status, dueDate)` | B-tree | My tasks + overdue detection |
| audit_logs | `(resourceType, resourceId, createdAt DESC)` | B-tree | Record history lookup |
| notifications | `(userId, isRead, createdAt DESC)` | B-tree | Unread notification poll |
| refresh_tokens | `tokenHash` | B-tree | Token lookup on refresh |
