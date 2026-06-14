# Data Model: Enterprise UI Enhancement

This feature is a UI quality layer — no new backend entities or database schema changes are introduced. The data model below documents the **frontend component and state model** for new or restructured UI elements.

---

## New Frontend Components

### EmptyState

A shared presentational component for zero-data states across all listing pages.

**Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| icon | ReactNode | No | Icon to display (defaults to InboxIcon) |
| title | string | Yes | Primary empty state message |
| description | string | No | Secondary guidance text |
| action | `{label: string, onClick: () => void}` | No | Optional CTA button |

**State**: None (stateless presentational component)

---

### UserAvatarMenu

A header component combining a user avatar with a dropdown menu for profile actions.

**Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| user | User | Yes | Current authenticated user object |
| onLogout | `() => void` | Yes | Logout handler |

**Local State**:
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| anchorEl | HTMLElement \| null | null | Menu anchor for MUI Menu positioning |

---

### ActivitiesPage (new page)

A full-page activity log showing all CRM activities (calls, emails, meetings, follow-ups) across all entities, with filter controls.

**Local State**:
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 0 | Current page (0-indexed for MUI TablePagination) |
| pageSize | number | 20 | Rows per page |
| typeFilter | ActivityType \| '' | '' | Filter by activity type |
| search | string | '' | Free-text search |

**Data Dependencies**:
- `useActivities({ page, pageSize, type, search })` — existing activities API hook

---

## Modified Frontend Components

### MetricCard (modified)

**Change**: `variant` for value typography reduced from `h4` → `h5`. CardContent padding reduced.

**Before**:
```
value typography: variant="h4" (34px rendered)
card padding: default MUI CardContent (16px)
```

**After**:
```
value typography: variant="h5" (24px rendered)
card padding: sx={{ p: '12px 16px', '&:last-child': { pb: '12px' } }}
```

---

### RevenueTrendChart (modified)

**Change**: Fix `ResponsiveContainer` — replace `sx={{height, width}}` with native `height={number}` on a wrapping `Box`.

**Before**:
```tsx
<ResponsiveContainer sx={{height: 260, width: "100%"}}>
```

**After**:
```tsx
<Box sx={{ height: 260, width: '100%' }}>
  <ResponsiveContainer width="100%" height="100%">
```

Additional changes: add `dot={false}` already present, add `activeDot` style, improve tooltip label formatting with month/year.

---

### PipelineFunnelChart (modified)

**Change**: Fix `YAxis` — replace `sx={{width: 80}}` with native `width={80}`. Fix `ResponsiveContainer` same as above.

---

### ActivityTrendChart (modified)

**Change**: Fix `ResponsiveContainer` same as above. Confirm no other Recharts-on-MUI prop bugs.

---

### TeamPerformanceTable (modified)

**Change**: Convert from plain `<table>` or basic list to a compact MUI `Table` with a `LinearProgress` performance indicator bar per row. Columns: Rank, Sales Rep, Deals Won, Revenue, Win Rate (bar).

---

### PipelineBoardPage (modified)

**Change**: Replace free-text "Owner ID filter" `TextField` with a `Select` populated via `useUsers()` API hook showing `user.fullName`. Value stored as userId string.

---

### AppShell (modified)

**Change**: Replace `<Typography variant="caption" color="error">Out</Typography>` logout button with a `UserAvatarMenu` component. Show user initials as avatar fallback.

---

## Route Model

### New Route

| Path | Component | Auth | Roles | Notes |
|------|-----------|------|-------|-------|
| `/activities` | `ActivitiesPage` | AuthGuard | All authenticated | Missing from routes.tsx; nav item exists |

### Validation: All Existing Routes

All routes in `routes.tsx` are correctly wired with `AuthGuard` and `RoleGuard` where applicable. The only missing route is `/activities` (documented above).

---

## Theme Tokens (Modified)

Changes to `frontend/src/theme/theme.ts`:

| Token | Before | After |
|-------|--------|-------|
| `MuiTableHead` background | none (inherits) | `grey[50]` (#fafafa) |
| `MuiTableHead` fontWeight | 400 (default) | 600 |
| `MuiTableCell` padding | 16px (default) | `6px 12px` (dense) |
| `MuiCard` borderRadius | 12px | 8px (tighter for dense layouts) |
