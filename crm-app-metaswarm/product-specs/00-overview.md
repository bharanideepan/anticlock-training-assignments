# Enterprise CRM Platform — Product Overview

## What This Is

A full-featured, enterprise-grade Customer Relationship Management (CRM) platform for managing customers, contacts, sales opportunities, tasks, communications, reporting, and team collaboration from a single system.

The platform is built as a REST API backend (NestJS) consumed by a React SPA frontend, with PostgreSQL as the primary data store. All data access is protected by JWT authentication and team-scoped RBAC.

---

## Core Goals

1. **Centralize customer data** — one place for all company, contact, deal, and interaction records.
2. **Drive sales velocity** — visual pipeline board, opportunity tracking, and automated reminders reduce admin overhead.
3. **Enforce accountability** — every create/update/delete is immutably logged; role-based visibility ensures users see only what they should.
4. **Enable management insight** — role-scoped dashboards and filterable reports give managers real-time pipeline and productivity visibility.

---

## Scope (v1)

**In scope**:
- Email/password login for System Administrators; SSO (SAML 2.0 / OIDC) for all other users
- User and team management (admin only)
- Customer, contact, activity, opportunity, and task CRUD
- Visual Kanban pipeline board with drag-and-drop stage transitions
- Role-adapted dashboard with KPI metrics and charts
- In-app and email notifications
- File attachments on customers, opportunities, and activities
- Global full-text search across all entity types
- Sales, customer, and productivity reports with CSV export
- Bulk data import (CSV) for customers and contacts
- Immutable audit log accessible to administrators
- Configurable pipeline stages

**Out of scope (v1)**:
- Native mobile app
- Fiscal-year configurability (calendar year only in v1)
- Email, calendar, ERP, marketing automation integrations
- Automatic account lockout on repeated failed login
- Real-time WebSocket push (SSE polling used instead)
- Virus scanning of uploaded files

---

## User Roles & Permissions

There are five roles. Each role inherits the visibility of the previous plus expanded write access.

| Role | Key Capabilities |
|------|-----------------|
| **SYSTEM_ADMINISTRATOR** | All create/read/update/delete; user management; audit log; admin settings; SSO config; can un-archive customers |
| **SALES_MANAGER** | All CRUD within their team's records; can view team members' records; can run reports and import data; cannot access audit log or admin settings |
| **SALES_REPRESENTATIVE** | Create/update own customers, contacts, opportunities, tasks, activities; cannot access user list, audit log, or admin settings |
| **SUPPORT_REPRESENTATIVE** | Create/update contacts, activities, tasks; read-only on opportunities and pipeline; no import access |
| **READ_ONLY** | View-only across all entities within visibility scope; no create, update, or delete |

### Data Visibility (Team-Scoped RBAC)

- **System Administrator**: Sees all records organization-wide.
- **Sales Manager**: Sees all records owned by any user in their team(s).
- **Sales Representative / Support Representative / Read-Only**: Sees records owned by themselves or any member of their team.

Visibility is enforced server-side on every list and fetch query — there is no client-side filtering.

---

## Permission Matrix

| Feature | SYS_ADMIN | SALES_MGR | SALES_REP | SUPPORT_REP | READ_ONLY |
|---------|-----------|-----------|-----------|-------------|-----------|
| Dashboard | ✓ Full | ✓ Team | ✓ Own | ✓ Own | ✓ Own |
| Customers (CRUD) | ✓ | ✓ Team | ✓ Own | Read only | Read only |
| Contacts (CRUD) | ✓ | ✓ Team | ✓ | ✓ | Read only |
| Opportunities (CRUD) | ✓ | ✓ Team | ✓ Own | Read only | Read only |
| Pipeline Board | ✓ | ✓ Team | ✓ Own | Read only | Read only |
| Activities (CRUD) | ✓ | ✓ Team | ✓ Own | ✓ Own | Read only |
| Tasks (CRUD) | ✓ | ✓ Team | ✓ Own | ✓ Own | — |
| Notifications | ✓ Own | ✓ Own | ✓ Own | ✓ Own | ✓ Own |
| Files (upload/download) | ✓ | ✓ Team | ✓ Own | ✓ Own | Read only |
| Global Search | ✓ | ✓ Team | ✓ Own | ✓ Own | ✓ Own |
| Reports | ✓ All | ✓ Team | ✓ Own | ✓ Own | ✓ Own |
| Import (CSV) | ✓ | ✓ | ✓ | — | — |
| Export (CSV) | ✓ | ✓ Team | ✓ Own | — | — |
| User Management | ✓ Full | View own team | — | — | — |
| Team Management | ✓ | — | — | — | — |
| Audit Log | ✓ | — | — | — | — |
| Admin Settings | ✓ | — | — | — | — |
| Pipeline Stage Config | ✓ | — | — | — | — |
| SSO Config | ✓ | — | — | — | — |

---

## Key Entities

| Entity | Description |
|--------|-------------|
| **User** | A person who can log in; has one role and zero or more team memberships |
| **Role** | Defines permission level — system-seeded, not user-creatable |
| **Team** | Organizational grouping used for visibility scoping and reporting |
| **Customer** | A company or organization being managed; the central CRM entity |
| **Contact** | An individual person associated with a customer |
| **Activity** | A logged interaction (call, meeting, email, note, follow-up) |
| **Opportunity** | A potential sales deal tracked through pipeline stages |
| **PipelineStage** | A named stage in the sales pipeline; admin-configurable |
| **Task** | An actionable to-do item assigned to a user; optionally linked to a customer or opportunity |
| **Notification** | An in-app alert generated by a system event |
| **File** | An uploaded document associated with a customer, opportunity, or activity |
| **AuditLog** | An immutable record of a significant system event |
| **Report** | An aggregated, filterable view of business data across a defined time range |

---

## End-to-End Sales Workflow

```
1. Login (SSO or email/password for admin)
       ↓
2. Dashboard — see KPIs, pipeline health, overdue tasks
       ↓
3. Create Customer (Prospect) → Add Contact
       ↓
4. Create Opportunity (Lead stage) → link to Customer + Contact
       ↓
5. Pipeline Board — drag card through stages: Lead → Qualified → Proposal → Negotiation
       ↓
6. Log Activities (calls, meetings, emails) against Opportunity / Customer
       ↓
7. Create Tasks for follow-ups → assign to team members → complete tasks
       ↓
8. Close Opportunity → Won or Lost
       ↓
9. Reports — Win rate, revenue by period, rep productivity
       ↓
10. Admin Audit Log — review every action taken on every record
```

---

## Success Criteria (Platform-Level)

| ID | Criterion |
|----|-----------|
| SC-001 | Login to dashboard in < 30 seconds |
| SC-002 | Create a complete customer record in < 2 minutes |
| SC-003 | List pages load 10,000 records in < 3 seconds (paginated) |
| SC-004 | Global search returns results in < 2 seconds (up to 1,000 matches) |
| SC-005 | Support 1,000 concurrent users without measurable response-time degradation |
| SC-006 | Dashboard KPI tiles update within one page-refresh cycle |
| SC-007 | 100% of mutating operations produce an audit log entry |
| SC-008 | 12-month report generated and exported in < 30 seconds |
| SC-009 | 1,000-row CSV import validates and processes in < 60 seconds |
| SC-010 | In-app notification delivery within 10 seconds of triggering event |
| SC-011 | 99.9% monthly uptime (~8.7 hours/year downtime budget) |

---

## Non-Functional Requirements

- **Security**: JWT access token (15-min TTL); rotating refresh token (7-day TTL, httpOnly cookie). All endpoints require authentication. No automatic account lockout — failed logins are logged for admin review.
- **Auditability**: All mutating operations (create, update, delete, ownership change, status change) are immutably logged with actor, timestamp, resource, and before/after values.
- **Pagination**: All list endpoints use server-side offset pagination (`page`, `pageSize`, max 100). No unbounded queries.
- **Soft Delete**: Core entities (customers, contacts, opportunities, tasks, activities, files) use soft delete (`deletedAt`) — data is never hard-deleted in normal operations.
- **File size limit**: 25 MB per file. Files uploaded directly to S3-compatible storage via presigned URLs.
- **Session timeout**: 30-minute inactivity timeout (configurable by admin).
- **Timezone**: All datetimes stored in UTC; displayed in user's configured timezone.
- **Browser support**: Modern desktop/tablet browsers. Mobile out of scope for v1.
