# Data Model: Enterprise CRM Platform

**Phase 1 Output** | **Date**: 2026-06-12 | **Plan**: [plan.md](plan.md)

---

## Entity Overview

```text
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

Represents a person who can log in to the CRM.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, default uuid() | |
| email | String | UNIQUE, NOT NULL | Lowercase, used as login identifier |
| passwordHash | String? | nullable | Null for SSO-only users; set for SystemAdmin fallback |
| firstName | String | NOT NULL | |
| lastName | String | NOT NULL | |
| phone | String? | nullable | |
| jobTitle | String? | nullable | |
| status | UserStatus | NOT NULL, default ACTIVE | Enum: ACTIVE, INACTIVE |
| roleId | UUID | FK → Role.id, NOT NULL | |
| createdAt | DateTime | NOT NULL, default now() | |
| updatedAt | DateTime | NOT NULL, @updatedAt | |
| deletedAt | DateTime? | nullable | Soft delete |

**Relations**: `role: Role`, `teams: TeamMember[]`, `ownedCustomers: Customer[]`,
`ownedOpportunities: Opportunity[]`, `assignedTasks: Task[]`, `createdTasks: Task[]`,
`activities: Activity[]`, `notifications: Notification[]`, `refreshTokens: RefreshToken[]`

**Indexes**: `email` (unique), `roleId`, `status`, `deletedAt`

---

### Role

Defines the permission level of a user.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | RoleName | UNIQUE, NOT NULL |

**Enum RoleName**: `SYSTEM_ADMINISTRATOR`, `SALES_MANAGER`, `SALES_REPRESENTATIVE`,
`SUPPORT_REPRESENTATIVE`, `READ_ONLY`

**Seeded at DB initialization** — not user-creatable via API.

---

### Team

Organizational grouping of users for visibility scoping and reporting.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| name | String | UNIQUE, NOT NULL |
| description | String? | nullable |
| managerId | UUID? | FK → User.id, nullable |
| createdAt | DateTime | NOT NULL |
| updatedAt | DateTime | NOT NULL |
| deletedAt | DateTime? | nullable |

**Relations**: `manager: User?`, `members: TeamMember[]`

---

### TeamMember

Junction table for User ↔ Team many-to-many.

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
| industry | String? | nullable | Free text or enum-backed |
| website | String? | nullable | URL |
| revenueRange | RevenueRange? | nullable | Enum (see below) |
| addressLine1 | String? | nullable | |
| addressLine2 | String? | nullable | |
| city | String? | nullable | |
| state | String? | nullable | |
| country | String? | nullable | |
| postalCode | String? | nullable | |
| status | CustomerStatus | NOT NULL, default PROSPECT | Enum: PROSPECT, ACTIVE, INACTIVE, ARCHIVED |
| ownerId | UUID | FK → User.id, NOT NULL | |
| searchVector | Unsupported("tsvector")? | | Updated by DB trigger |
| createdAt | DateTime | NOT NULL | |
| updatedAt | DateTime | NOT NULL | |
| deletedAt | DateTime? | nullable | |

**Enum CustomerStatus**: `PROSPECT`, `ACTIVE`, `INACTIVE`, `ARCHIVED`

**Enum RevenueRange**: `UNDER_1M`, `1M_10M`, `10M_50M`, `50M_250M`, `OVER_250M`

**Valid status transitions**:
```
PROSPECT → ACTIVE
ACTIVE → INACTIVE
INACTIVE → ACTIVE
* → ARCHIVED   (terminal; only SystemAdmin may reverse to INACTIVE)
```

**Relations**: `owner: User`, `contacts: Contact[]`, `activities: Activity[]`,
`opportunities: Opportunity[]`, `tasks: Task[]`, `files: File[]`

**Indexes**: `ownerId`, `status`, `deletedAt`, `searchVector` (GIN)

---

### Contact

An individual person associated with a customer.

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
| searchVector | Unsupported("tsvector")? | Updated by DB trigger |
| createdAt | DateTime | NOT NULL |
| updatedAt | DateTime | NOT NULL |
| deletedAt | DateTime? | nullable |

**Relations**: `customer: Customer`, `activities: Activity[]`, `opportunities: Opportunity[]`

**Indexes**: `customerId`, `email`, `deletedAt`, `searchVector` (GIN)

---

### Activity

A recorded interaction between a user and a customer/contact.

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

**Relations**: `customer: Customer`, `contact: Contact?`, `createdBy: User`, `files: File[]`

**Indexes**: `customerId`, `contactId`, `createdById`, `createdAt DESC`, `deletedAt`

---

### PipelineStage

A named stage in the sales pipeline (configurable by administrators).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| name | String | NOT NULL | |
| displayOrder | Int | NOT NULL | Position in pipeline |
| isDefault | Boolean | NOT NULL, default false | Stage assigned to new opportunities |
| isTerminal | Boolean | NOT NULL, default false | Won/Lost stages |
| terminalOutcome | TerminalOutcome? | nullable | WON or LOST (only on terminal stages) |
| createdAt | DateTime | NOT NULL | |
| updatedAt | DateTime | NOT NULL | |
| deletedAt | DateTime? | nullable | Only deletable if no active opportunities |

**Enum TerminalOutcome**: `WON`, `LOST`

**Seeded defaults**: Lead (order 1), Qualified (2), Proposal (3), Negotiation (4), Won (5,
terminal, WON), Lost (6, terminal, LOST).

---

### Opportunity

A potential sales deal tracked through the pipeline.

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
| searchVector | Unsupported("tsvector")? | Updated by DB trigger |
| createdAt | DateTime | NOT NULL |
| updatedAt | DateTime | NOT NULL |
| deletedAt | DateTime? | nullable |

**Business rules**:
- `actualCloseDate` is set when the opportunity moves to a terminal stage.
- When a customer is archived, open opportunities are moved to a synthetic
  "CLOSED — CUSTOMER ARCHIVED" note and their `deletedAt` is set.

**Relations**: `customer: Customer`, `contact: Contact?`, `owner: User`, `stage: PipelineStage`,
`tasks: Task[]`, `files: File[]`

**Indexes**: `customerId`, `ownerId`, `stageId`, `expectedCloseDate`, `deletedAt`,
`searchVector` (GIN)

---

### Task

An actionable item assigned to a user, optionally linked to a customer or opportunity.

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

**Indexes**: `assigneeId`, `createdById`, `customerId`, `opportunityId`, `status`, `dueDate`,
`deletedAt`

---

### Notification

An in-app alert delivered to a specific user.

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

**Enum NotificationType**: `TASK_ASSIGNED`, `OPPORTUNITY_ASSIGNED`, `DUE_DATE_REMINDER`,
`OVERDUE_TASK`, `CUSTOMER_UPDATED`

**Indexes**: `userId`, `isRead`, `createdAt DESC`

---

### File

A document or attachment associated with any record.

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

**Indexes**: `resourceType + resourceId` (composite), `uploadedById`, `deletedAt`

---

### AuditLog

Immutable record of every significant system event.

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

**Enum AuditAction**: `LOGIN`, `LOGOUT`, `LOGIN_FAILED`, `PASSWORD_RESET`, `RECORD_CREATED`,
`RECORD_UPDATED`, `RECORD_DELETED`, `STATUS_CHANGED`, `OWNERSHIP_CHANGED`, `ROLE_CHANGED`,
`IMPORT_COMPLETED`

**NO soft delete on AuditLog — immutable by design.**

**Indexes**: `actorId`, `resourceType + resourceId` (composite), `action`, `createdAt DESC`

---

### RefreshToken

Tracks issued refresh tokens to support rotation and revocation.

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| tokenHash | String | NOT NULL |
| userId | UUID | FK → User.id, NOT NULL |
| expiresAt | DateTime | NOT NULL |
| revokedAt | DateTime? | nullable |
| replacedByTokenId | UUID? | nullable |
| createdAt | DateTime | NOT NULL |

**Indexes**: `tokenHash`, `userId`, `expiresAt`

---

### PasswordResetToken

Short-lived token for the password-reset email flow (SystemAdmin only).

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

Stores IdP configuration for SAML / OIDC authentication.

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

Tracks the state of a CSV import operation.

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
[Lead] → [Qualified] → [Proposal] → [Negotiation] → [Won] (terminal)
                                                   → [Lost] (terminal)
Any open stage → [CLOSED—CUSTOMER ARCHIVED] (system action on customer archive)
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

## Key Database Indexes (Performance)

| Table | Index | Type | Reason |
|-------|-------|------|--------|
| customers | `(status, ownerId, deletedAt)` | B-tree composite | Default list query filter |
| customers | `searchVector` | GIN | Full-text search |
| contacts | `(customerId, deletedAt)` | B-tree | Customer contact list |
| contacts | `searchVector` | GIN | Full-text search |
| opportunities | `(stageId, ownerId, deletedAt)` | B-tree | Pipeline board query |
| opportunities | `searchVector` | GIN | Full-text search |
| activities | `(customerId, createdAt DESC)` | B-tree | Customer timeline |
| tasks | `(assigneeId, status, dueDate)` | B-tree | My tasks list + overdue detection |
| audit_logs | `(resourceType, resourceId, createdAt DESC)` | B-tree | Record history lookup |
| notifications | `(userId, isRead, createdAt DESC)` | B-tree | Unread notification poll |
| refresh_tokens | `tokenHash` | B-tree | Token lookup on refresh |
