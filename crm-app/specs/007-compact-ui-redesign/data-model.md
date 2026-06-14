# Data Model: Compact Professional UI Redesign

> This feature introduces no new backend entities, API endpoints, or database tables.
> All changes are confined to the frontend visual layer.

## Theme Configuration Entity (Frontend-Only)

The "data model" for this feature is the **MUI theme configuration object** — a TypeScript value
that lives in `frontend/src/theme/theme.ts` and is injected into the React tree via
`<ThemeProvider theme={theme}>`. It is not persisted; it is compiled at build time.

### Theme Token Reference

These are the concrete values that encode the compact design system:

#### Typography Scale

| Token | Property | Value | Spec Ref |
|-------|----------|-------|----------|
| `typography.fontSize` | Base font size | 13 (px) | FR-012 |
| `typography.body1.fontSize` | Body text | 0.8125rem (13px) | FR-012 |
| `typography.body2.fontSize` | Secondary text | 0.8125rem (13px) | FR-012 |
| `typography.caption.fontSize` | Small labels | 0.6875rem (11px) | FR-015 |
| `typography.h6.fontSize` | Page title | 1rem (16px) | FR-014 |
| `typography.h5.fontSize` | Section heading | 1.125rem (18px) | FR-014 |
| `typography.h4.fontSize` | Large heading | 1.25rem (20px) | FR-014 |
| `typography.button.fontSize` | Button label | 0.8125rem (13px) | FR-018 |

#### Spacing

| Token | Usage | Value | Spec Ref |
|-------|-------|-------|----------|
| Page wrapper `p` | Outer padding | 2 (= 16px) | FR-017 |
| Card content padding | `MuiCardContent` | 12px | FR-020 |
| Sidebar item padding | `MuiListItemButton` | 4px 12px | FR-010 |
| Sidebar item height | `MuiListItemButton minHeight` | 34px | FR-010 |

#### Sizing

| Component | Property | Value | Spec Ref |
|-----------|----------|-------|----------|
| Header (Toolbar dense) | Height | 48px | FR-001 |
| Sidebar (Drawer) | Width (`DRAWER_WIDTH`) | 168px | FR-006 |
| Search input | Max width | 280px | FR-003 |
| Avatar | Diameter | 28px | FR-005 |
| Primary button (medium) | Height | 32px | FR-018 |
| Primary button (small) | Height | 28px | FR-018 |
| KPI metric value | Font size | 20px (h5 → 18px override) | FR-015 |
| KPI label | Font size | 11px (caption) | FR-015 |

#### Colour Palette

| Token | Value | Usage | Spec Ref |
|-------|-------|-------|----------|
| `palette.primary.main` | `#1976d2` | Accent, active states, buttons | FR-023 |
| Sidebar background | `#1e293b` | Dark sidebar background | FR-022 |
| Sidebar active item bg | `alpha('#1976d2', 0.15)` | Selected nav item | FR-008 |
| Sidebar text (default) | `#94a3b8` (slate-400) | Inactive nav label/icon | FR-022 |
| Sidebar text (active) | `#ffffff` | Active nav label/icon | FR-008 |
| Table row hover | `action.hover` | Alternating/hover highlight | FR-024 |

## Component Size Contract

These values define the rendered dimensions that acceptance tests will verify:

```
Header height:      ≤ 48px
Sidebar width:      ≤ 180px (target: 168px)
Search max-width:   ≤ 280px
Table row height:   ≤ 40px
Button height:      ≤ 32px
Body font size:     13–14px
Caption font size:  11–12px
KPI value size:     18–24px
KPI label size:     11–12px
Page padding:       16–20px
```

## Entities with No Change

The following entities exist in the application but are **not modified** by this feature:

- All backend models (Customer, Contact, Opportunity, Task, Activity, User, etc.)
- All API endpoints and response shapes
- All Zustand stores
- All React Query cache keys
- All routing configuration
- Authentication and RBAC logic
