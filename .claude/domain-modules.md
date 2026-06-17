## Domain Modules (14 total)

Spec files in `crm-app-metaswarm/product-specs/modules/`.

| Module | Spec file | Key notes |
|--------|-----------|-----------|
| Auth | `01-auth.md` | JWT + SSO, password reset, profile |
| Users & Teams | `02-users-teams.md` | Admin only; role assignment |
| Customers | `03-customers.md` | Status: PROSPECT→ACTIVE→INACTIVE↔ARCHIVED; soft-delete |
| Contacts | `04-contacts.md` | Linked to Customer; interaction history |
| Activities | `05-activities.md` | PHONE_CALL, MEETING, EMAIL, NOTE, FOLLOW_UP |
| Opportunities & Pipeline | `06-opportunities-pipeline.md` | Kanban with dnd-kit; configurable stages |
| Tasks | `07-tasks.md` | Status: OPEN→COMPLETED/CANCELLED; overdue detection |
| Dashboard | `08-dashboard.md` | Role-scoped KPIs + Recharts; cache 5 min |
| Notifications | `09-notifications.md` | In-app + email + SSE; mark-read |
| Files | `10-files.md` | S3 presigned; polymorphic (CUSTOMER, OPPORTUNITY, ACTIVITY); 25 MB max |
| Search | `11-search.md` | PostgreSQL tsvector; min 2-char query |
| Reports | `12-reports.md` | Sales, Customer, Productivity; CSV export |
| Audit Log | `13-audit.md` | Immutable; admin only; never soft-deleted |
| Import/Export | `14-import-export.md` | CSV bulk import (customers, contacts); 1k rows < 60s |

## User Roles & Permissions

| Role | Scope |
|------|-------|
| SYSTEM_ADMINISTRATOR | All records org-wide; user management; audit log; admin settings; SSO config |
| SALES_MANAGER | All records in their team(s); reports; import |
| SALES_REPRESENTATIVE | Own records; create/update customers, contacts, opportunities, tasks, activities |
| SUPPORT_REPRESENTATIVE | Contacts + activities + tasks; read-only on opportunities/pipeline |
| READ_ONLY | View-only within visibility scope |

Visibility is **always enforced server-side** on every list and fetch query.
