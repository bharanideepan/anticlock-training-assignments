# Data Model: Detail Page Enrichment

> This feature is frontend-only. No schema migrations. All entities and fields below already exist in the backend and are reflected in `frontend/src/shared/types/api.types.ts`.

## Display Fields by Record Type

### ContactRow display fields
Source: `Contact` interface + embedded `customer`

| Field | Display | Notes |
|-------|---------|-------|
| `firstName` + `lastName` | Full name (bold) | Always shown |
| `designation` | Subtitle line 1 | Omit if null |
| `department` | Appended to designation with `·` | Omit if null |
| `email` | mailto link with email icon | Omit if null |
| `phone` | tel link with phone icon | Omit if null |

### ActivityRow display fields
Source: `Activity` interface (type includes `occurredAt` or `scheduledAt`)

| Field | Display | Notes |
|-------|---------|-------|
| `type` | Chip (e.g. CALL, EMAIL, MEETING) | Always shown |
| `subject` | Primary text | Always shown |
| `occurredAt` / `scheduledAt` | Formatted date | Use whichever is set |
| `description` | Truncated to 80 chars | Omit if null |

### OpportunityRow display fields
Source: `Opportunity` interface with embedded `stage` and `owner`

| Field | Display | Notes |
|-------|---------|-------|
| `name` | Primary text (bold) | Always shown |
| `stage.name` | Colored chip (WON=success, LOST=error, else default) | Always shown |
| `expectedRevenue` | Currency formatted `$N,NNN` | Omit if null |
| `expectedCloseDate` | Formatted date | Omit if null |
| `owner.firstName + lastName` | Caption text | Omit if null |

### TaskRow display fields
Source: `Task` interface with embedded `assignee`

| Field | Display | Notes |
|-------|---------|-------|
| `title` | Primary text | Always shown |
| `status` | Chip (OPEN=info, COMPLETED=success, CANCELLED=default) | Always shown |
| `dueDate` | Formatted date; red if `isOverdue` | Omit if null |
| `assignee.firstName + lastName` | Caption text | Omit if null |

### FileRow display fields
Source: `FileRecord` interface with embedded `uploadedBy`

| Field | Display | Notes |
|-------|---------|-------|
| `originalName` | Primary text (truncated, max 40 chars) | Always shown |
| `sizeBytes` | Human-readable size (KB/MB) | Always shown |
| `createdAt` | Formatted date | Always shown |
| `uploadedBy.firstName + lastName` | Caption text | Always shown |

---

## Tab Data Sources by Detail Page

### CustomerDetailPage tabs

| Tab | Hook | Params | "View all" target |
|-----|------|--------|-------------------|
| Contacts | `useCustomerContacts(id, { pageSize: 10 })` | lazy | `/contacts?customerId=<id>` |
| Activities | `useCustomerActivities(id, { pageSize: 10 })` | lazy | `/activities?customerId=<id>` |
| Opportunities | `useCustomerOpportunities(id, { pageSize: 10 })` | lazy | `/opportunities?customerId=<id>` |
| Tasks | `useCustomerTasks(id, { pageSize: 10 })` | lazy | `/tasks?customerId=<id>` |
| Files | `useCustomerFiles(id)` | lazy | — |

### ContactDetailPage tabs

| Tab | Hook | Params | "View all" target |
|-----|------|--------|-------------------|
| Activities | `useContactActivities(id, { pageSize: 10 })` | lazy | `/activities?contactId=<id>` |
| Opportunities | `useOpportunities({ contactId: id, pageSize: 10 })` | lazy | `/opportunities?contactId=<id>` |

### OpportunityDetailPage tabs

| Tab | Hook | Params | "View all" target |
|-----|------|--------|-------------------|
| Tasks | `useTasks({ opportunityId: id, pageSize: 10 })` | lazy | `/tasks?opportunityId=<id>` |
| Files | `useFiles('OPPORTUNITY', id, enabled)` | lazy | — |

---

## "Add" Action Targets

| Context | Action | Mechanism |
|---------|--------|-----------|
| Customer → Contacts tab | Add Contact | Navigate `/contacts/new` with state `{ customerId }` |
| Customer → Activities tab | Log Activity | Open `ActivityFormDialog` with `customerId` prop |
| Customer → Opportunities tab | Add Opportunity | Navigate `/opportunities/new` with state `{ customerId }` |
| Customer → Tasks tab | Add Task | Open `TaskFormDialog` with `customerId` prop |
| Contact → Activities tab | Log Activity | Open `ActivityFormDialog` with `customerId` + `contactId` props |
| Opportunity → Tasks tab | Add Task | Open `TaskFormDialog` with `opportunityId` prop |
