# Module: Opportunities & Pipeline Management

## Overview

Opportunities are potential sales deals tracked through configurable pipeline stages. The pipeline module provides a Kanban board for visual stage management. Pipeline stages are admin-configurable.

---

## User Stories

### US-1: Manage Sales Opportunities (Priority: P2)
Sales reps and managers create opportunities linked to a customer, move them through pipeline stages (Lead → Qualified → Proposal → Negotiation → Won/Lost).

**Acceptance scenarios**:
1. User creates opportunity for existing customer → created at default "Lead" stage with creator as owner.
2. Owner moves opportunity to "Negotiation" → stage change saved, audit entry records transition.
3. User closes opportunity as "Won" → status updated, close date recorded, removed from active pipeline.

### US-2: Visual Pipeline Board (Priority: P2)
Users view the pipeline as a Kanban board. They can drag-and-drop opportunities between stages, filter by owner, and search.

**Acceptance scenarios**:
1. User opens pipeline view → all opportunities displayed in correct stage columns with name, value, and close date.
2. User moves opportunity to new stage → stage updated immediately, audit entry created.
3. User filters by owner → only opportunities owned by that user displayed.

---

## Functional Requirements

- **FR-024**: Users MUST be able to create, update, and close opportunities linked to a customer.
- **FR-025**: Opportunities MUST support: name, customer, contact (optional), owner, expected revenue, probability, expected close date, pipeline stage.
- **FR-026**: Six default pipeline stages: Lead, Qualified, Proposal, Negotiation, Won, Lost.
- **FR-027**: Pipeline stages MUST be configurable by administrators (add, rename, reorder; delete only if no active opportunities in that stage).
- **FR-028**: Closing an opportunity MUST record the close date and remove it from the active pipeline view.
- **FR-029**: Visual pipeline board displaying opportunities grouped by stage.
- **FR-030**: Users MUST be able to move opportunities between stages from the pipeline board.
- **FR-031**: Users MUST be able to filter pipeline opportunities by owner, stage, and date range.

---

## Pipeline Stages (Default)

| Order | Name | Is Default | Is Terminal | Outcome |
|-------|------|-----------|-------------|---------|
| 1 | Lead | ✓ | — | — |
| 2 | Qualified | — | — | — |
| 3 | Proposal | — | — | — |
| 4 | Negotiation | — | — | — |
| 5 | Won | — | ✓ | WON |
| 6 | Lost | — | ✓ | LOST |

---

## API Endpoints — Opportunities

### GET /api/v1/opportunities
**Roles**: All (visibility-scoped)

**Query params**: `page`, `pageSize`, `search`, `customerId`, `ownerId`, `stageId`, `minRevenue`, `maxRevenue`, `closeDateFrom`, `closeDateTo`, `includeTerminal`, `sortBy`, `sortOrder`

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Acme Enterprise Renewal",
      "expectedRevenue": "125000.00",
      "probability": 75,
      "expectedCloseDate": "2026-06-30T00:00:00Z",
      "stage": { "id": "uuid", "name": "Negotiation", "displayOrder": 4 },
      "customer": { "id": "uuid", "companyName": "Acme Corp" },
      "contact": { "id": "uuid", "firstName": "Sarah", "lastName": "Lee" },
      "owner": { "id": "uuid", "firstName": "Jane", "lastName": "Doe" },
      "createdAt": "2026-02-01T08:00:00Z",
      "updatedAt": "2026-05-20T16:00:00Z"
    }
  ],
  "meta": { "total": 85, "page": 1, "pageSize": 20, "totalPages": 5 }
}
```

---

### POST /api/v1/opportunities
**Roles**: SYSTEM_ADMINISTRATOR, SALES_MANAGER, SALES_REPRESENTATIVE

**Request**:
```json
{
  "name": "NewCo Platform Deal",
  "customerId": "uuid",
  "contactId": "uuid",
  "ownerId": "uuid",
  "expectedRevenue": 50000,
  "probability": 30,
  "expectedCloseDate": "2026-09-30T00:00:00Z"
}
```

- Stage defaults to the stage with `isDefault = true` (Lead).
- `ownerId` defaults to the authenticated user.

**Response 201**: Created opportunity.

---

### GET /api/v1/opportunities/:id
**Roles**: All (visibility-scoped)

**Response 200**: Full opportunity with stage history, task count, file count.

---

### PATCH /api/v1/opportunities/:id
**Roles**: Owner or SYSTEM_ADMINISTRATOR, SALES_MANAGER

**Request**: Any subset of POST fields (excluding `stageId` — use `/stage` endpoint).

**Response 200**: Updated opportunity.

---

### PATCH /api/v1/opportunities/:id/stage
**Roles**: Owner or SYSTEM_ADMINISTRATOR, SALES_MANAGER

Move to a non-terminal stage.

**Request**: `{ "stageId": "uuid" }`

**Response 200**: Updated opportunity.

**Errors**: `409 STAGE_IS_TERMINAL`, `404 STAGE_NOT_FOUND`

---

### POST /api/v1/opportunities/:id/close/won
**Roles**: Owner or SYSTEM_ADMINISTRATOR, SALES_MANAGER

**Request** (optional): `{ "closeNote": "Signed contract received." }`

**Response 200**: Opportunity with terminal Won stage; `actualCloseDate` set.

---

### POST /api/v1/opportunities/:id/close/lost
**Roles**: Owner or SYSTEM_ADMINISTRATOR, SALES_MANAGER

**Request** (optional): `{ "closeNote": "Budget cut for Q3." }`

**Response 200**: Opportunity with terminal Lost stage.

---

## API Endpoints — Pipeline Board

### GET /api/v1/pipeline
**Roles**: All (visibility-scoped)

Returns all active (non-terminal, non-deleted) stages with their opportunity cards.

**Query params**: `ownerId`, `search`, `closeDateFrom`, `closeDateTo`

**Response 200**:
```json
{
  "data": [
    {
      "stage": { "id": "uuid", "name": "Lead", "displayOrder": 1 },
      "opportunities": [
        {
          "id": "uuid",
          "name": "NewCo Platform Deal",
          "expectedRevenue": "50000.00",
          "expectedCloseDate": "2026-09-30T00:00:00Z",
          "owner": { "id": "uuid", "firstName": "Jane", "lastName": "Doe" }
        }
      ],
      "totalValue": "50000.00",
      "count": 1
    }
  ]
}
```

---

## API Endpoints — Pipeline Stage Configuration (Admin)

### GET /api/v1/pipeline/stages
**Roles**: All authenticated

**Response 200**: Ordered list of all stages (including terminal).

---

### POST /api/v1/pipeline/stages
**Roles**: SYSTEM_ADMINISTRATOR

**Request**: `{ "name": "Discovery", "displayOrder": 2 }`

**Response 201**: Created stage.

---

### PATCH /api/v1/pipeline/stages/:id
**Roles**: SYSTEM_ADMINISTRATOR

**Request**: Subset of POST fields.

**Response 200**: Updated stage.

**Errors**: `409 CANNOT_MODIFY_TERMINAL_STAGE`

---

### DELETE /api/v1/pipeline/stages/:id
**Roles**: SYSTEM_ADMINISTRATOR

**Response 204**

**Errors**: `409 STAGE_HAS_ACTIVE_OPPORTUNITIES`

---

### PATCH /api/v1/pipeline/stages/reorder
**Roles**: SYSTEM_ADMINISTRATOR

**Request**: `{ "stageIds": ["uuid-1", "uuid-2", "uuid-3"] }` — full ordered list

**Response 200**: Reordered stage list.

---

## Frontend Pages

| Route | Component | Notes |
|-------|-----------|-------|
| `/opportunities` | `OpportunityListPage` | Paginated table with filters |
| `/opportunities/new` | `OpportunityFormPage` | Create form |
| `/opportunities/:id` | `OpportunityDetailPage` | Summary + tabs |
| `/opportunities/:id/edit` | `OpportunityFormPage` | Edit form |
| `/pipeline` | `PipelineBoardPage` | Kanban board |
| `/settings` (stages tab) | `PipelineStageConfig` | Admin only |

### Opportunity List Page
- Columns: Name, Customer, Stage (chip), Owner, Expected Revenue, Close Date, Created At
- Filters: Stage, Customer, Owner, Date range, Terminal (include/exclude)
- Search: opportunity name
- Row click → detail page

### Opportunity Detail Page
- **Summary panel**: Name, stage chip, customer (linked), contact, owner, expected revenue, probability, close dates, close note
- **Actions**: Edit, Close as Won, Close as Lost (role-gated)
- **Tabs** (lazy-loaded, max 10 records):
  - Tasks — title, status chip, due date, assignee; "Add Task" button
  - Files — name, size, date, uploader; "Upload File" button
  - Activities — filtered from parent customer's activities

### Pipeline Board Page
- Kanban columns, one per non-terminal stage (ordered by `displayOrder`)
- Each card shows: opportunity name, customer, expected revenue, close date, owner avatar
- Drag-and-drop via `@dnd-kit` to move between stages (keyboard accessible)
- Filter bar: Owner dropdown, date range, search
- Click card → opportunity detail page
- Stage column header shows: stage name, count, total value

---

## Business Rules

- `stageId` on `/stage` endpoint cannot be a terminal stage — use `/close/won` or `/close/lost` instead.
- When a customer is archived, all open opportunities are atomically soft-deleted with `closeNote = "Customer archived"` and `actualCloseDate` set.
- Pipeline board only shows non-terminal, non-deleted opportunities.
- `includeTerminal=true` on the list endpoint includes Won/Lost opportunities.
- Revenue forecast = sum of (`expectedRevenue × probability/100`) for all open opportunities in current calendar year.
- Terminal stages (Won/Lost) cannot be edited or reordered.
- A pipeline stage cannot be deleted if any active opportunity is in that stage.
