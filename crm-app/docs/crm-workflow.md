# CRM Application — Complete Workflow Guide

## Overview

This is a full-featured enterprise CRM (Customer Relationship Management) platform built with:

- **Backend**: NestJS + Prisma ORM + PostgreSQL
- **Frontend**: React + TypeScript + Material UI v9
- **Auth**: JWT-based (access token + refresh token)
- **Infrastructure**: Docker, hosted on Render (backend + DB) and Vercel (frontend)

---

## User Roles & Permissions

The system has six roles with progressively restricted access:

| Role | Dashboard | Customers | Contacts | Opportunities | Pipeline | Tasks | Activities | Reports | Import/Export | Users | Audit Log | Admin Settings |
|------|-----------|-----------|----------|---------------|----------|-------|------------|---------|---------------|-------|-----------|----------------|
| SYSTEM_ADMINISTRATOR | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SALES_MANAGER | ✓ | ✓ (team) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (view) | ✗ | ✗ |
| SALES_REPRESENTATIVE | ✓ | ✓ (own) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| SUPPORT_REPRESENTATIVE | ✓ | ✓ (own) | ✓ | ✓ (view) | ✓ (view) | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| READ_ONLY | ✓ | ✓ (view) | ✓ (view) | ✓ (view) | ✓ (view) | ✗ | ✓ (view) | ✓ | ✗ | ✗ | ✗ | ✗ |

---

## Demo Credentials (Seeded)

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| admin@crm.local | Admin@123 | SYSTEM_ADMINISTRATOR | Full access to all features |
| manager@crm.local | Manager@123 | SALES_MANAGER | Manages Alpha Sales Team |
| salesrep@crm.local | SalesRep@123 | SALES_REPRESENTATIVE | Owns Acme, Beta, Gamma, Delta, Kappa |
| salesrep2@crm.local | SalesRep2@123 | SALES_REPRESENTATIVE | Owns Epsilon, Zeta, Eta, Lambda, Mu |
| support@crm.local | Support@123 | SUPPORT_REPRESENTATIVE | Owns Theta Energy, Iota Media |
| readonly@crm.local | ReadOnly@123 | READ_ONLY | View-only access, no owned records |

---

## Step-by-Step Workflow

### 1. Login

**URL**: `/login`

1. Enter email and password from the table above.
2. On success, you are redirected to `/dashboard`.
3. The app issues a short-lived **access token** (15 minutes) and a **refresh token** (7 days). Tokens are stored in memory; the refresh token is used silently to maintain session without re-login.
4. If your session expires, you are redirected back to `/login`.

**Password Reset**: Click "Forgot password" on the login page. An email is sent with a reset link (requires SMTP configured in production).

---

### 2. Dashboard (`/dashboard`)

The dashboard is the landing page for all roles and provides a real-time overview of sales activity.

**What you see:**
- **KPI cards**: Total customers, open opportunities, pipeline value, tasks due today
- **Pipeline funnel**: Counts and values across stages (Lead → Qualified → Proposal → Negotiation → Won/Lost)
- **Recent activities**: Latest calls, emails, meetings logged across the team
- **Upcoming tasks**: Tasks with due dates approaching
- **Revenue trends**: Monthly comparison charts for won deals

**Try with admin@crm.local** to see the full company view. Log in as **salesrep@crm.local** to see a filtered view scoped to that rep's records only.

---

### 3. Customer Management (`/customers`)

Customers are the top-level entity — they represent companies (accounts).

**Seeded companies**: 12 companies across Technology, Logistics, Healthcare, Finance, Retail, Manufacturing, Education, Energy, Media, Legal, and Consulting industries.

**Workflow:**

1. **List view** (`/customers`): Shows all visible customers with filters for status (Active, Inactive, Prospect, Archived) and industry. Search by company name.
2. **Create customer** (`/customers/new`):
   - Required: Company name, status, owner (assigned sales rep)
   - Optional: Industry, revenue range ($0–250M+), city, country, website, notes
3. **Customer detail** (`/customers/:id`):
   - Overview tab: Company info, owner, creation date
   - Contacts tab: All contacts linked to this customer
   - Opportunities tab: Open and closed deals for this company
   - Activities tab: All calls, emails, meetings for this company
   - Tasks tab: Pending and completed tasks for this account
4. **Edit customer** (`/customers/:id/edit`): Update any field. Status changes (e.g., Prospect → Active) are tracked in the audit log.
5. **Delete / Archive**: Admins and owners can archive customers; deletion removes from pipeline.

**Status flow**: `PROSPECT → ACTIVE → INACTIVE → ARCHIVED`

---

### 4. Contact Management (`/contacts`)

Contacts are people at a customer company — the human touchpoints for deals.

**Seeded contacts**: 22 contacts with designations like CEO, CTO, CFO, VP Sales, COO spread across all customers.

**Workflow:**

1. **List view** (`/contacts`): Filter by customer, department, or search by name/email.
2. **Create contact** (`/contacts/new`):
   - Required: First name, last name, customer (links to a company)
   - Optional: Email, phone, designation, department, LinkedIn URL, notes
3. **Contact detail** (`/contacts/:id`):
   - Profile with all personal/professional info
   - Associated opportunities where this contact is listed
   - Activity history (calls, emails, meetings with this person)
4. **Link to opportunities**: When creating or editing an opportunity, contacts from the same customer can be added as stakeholders.

---

### 5. Opportunity Management (`/opportunities`)

Opportunities are individual sales deals tied to a customer and tracked through pipeline stages.

**Seeded opportunities**: Multiple deals across Acme, Beta Logistics, Gamma Healthcare, Delta Finance, and others, spread across Lead, Qualified, Proposal, Negotiation, Won, and Lost stages.

**Workflow:**

1. **List view** (`/opportunities`): Filter by stage, customer, owner, or date range. Sortable by value or close date.
2. **Create opportunity** (`/opportunities/new`):
   - Required: Title, customer, stage, value (deal amount), expected close date
   - Optional: Description, assigned contacts, probability percentage
3. **Opportunity detail** (`/opportunities/:id`):
   - Deal summary: value, stage, close date, probability
   - Contacts tab: stakeholders involved in the deal
   - Activities tab: all interactions logged for this deal
   - Tasks tab: follow-up tasks associated with this deal
4. **Stage progression**: Change the stage directly from the detail page or drag-and-drop on the Pipeline Board.
5. **Won / Lost**: Moving to a terminal stage closes the deal. Won deals count toward revenue reports.

---

### 6. Pipeline Board (`/pipeline`)

A Kanban-style drag-and-drop board showing all open opportunities organized by stage.

**Pipeline stages** (in order):
1. **Lead** — Initial contact, not yet qualified
2. **Qualified** — Confirmed interest and budget
3. **Proposal** — Formal proposal sent
4. **Negotiation** — Terms under discussion
5. **Won** — Deal closed successfully
6. **Lost** — Deal not progressed

**Workflow:**

1. Navigate to `/pipeline` to see all visible opportunities as cards in columns.
2. Each card shows: opportunity title, customer name, deal value, close date.
3. **Drag a card** from one column to another to advance or move back a stage. The change is saved immediately.
4. Click any card to open the opportunity detail page.
5. Admins can reorder the stage columns themselves from Admin Settings → Pipeline Stages.

---

### 7. Tasks (`/tasks`)

Tasks are to-do items that can be linked to customers, contacts, or opportunities.

**Task types**: Call, Email, Meeting, Follow-up, Demo, Proposal, Contract, Other

**Workflow:**

1. **List view** (`/tasks`): Filter by status (Pending, In Progress, Completed), due date, type, or linked record.
2. **Create task**:
   - Required: Title, type, due date, assigned user
   - Optional: Link to customer / contact / opportunity, description, priority
3. **Complete a task**: Check off the task as done. Completion is timestamped and appears in activity history.
4. **Overdue tasks**: Tasks past their due date are highlighted in the list. Dashboard KPIs also surface overdue counts.

---

### 8. Activities (`/activities`)

Activities are logged interactions — a historical record of what has been done with customers and contacts.

**Activity types**: Call, Email, Meeting, Note, Demo, Follow-up

**Workflow:**

1. **Log an activity** from the Activities page, or directly from a customer/contact/opportunity detail page.
   - Required: Type, subject, date/time
   - Optional: Duration, linked customer/contact/opportunity, notes/outcome
2. **List view** (`/activities`): Full activity feed across all visible records, filterable by type, date range, or linked entity.
3. Activities appear in the dashboard's "Recent Activities" widget and on each linked entity's detail page.

---

### 9. Notifications (`/notifications`)

The notification center surfaces important events relevant to the logged-in user.

**Notification triggers:**
- A task assigned to you is due soon
- An opportunity you own moves to a new stage
- A new contact is added to one of your customers
- An activity is logged on your customer by someone else

**Workflow:**

1. The bell icon in the top nav shows an unread count badge.
2. Navigate to `/notifications` to see all notifications, sorted by newest first.
3. Click a notification to be taken to the relevant record.
4. Mark individual notifications as read, or mark all as read.

---

### 10. Global Search (`/search`)

Search across all entities from a single input.

**What is searched:** Company names, contact names, emails, opportunity titles, task subjects, activity notes.

**Workflow:**

1. Use the search bar in the top navigation or navigate to `/search`.
2. Type at least 2 characters to trigger results.
3. Results are grouped by type (Customers, Contacts, Opportunities, Tasks).
4. Click any result to go directly to that record.

---

### 11. Reports (`/reports`)

The reports module provides analytics views for management and sales tracking.

**Available reports:**
- **Pipeline Summary**: Opportunity counts and total value by stage
- **Win/Loss Analysis**: Closed deal breakdown by rep and period
- **Sales by Representative**: Activity volume and deal metrics per user
- **Customer Acquisition**: New customers over time by industry
- **Activity Summary**: Call/email/meeting counts per period

**Workflow:**

1. Navigate to `/reports`.
2. Select a report type from the sidebar.
3. Apply date range and filter options (team, rep, industry).
4. Data renders as charts and tables.
5. Export to CSV where available.

All roles can access reports, but data is scoped — a sales rep sees only their own records, a manager sees their team, admin sees everything.

---

### 12. Import / Export (`/import-export`)

Bulk operations for migrating or exporting CRM data.

**Access**: SYSTEM_ADMINISTRATOR, SALES_MANAGER, SALES_REPRESENTATIVE

**Workflow:**

**Import (CSV):**
1. Navigate to `/import-export` → Import tab.
2. Download the CSV template for the entity type (Customers or Contacts).
3. Fill in the template with your data.
4. Upload the file. The system validates each row and reports errors per row.
5. Confirmed rows are imported. Duplicates are flagged, not overwritten.

**Export (CSV):**
1. Navigate to `/import-export` → Export tab.
2. Select entity type and apply optional filters (e.g., status, date range).
3. Click Export. A CSV file is downloaded.
4. Exported data is scoped to what you can see (rep exports only their records, manager exports team, admin exports all).

---

### 13. User Management (`/users`)

Manage who has access to the CRM system.

**Access**: SYSTEM_ADMINISTRATOR (full), SALES_MANAGER (view + own profile only)

**Workflow (Admin):**

1. **List users** (`/users`): See all users with role, status, last login.
2. **Create user** (`/users/new`): Set email, name, role, and temporary password. The user receives a welcome email with a password-reset link.
3. **User detail** (`/users/:id`): View profile, role, team membership, and recent activity summary.
4. **Edit user** (`/users/:id/edit`): Change role, deactivate account, reset password.
5. **Team assignment**: Admin can add/remove users from sales teams, which affects manager-scoped visibility.

**The Alpha Sales Team** (seeded) has Sarah Manager as the manager, with John SalesRep and Jane SalesRep as members.

---

### 14. Audit Log (`/audit`)

A tamper-evident log of every create, update, and delete action taken in the system.

**Access**: SYSTEM_ADMINISTRATOR only

**Workflow:**

1. Navigate to `/audit`.
2. Every action in the system is logged: who did what, to which record, and when.
3. Filter by user, entity type (Customer, Contact, Opportunity, User, etc.), action (CREATE, UPDATE, DELETE), or date range.
4. Each log entry shows:
   - Timestamp
   - Acting user
   - Entity type and ID
   - Action (CREATE / UPDATE / DELETE)
   - Before/after values for UPDATE actions
5. The audit log is read-only — entries cannot be edited or deleted.

---

### 15. Admin Settings (`/settings`)

System-wide configuration options.

**Access**: SYSTEM_ADMINISTRATOR only

**Workflow:**

1. Navigate to `/settings`.
2. **Pipeline Stages**: Add, rename, reorder, or archive pipeline stages. The six default stages (Lead, Qualified, Proposal, Negotiation, Won, Lost) are seeded but configurable.
3. **System Preferences**: Configure application name, default values, email notification settings.

---

## End-to-End Sales Scenario

Here is a typical sales workflow using the demo data:

1. **Login** as `salesrep@crm.local / SalesRep@123`.

2. **Dashboard** loads showing John SalesRep's metrics: his 5 customers, open opportunities, and upcoming tasks.

3. **New lead comes in** → Go to `/customers/new` → Create "Sigma Software" as a PROSPECT → Save.

4. **Add a contact** → Go to `/contacts/new` → Add "Emily Sigma, CTO" linked to Sigma Software.

5. **Create an opportunity** → Go to `/opportunities/new` → Title: "CRM Platform Deal", Customer: Sigma Software, Stage: Lead, Value: $50,000, Close date: 90 days out.

6. **Pipeline board** → Navigate to `/pipeline` → See the new card under Lead. Drag it to **Qualified** after a discovery call confirms budget.

7. **Log an activity** → From the opportunity detail, log a "Call" activity: "Discovery call with Emily — confirmed $50k budget, decision in Q2."

8. **Create a follow-up task** → From the same opportunity, add a task: "Send proposal by Friday", type: Proposal, due: 3 days.

9. **Send proposal** → Move opportunity to Proposal stage on the pipeline board. Log another activity: "Email" — "Sent formal proposal PDF."

10. **Deal closes** → After negotiation, drag card to **Won** on the pipeline board. Deal is now counted in revenue reports.

11. **Manager review** → Login as `manager@crm.local / Manager@123` → Dashboard shows team totals including John's closed deal → Reports → Win/Loss Analysis shows the deal.

12. **Admin audit** → Login as `admin@crm.local / Admin@123` → `/audit` → See every action taken: the customer creation, contact creation, opportunity state changes, activity logs, and task completions — all timestamped and attributed.

---

## API Reference

The backend exposes all features via a REST API at `/api/v1`. The full API can be explored via Swagger at:

```
http://localhost:3000/api/v1/docs
```

Key endpoint groups:
- `POST /api/v1/auth/login` — obtain tokens
- `POST /api/v1/auth/refresh` — exchange refresh token
- `GET /api/v1/customers` — list customers (paginated, filterable)
- `GET /api/v1/opportunities` — list opportunities
- `GET /api/v1/pipeline/stages` — list pipeline stages
- `GET /api/v1/tasks` — list tasks
- `GET /api/v1/activities` — list activities
- `GET /api/v1/reports/pipeline-summary` — pipeline analytics
- `GET /api/v1/audit` — audit log (admin only)

All endpoints require a valid JWT in the `Authorization: Bearer <token>` header.
