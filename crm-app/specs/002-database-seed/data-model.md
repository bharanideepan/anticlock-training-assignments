# Data Model: Database Seed

**Date**: 2026-06-12 | **Feature**: [spec.md](spec.md)

This document describes the **seed data inventory** — what records are created per entity,
their unique keys used for skip-if-exists idempotency, and their relationships.

The Prisma schema itself is authoritative for field types and constraints; this document
focuses on what the seed creates and why.

---

## Seeded Record Inventory

### 1. Role (5 records)

Pre-seeded via migration; the seed references roles by name only (no new records).

| Name |
|------|
| SYSTEM_ADMINISTRATOR |
| SALES_MANAGER |
| SALES_REPRESENTATIVE |
| SUPPORT_REPRESENTATIVE |
| READ_ONLY |

**Unique key**: `name` — seed does `findFirst({ where: { name } })` then skips if found.

---

### 2. User (5 records)

| Email | Role | First | Last | Password |
|-------|------|-------|------|----------|
| admin@crm.local | SYSTEM_ADMINISTRATOR | System | Administrator | Admin@123 |
| manager@crm.local | SALES_MANAGER | Sarah | Manager | Manager@123 |
| salesrep@crm.local | SALES_REPRESENTATIVE | John | SalesRep | SalesRep@123 |
| salesrep2@crm.local | SALES_REPRESENTATIVE | Jane | SalesRep | SalesRep2@123 |
| support@crm.local | SUPPORT_REPRESENTATIVE | Alex | Support | Support@123 |
| readonly@crm.local | READ_ONLY | Bob | ReadOnly | ReadOnly@123 |

**Unique key**: `email` — skip-if-exists.
All passwords are bcrypt-hashed at cost factor 10 before storage.

---

### 3. Team (1 record) + TeamMember (3 records)

| Team Name | Manager | Members |
|-----------|---------|---------|
| Alpha Sales Team | manager@crm.local | salesrep@crm.local, salesrep2@crm.local |

**Team unique key**: `name` — skip-if-exists.
**TeamMember unique key**: composite `(userId, teamId)` — skip-if-exists.

---

### 4. PipelineStage (6 records)

| Name | Order | isDefault | isTerminal | terminalOutcome |
|------|-------|-----------|------------|-----------------|
| Lead | 1 | true | false | — |
| Qualified | 2 | false | false | — |
| Proposal | 3 | false | false | — |
| Negotiation | 4 | false | false | — |
| Won | 5 | false | true | WON |
| Lost | 6 | false | true | LOST |

**Unique key**: `name` via `findFirst` — skip-if-exists.

---

### 5. Customer (12 records)

Distributed across all 4 `CustomerStatus` values and multiple industries.

| Company | Status | Industry | Revenue Range | Owner |
|---------|--------|----------|---------------|-------|
| Acme Corporation | ACTIVE | Technology | ONE_M_10M | salesrep |
| Beta Logistics | ACTIVE | Logistics | TEN_M_50M | salesrep |
| Gamma Healthcare | ACTIVE | Healthcare | FIFTY_M_250M | salesrep |
| Delta Finance | ACTIVE | Finance | OVER_250M | salesrep |
| Epsilon Retail | PROSPECT | Retail | UNDER_1M | salesrep2 |
| Zeta Manufacturing | PROSPECT | Manufacturing | ONE_M_10M | salesrep2 |
| Eta Education | PROSPECT | Education | UNDER_1M | salesrep2 |
| Theta Energy | INACTIVE | Energy | TEN_M_50M | support |
| Iota Media | INACTIVE | Media | ONE_M_10M | support |
| Kappa Legal | ARCHIVED | Legal | ONE_M_10M | salesrep |
| Lambda Consulting | ARCHIVED | Consulting | UNDER_1M | salesrep2 |
| Mu Technology | ACTIVE | Technology | TEN_M_50M | salesrep2 |

**Unique key**: `companyName` via `findFirst` — skip-if-exists.

---

### 6. Contact (22 records)

2 contacts per customer. Distributed so every customer has at least 2 contacts.

**Unique key**: composite check `findFirst({ where: { email } })` for contacts with email;
for contacts without email, `findFirst({ where: { firstName, lastName, customerId } })`.

Notable contacts:
- Acme Corporation: Alice Acme (alice@acme.com), Bob Acme (bob@acme.com)
- Beta Logistics: Charlie Beta, Diana Beta
- *(... 2 per remaining 10 customers ...)*

---

### 7. Opportunity (14 records — 2+ per pipeline stage, 2 terminal)

| Opportunity | Stage | Customer | Expected Revenue | Probability | Owner |
|-------------|-------|----------|-----------------|-------------|-------|
| Acme ERP Upgrade | Lead | Acme Corp | $45,000 | 15% | salesrep |
| Beta Warehouse System | Lead | Beta Logistics | $120,000 | 20% | salesrep |
| Gamma EMR Platform | Qualified | Gamma Healthcare | $280,000 | 40% | salesrep |
| Delta Risk Analytics | Qualified | Delta Finance | $350,000 | 45% | salesrep |
| Epsilon POS System | Proposal | Epsilon Retail | $18,000 | 60% | salesrep2 |
| Zeta Automation Suite | Proposal | Zeta Manufacturing | $95,000 | 65% | salesrep2 |
| Eta LMS Platform | Negotiation | Eta Education | $22,000 | 75% | salesrep2 |
| Theta SCADA Upgrade | Negotiation | Theta Energy | $180,000 | 80% | support |
| Acme Cloud Migration | Won | Acme Corp | $78,000 | 100% | salesrep |
| Mu Data Platform | Won | Mu Technology | $210,000 | 100% | salesrep2 |
| Iota CMS Renewal | Lost | Iota Media | $15,000 | 0% | support |
| Kappa Legal Suite | Lost | Kappa Legal | $55,000 | 0% | salesrep |
| Beta Fleet Mgmt | Lead | Beta Logistics | $90,000 | 25% | salesrep |
| Gamma Lab System | Qualified | Gamma Healthcare | $140,000 | 50% | salesrep |

**Unique key**: `findFirst({ where: { name, customerId } })` — skip-if-exists.

---

### 8. Activity (15 records — 3 per ActivityType)

| Type | Count | Linked To |
|------|-------|-----------|
| PHONE_CALL | 3 | Acme Corp, Beta Logistics, Gamma Healthcare |
| MEETING | 3 | Delta Finance, Epsilon Retail, Zeta Manufacturing |
| EMAIL | 3 | Eta Education, Theta Energy, Iota Media |
| NOTE | 3 | Acme Corp, Mu Technology, Beta Logistics |
| FOLLOW_UP | 3 | Gamma Healthcare, Delta Finance, Epsilon Retail |

**Unique key**: `findFirst({ where: { subject, customerId, type } })` — skip-if-exists.

---

### 9. Task (12 records)

| # | Type | Title | Status | Due Date | Assignee | Notes |
|---|------|-------|--------|----------|----------|-------|
| 1 | FOLLOW_UP | Follow up on Acme ERP proposal | OPEN | future | salesrep | |
| 2 | CALL | Call Beta re: delivery timeline | OPEN | future | salesrep | |
| 3 | MEETING | Schedule Gamma demo | OPEN | future | salesrep2 | |
| 4 | EMAIL | Send Delta contract draft | OPEN | future | salesrep2 | |
| 5 | INTERNAL_ACTION | Update Epsilon quote | OPEN | future | salesrep2 | |
| 6 | FOLLOW_UP | Follow up on Zeta requirements | OPEN | future | salesrep | |
| 7 | CALL | Overdue: Confirm Eta kick-off | OPEN | 2025-01-15 | salesrep | **overdue** |
| 8 | EMAIL | Overdue: Send Theta summary | OPEN | 2025-01-15 | support | **overdue** |
| 9 | MEETING | Quarterly review prep | COMPLETED | past | manager | |
| 10 | FOLLOW_UP | Check Mu contract | OPEN | future | salesrep2 | |
| 11 | CALL | Introduction call — Kappa | CANCELLED | past | salesrep | |
| 12 | INTERNAL_ACTION | Update CRM pipeline report | OPEN | future | manager | |

**Unique key**: `findFirst({ where: { title, assigneeId } })` — skip-if-exists.

---

### 10. AuditLog (12 records)

| Action | ResourceType | Actor |
|--------|-------------|-------|
| LOGIN | User | admin |
| LOGIN | User | manager |
| LOGIN | User | salesrep |
| RECORD_CREATED | Customer | salesrep (Acme Corp) |
| RECORD_CREATED | Customer | salesrep2 (Epsilon Retail) |
| RECORD_CREATED | Opportunity | salesrep (Acme ERP Upgrade) |
| RECORD_UPDATED | Customer | salesrep (Acme Corp status change) |
| STATUS_CHANGED | Customer | admin (Kappa → ARCHIVED) |
| STATUS_CHANGED | Opportunity | salesrep (Acme Cloud Migration → Won) |
| RECORD_CREATED | Contact | salesrep |
| RECORD_UPDATED | Opportunity | salesrep2 (probability update) |
| STATUS_CHANGED | Opportunity | support (Iota CMS Renewal → Lost) |

AuditLog has no unique constraint in the schema. Idempotency is handled by checking
`count({ where: { action, resourceType, actorId } })` and skipping if > 0.

---

### 11. Notification (18 records — 3 per user × 6 users)

| Type | Title | User |
|------|-------|------|
| TASK_ASSIGNED | "New task assigned: Follow up on Acme ERP proposal" | salesrep |
| OPPORTUNITY_ASSIGNED | "Opportunity assigned: Acme ERP Upgrade" | salesrep |
| DUE_DATE_REMINDER | "Task due soon: Call Beta re: delivery timeline" | salesrep |
| TASK_ASSIGNED | "New task assigned: Schedule Gamma demo" | salesrep2 |
| OPPORTUNITY_ASSIGNED | "Opportunity assigned: Epsilon POS System" | salesrep2 |
| DUE_DATE_REMINDER | "Task due soon: Update Epsilon quote" | salesrep2 |
| TASK_ASSIGNED | "New task assigned: Quarterly review prep" | manager |
| OPPORTUNITY_ASSIGNED | "Team opportunity: Theta SCADA Upgrade" | manager |
| DUE_DATE_REMINDER | "Task due soon: Update CRM pipeline report" | manager |
| TASK_ASSIGNED | "New task assigned: Overdue: Confirm Eta kick-off" | salesrep (2nd) |
| OPPORTUNITY_ASSIGNED | "Opportunity assigned: Gamma EMR Platform" | support |
| DUE_DATE_REMINDER | "Overdue task: Overdue: Send Theta summary" | support |
| TASK_ASSIGNED | "Team task: Update CRM pipeline report" | admin |
| OPPORTUNITY_ASSIGNED | "New opportunity in pipeline: Beta Fleet Mgmt" | admin |
| DUE_DATE_REMINDER | "Pipeline reminder: Eta LMS Platform negotiation" | admin |
| TASK_ASSIGNED | "Read-only feed: Follow up on Zeta requirements" | readonly |
| OPPORTUNITY_ASSIGNED | "Pipeline update: Zeta Automation Suite" | readonly |
| DUE_DATE_REMINDER | "Reminder: Check Mu contract" | readonly |

**Idempotency**: `findFirst({ where: { userId, type, title } })` — skip-if-exists.

---

## Entity Dependency Chain

```
Role
└── User
    ├── Team (manager)
    │   └── TeamMember (userId + teamId)
    ├── Customer (owner)
    │   ├── Contact
    │   ├── Activity (+ Contact, User as creator)
    │   ├── Opportunity (+ Contact, User, PipelineStage)
    │   │   └── Task (+ User as assignee/creator)
    │   └── Task (+ User as assignee/creator)
    ├── AuditLog (actorId)
    └── Notification
PipelineStage (independent of Users/Customers)
```

Seeding must strictly follow this order to avoid FK violations.
