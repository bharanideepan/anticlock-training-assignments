# Research: Enterprise UI Enhancement

## Technology Stack (Resolved)

**Decision**: React 18 + TypeScript + Vite, MUI v5/v6, React Router v6, Recharts 2.x, React Query v5, Zustand, React Hook Form + Zod.
**Rationale**: Confirmed from `frontend/package.json`. All chart and UI improvements stay within this stack — no new libraries needed.
**Alternatives considered**: None — existing stack is already enterprise-capable; adding a new charting library would create bloat.

---

## Critical Bug: Recharts ResponsiveContainer Props (Resolved)

**Decision**: All `<ResponsiveContainer>` usages in `RevenueTrendChart.tsx`, `PipelineFunnelChart.tsx`, and `ActivityTrendChart.tsx` must be converted from `sx={{height, width}}` (MUI-only prop) to native Recharts props `height={number}` and `width="100%"`.
**Rationale**: `ResponsiveContainer` is a Recharts component, not a MUI component — it does not accept `sx`. Passing `sx` silently fails, leaving the container at 0×0 and making charts invisible or broken. Confirmed by code inspection of all three chart files.
**Alternatives considered**: Wrapping in a MUI `<Box>` with explicit height and using `width="100%"` on ResponsiveContainer — this is the correct pattern and is adopted in the plan.

---

## Broken Navigation Route: /activities (Resolved)

**Decision**: Add an `/activities` route to `routes.tsx` with a dedicated `ActivitiesPage` that renders a timeline/log of all activities across the CRM (calls, emails, meetings, follow-ups).
**Rationale**: `AppShell.tsx` NAV_ITEMS includes `{ label: 'Activities', path: '/activities' }` but `routes.tsx` has no matching route. Clicking "Activities" in the sidebar currently navigates to a broken state (no match → `NotFoundPage`). The activities module already has `ActivityFormDialog.tsx` and `ActivityTimeline.tsx` — a list page can be assembled from these existing parts.
**Alternatives considered**: Removing the Activities nav item — rejected because activities are a core CRM feature and partially implemented components already exist.

---

## Dashboard Chart Quality (Resolved)

**Decision**: Improve all four dashboard visualizations to be enterprise-grade while keeping Recharts as the library. Specific improvements:
- `RevenueTrendChart`: Add proper tick formatting, reference lines, proper margins, tooltips with currency formatting.
- `PipelineFunnelChart`: Fix the `YAxis` `sx` prop bug (use `width={80}` not `sx={{width: 80}}`), improve color palette.
- `ActivityTrendChart`: Confirm the same `ResponsiveContainer` prop bug and fix it.
- `TeamPerformanceTable`: Convert from a plain table to a styled leaderboard with visual performance bars.

**Rationale**: Charts are currently broken due to the `sx` prop bug. Even after fixing, they need visual polish for enterprise quality — proper margins, grid styling, tooltip content, and label formatting.
**Alternatives considered**: Switching to MUI Charts (beta) — rejected because Recharts is already installed, mature, and used throughout; a library swap would be a large refactor.

---

## MetricCard Density (Resolved)

**Decision**: Reduce `MetricCard` value typography from `variant="h4"` to `variant="h5"` and reduce `CardContent` padding from default (16px) to 12px via `sx` override. Keep the 8-card grid layout but ensure cards render in a tighter, more enterprise-appropriate density.
**Rationale**: `variant="h4"` (34px) is oversized for a compact enterprise dashboard. `variant="h5"` (24px) provides better information density while maintaining visual hierarchy. Large fonts force card height up and reduce the amount of content visible above the fold.
**Alternatives considered**: Using a custom font size via `sx` — rejected in favour of the theme scale for consistency.

---

## AppShell Header Quality (Resolved)

**Decision**: Replace the "Out" text logout button with a proper `Avatar`-based user menu (MUI `IconButton` + `Menu` with user name, role badge, and a "Sign out" menu item). Add a user display name to the header.
**Rationale**: The current logout "button" is a red `<Typography variant="caption">Out</Typography>` inside an `IconButton` — this is prototype-grade, not enterprise-grade. A user avatar menu is the standard enterprise pattern.
**Alternatives considered**: A dedicated logout icon button (no menu) — simpler but loses the ability to show user identity in the header, which is a standard enterprise expectation.

---

## Pipeline Board Owner Filter (Resolved)

**Decision**: Replace the free-text "Owner ID filter" `TextField` with a `Select` dropdown populated from the users API, showing names (not raw UUIDs).
**Rationale**: The current owner filter requires pasting a raw UUID — unusable in production. A select dropdown with user names is the expected UX pattern.
**Alternatives considered**: Autocomplete from users API — preferable UX for large user lists, but a simple Select is sufficient for typical team sizes and avoids complexity.

---

## Empty State Handling (Resolved)

**Decision**: Add a shared `EmptyState` component to `shared/components/` that displays a centered icon, heading, and optional CTA button. Apply it to all listing pages when `data?.data.length === 0` and `!isLoading`.
**Rationale**: Currently, empty listing pages render an empty table body with no messaging — a first-time user sees a blank screen with no guidance. This is a UX gap across all listing pages (Customers, Contacts, Opportunities, Tasks).
**Alternatives considered**: Inline empty state per-page — rejected for duplication; a shared component ensures consistency.

---

## Theme Enhancement (Resolved)

**Decision**: Augment `theme.ts` with:
- `MuiTableHead` style override: slightly elevated background (`grey[50]`) and `fontWeight: 600` for column headers.
- `MuiTableCell` style override: compact `padding: '6px 12px'` to improve table density.
- `MuiPaper` default `variant: 'outlined'` as default elevation for content containers.
- `MuiLinearProgress` colour tokens for performance bars.
- Typography `body2` and `caption` size tweaks for consistent secondary text.

**Rationale**: Listing pages already use `Table size="small"` but MUI's default cell padding is still relatively loose. Theme-level overrides apply consistently across all tables without per-component changes.
**Alternatives considered**: Inline `sx` overrides on each table — rejected because it creates drift and maintenance burden.
