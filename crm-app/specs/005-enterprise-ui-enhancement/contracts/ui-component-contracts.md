# UI Component Contracts

This feature is a frontend quality improvement. The contracts below define the interface for new shared components introduced by this feature. No backend API contract changes are required.

---

## EmptyState Component Contract

**File**: `frontend/src/shared/components/EmptyState.tsx`

**Props interface**:
```typescript
interface EmptyStateProps {
  icon?: React.ReactNode;       // Optional icon, defaults to InboxIcon
  title: string;                // Required: primary message
  description?: string;         // Optional: secondary guidance
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

**Render contract**:
- Centered vertically and horizontally within its container
- Icon rendered at 48px size in `text.secondary` color
- Title in `body1` weight 600
- Description in `body2` color `text.secondary`
- Action button uses `variant="contained"` size `"small"`

**Usage contract**:
- Used in ALL listing page components when `data?.data.length === 0 && !isLoading`
- Must be placed inside the existing `TableContainer` or as a sibling of the table (not inside `TableBody`)

---

## UserAvatarMenu Component Contract

**File**: `frontend/src/shared/components/UserAvatarMenu.tsx`

**Props interface**:
```typescript
interface UserAvatarMenuProps {
  user: {
    fullName?: string;
    email?: string;
    role?: { name: string };
  };
  onLogout: () => void;
}
```

**Render contract**:
- Avatar shows user initials (first letter of first name + first letter of last name)
- Avatar size: 28×28px (compact for dense AppBar)
- Clicking avatar opens a MUI `Menu` anchored below
- Menu items: user name (non-clickable display), role chip (non-clickable), divider, "Sign out" (calls `onLogout`)
- Menu max width: 200px

**Replaces**: `<Tooltip title="Logout"><IconButton>…Out…</IconButton></Tooltip>` in AppShell.tsx

---

## ActivitiesPage Component Contract

**File**: `frontend/src/modules/activities/ActivitiesPage.tsx`

**Data contract** (consuming existing API):
```typescript
// Existing hook (already in codebase via ActivityTimeline usage)
useActivities({
  page: number,      // 1-indexed
  pageSize: number,
  type?: ActivityType,
  search?: string,
}): { data: PaginatedResponse<Activity>, isLoading: boolean }
```

**Render contract**:
- Page header: "Activities" h5 title + optional "Log Activity" button
- Filter row: type Select (CALL, EMAIL, MEETING, FOLLOW_UP, INTERNAL_ACTION) + search TextField
- Results in `Table size="small"` with columns: Type (chip), Subject, Related To (link), Due Date, Assignee, Created
- Pagination via `TablePagination`
- Empty state via `EmptyState` component when no results
- Loading state via `CircularProgress` in table body row

**Route registration**:
- Path: `/activities`
- Wrapped in `AuthGuard` + `AppShell`
- All authenticated roles can access
