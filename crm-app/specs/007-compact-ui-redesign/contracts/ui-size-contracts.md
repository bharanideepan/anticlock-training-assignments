# UI Contracts: Compact Professional UI Redesign

> These contracts define the measurable visual boundaries that the implementation MUST satisfy.
> They are expressed in pixel values and CSS-measurable properties — independent of implementation technology.

## Contract C-001: Header

| Property | Constraint | Measurement Method |
|----------|-----------|-------------------|
| Rendered height | ≤ 48px | `element.getBoundingClientRect().height` on the `<header>` or top `AppBar` element |
| Search input width | ≤ 280px | `element.getBoundingClientRect().width` on the search `<input>` |
| Avatar diameter | 28–32px | `element.getBoundingClientRect().width` on the Avatar element |
| Avatar position | Right-aligned | Avatar x-offset > search input x-offset |
| Notification bell position | Right-aligned, left of avatar | bell x-offset > search x-offset AND < avatar x-offset |

## Contract C-002: Sidebar

| Property | Constraint | Measurement Method |
|----------|-----------|-------------------|
| Drawer width (expanded) | ≤ 180px | `element.getBoundingClientRect().width` on the sidebar `<nav>` or Drawer Paper element |
| Nav item height | ≤ 36px | `element.getBoundingClientRect().height` on any `ListItemButton` |
| Active item highlighted | Distinct background | `background-color` differs from inactive items; must not be `transparent` |
| Icon + label both visible | Both present in DOM | Icon element + text element both exist and not hidden |

## Contract C-003: Typography

| Element | Font Size Constraint | Measurement Method |
|---------|---------------------|-------------------|
| Body text (paragraphs, table cells, form inputs) | 13–14px | `getComputedStyle(el).fontSize` |
| Caption / small labels | 11–12px | `getComputedStyle(el).fontSize` |
| Page title (h6) | ≤ 18px | `getComputedStyle(el).fontSize` |
| KPI metric value | 18–24px | `getComputedStyle(el).fontSize` on Dashboard stat number |
| KPI metric label | 11–12px | `getComputedStyle(el).fontSize` on Dashboard stat label |
| KPI metric label casing | Not all-caps | `getComputedStyle(el).textTransform !== 'uppercase'` |
| Button text | 13px | `getComputedStyle(el).fontSize` on `<button>` |

## Contract C-004: Spacing & Layout

| Property | Constraint | Measurement Method |
|----------|-----------|-------------------|
| Table row height | ≤ 40px | `element.getBoundingClientRect().height` on any `<tr>` in data tables |
| Primary button height | ≤ 32px | `element.getBoundingClientRect().height` on `size="medium"` buttons |
| Page outer padding | 16–20px | `getComputedStyle(el).padding` on the main content wrapper |
| Card internal padding | ≤ 12px | `getComputedStyle(el).padding` on `CardContent` element |

## Contract C-005: Viewport Fit (1280×768)

Measured at exactly 1280×768 browser viewport with default zoom (100%):

| Visible Without Scrolling | Minimum Count |
|--------------------------|---------------|
| Dashboard KPI widgets | 4 |
| Sidebar nav items | All primary nav items (≥ 6) |
| Header (full) | 1 (always) |
| Table rows (list pages) | ≥ 8 |

## Contract C-006: Colour

| Property | Requirement | Verification |
|----------|------------|-------------|
| Sidebar background | Distinct from main content; dark or accent-toned | Visual difference is immediately perceptible; not `#ffffff` or `#f5f5f5` |
| Accent colour (buttons, active states, links) | Consistent across all pages | Same hex value applied everywhere |
| Text contrast (WCAG AA) | ≥ 4.5:1 for body text, ≥ 3:1 for large text | Browser accessibility tools or contrast ratio calculator |

## Contract C-007: Scope

All of the above contracts apply equally to:
- Dashboard
- Customers (list + detail + form)
- Contacts (list + detail + form)
- Opportunities (list + detail + form)
- Pipeline (board view)
- Tasks (list)
- Activities (list)
- Reports
- Users (list + detail + form) — admin only
- Audit Log — admin only
- Import/Export
- Settings
- Notification Center
