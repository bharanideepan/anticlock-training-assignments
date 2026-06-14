# UI Component Contracts: Detail Page Enrichment

## Shared Row Components

### ContactRow
```
Props:
  contact: {
    id: string
    firstName: string
    lastName: string
    email?: string
    phone?: string
    designation?: string
    department?: string
  }
  onClick: () => void   // navigates to /contacts/:id

Renders:
  - Line 1: "{firstName} {lastName}" — bold body2
  - Line 2: "{designation} · {department}" — caption, omit if both null
  - Line 3: email as <a href="mailto:..."> with MailIcon — omit if null
  - Line 4: phone as <a href="tel:..."> with PhoneIcon — omit if null
  - Entire row is clickable (onClick)
```

### ActivityRow
```
Props:
  activity: {
    id: string
    type: string
    subject: string
    description?: string
    occurredAt?: string
    scheduledAt?: string
  }
  onClick: () => void   // navigates to /activities/:id

Renders:
  - Left: type Chip (small, outlined)
  - Center: subject (body2, bold) + description truncated to 80 chars (caption)
  - Right: date (caption, text.secondary)
```

### OpportunityRow
```
Props:
  opportunity: {
    id: string
    name: string
    stage: { name: string; terminalOutcome?: string }
    expectedRevenue?: string
    expectedCloseDate?: string
    owner?: { firstName: string; lastName: string }
  }
  onClick: () => void   // navigates to /opportunities/:id

Renders:
  - Line 1: name (bold) + stage chip (success if WON, error if LOST, default otherwise)
  - Line 2: "$N,NNN" + "· Close: {date}" + "· {owner}" — caption, omit null fields
```

### TaskRow
```
Props:
  task: {
    id: string
    title: string
    status: 'OPEN' | 'COMPLETED' | 'CANCELLED'
    dueDate?: string
    isOverdue?: boolean
    assignee?: { firstName: string; lastName: string }
  }
  onClick: () => void   // navigates to /tasks/:id

Renders:
  - Line 1: title (bold) + status chip (info=OPEN, success=COMPLETED, default=CANCELLED)
  - Line 2: "Due: {date}" in red if isOverdue + "· {assignee}" — caption
```

### FileRow
```
Props:
  file: {
    id: string
    originalName: string
    sizeBytes: number
    createdAt: string
    uploadedBy?: { firstName: string; lastName: string }
  }
  (no onClick — files are not navigable; future download handled separately)

Renders:
  - Left: InsertDriveFileIcon
  - Center: originalName (truncated to 40 chars) + uploader name (caption)
  - Right: human-readable size + date (caption)
```

### EmptyTabState
```
Props:
  icon: ReactNode          // SvgIcon component to display
  message: string          // e.g. "No contacts yet."
  actionLabel?: string     // e.g. "Add Contact" — omit if user lacks permission
  onAction?: () => void    // callback for the action button

Renders:
  - Centered column: icon (large, muted) + message (body2, text.secondary) + outlined Button
  - If actionLabel/onAction absent: renders icon + message only (no button)
```

---

## Tab Panel Behavior Contract

Each tab in each detail page MUST satisfy:

1. **Lazy fetch**: data hook called with `enabled: activeTab === tabIndex`
2. **Loading state**: show `<CircularProgress size={24} />` centered while `isLoading && isFetching`
3. **Empty state**: show `<EmptyTabState>` when data exists but array is empty
4. **Record cap**: pass `pageSize: 10` to all paginated hooks
5. **"View all" link**: show `<Button size="small">View all →</Button>` below the list when `total > 10` (or `hasMore`)
6. **"Add" button**: show at top-right of tab panel, gated by role permission, triggers dialog or navigation
7. **Row click**: each row navigates to the record's detail page (except FileRow)
