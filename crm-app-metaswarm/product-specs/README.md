# CRM Platform — Product Specs

Complete specifications for building the Enterprise CRM Platform from scratch.
Read in order: overview → architecture → data model → design system → modules.

---

## Index

### Foundation
| File | Contents |
|------|----------|
| [00-overview.md](00-overview.md) | Product brief, goals, scope, user roles, permission matrix, success criteria |
| [01-architecture.md](01-architecture.md) | Tech stack, project structure, backend/frontend patterns, deployment, CI/CD |
| [02-data-model.md](02-data-model.md) | All entities, columns, constraints, state machines, indexes |
| [03-design-system.md](03-design-system.md) | Layout shell, design tokens, typography, spacing, component standards, routes |
| [04-api-conventions.md](04-api-conventions.md) | Response envelope, pagination, error codes, auth, visibility scoping |

### Modules
| File | Module |
|------|--------|
| [modules/01-auth.md](modules/01-auth.md) | Authentication — login, SSO, JWT, password reset, profile |
| [modules/02-users-teams.md](modules/02-users-teams.md) | User & team management — CRUD, roles, deactivation |
| [modules/03-customers.md](modules/03-customers.md) | Customer management — CRUD, status lifecycle, archive/restore |
| [modules/04-contacts.md](modules/04-contacts.md) | Contact management — CRUD, interaction history |
| [modules/05-activities.md](modules/05-activities.md) | Activity tracking — log calls/meetings/emails, customer timeline |
| [modules/06-opportunities-pipeline.md](modules/06-opportunities-pipeline.md) | Opportunities + pipeline board — CRUD, stage transitions, Kanban |
| [modules/07-tasks.md](modules/07-tasks.md) | Task management — CRUD, complete/cancel, overdue detection |
| [modules/08-dashboard.md](modules/08-dashboard.md) | Role-based dashboard — KPI cards, charts |
| [modules/09-notifications.md](modules/09-notifications.md) | Notifications — in-app, email, SSE stream |
| [modules/10-files.md](modules/10-files.md) | File management — S3 presigned upload/download |
| [modules/11-search.md](modules/11-search.md) | Global search — full-text, entity type filtering |
| [modules/12-reports.md](modules/12-reports.md) | Reports & analytics — sales, customer, productivity, CSV export |
| [modules/13-audit.md](modules/13-audit.md) | Audit logging — immutable event log, admin search |
| [modules/14-import-export.md](modules/14-import-export.md) | Data import (CSV) & export |

---

## How to Use These Specs

1. **Start with `00-overview.md`** to understand the product, user roles, and scope.
2. **Read `02-data-model.md`** early — the entity relationships inform all module behaviour.
3. **Read `04-api-conventions.md`** once — it defines patterns that apply to every module's API.
4. **For each module**, the spec contains: user stories, functional requirements, complete API contracts (request/response/errors), frontend page descriptions, and business rules.
5. **`03-design-system.md`** is the reference for all frontend visual decisions.
