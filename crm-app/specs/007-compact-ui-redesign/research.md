# Phase 0 Research: Compact Professional UI Redesign

## Technical Stack (Resolved)

**Decision**: MUI v9.1.1 (Material UI v9) on React 19 with TypeScript, Vite 8.
**Rationale**: Already installed and in active use throughout the codebase.
**No unknowns**: Stack is fully determined from `frontend/package.json`.

---

## Research Finding 1: MUI v9 Theme Override Strategy

**Decision**: Implement the compact theme entirely through MUI `createTheme` overrides in `frontend/src/theme/theme.ts`. No new component library. No style resets.

**Rationale**:
- MUI v9 `createTheme` supports `typography`, `spacing`, `components.*.styleOverrides`, and `components.*.defaultProps` — these are the exact levers needed for a compact scale.
- All 13 page sections already use MUI components (Button, Table, Card, Typography, etc.), so a single theme change propagates everywhere with no per-page edits.
- Existing overrides in `theme.ts` (TableCell padding, Button no-elevation) demonstrate this pattern is already established and understood.

**Alternatives considered**:
- **CSS file overrides**: Would require targeting generated MUI class names that change between versions — fragile and undiscoverable.
- **Tailwind CSS layer**: Not installed; adding it just for spacing is a disproportionate dependency.
- **Styled-components replacement**: Would require rewriting all components — far out of scope.

---

## Research Finding 2: Sidebar Width Reduction

**Decision**: Reduce `DRAWER_WIDTH` constant in `AppShell.tsx` from `220` to `168px`. Use a dark sidebar background (`#1e293b`, a blue-grey slate matching the reference image's dark green tone but aligned with the existing primary palette family).

**Rationale**:
- The spec requires ≤ 180px. Current is 220px — a 52px reduction frees meaningful horizontal space.
- 168px fits icon + short label (≤ 12 characters) at 13px font without truncation.
- The dark sidebar (`#1e293b`) creates the contrast between sidebar and main content area required by FR-022 and gives the "professional" character the user requested.
- MUI `Drawer` `PaperProps` accept `sx` for background color.

**Alternatives considered**:
- **160px**: Slightly tighter — a few labels ("Audit Log", "Import/Export") would need truncation.
- **Collapsible mini-drawer**: More complex; the spec doesn't require collapse — only compactness.

---

## Research Finding 3: Header Height

**Decision**: Header is already ≤ 48px via `Toolbar` with `variant="dense"` in `AppShell.tsx`. No height change needed — only visual adjustments (search width capped, padding tightened).

**Rationale**:
- MUI `Toolbar` with `variant="dense"` renders at 48px. Confirmed in AppShell source. FR-001 is already met structurally.
- The `GlobalSearchBar` currently renders at unconstrained width inside the header. It needs an explicit `maxWidth: 280px` cap (FR-003).

---

## Research Finding 4: Typography Scale

**Decision**: Add a full compact typography scale to `createTheme` targeting the ranges defined in the spec:

| Role | Current | Target |
|------|---------|--------|
| Body (body1, body2) | MUI default 16px/14px | 13px / 13px |
| Caption | 12px | 11px |
| Page title (h6) | 20px | 16px |
| Section heading (h5) | 24px | 18px |
| KPI metric value | h5 (24px) | 20px via variant override |
| KPI label | body2 (14px) | 11px, not uppercase |
| Button text | 14px | 13px |
| Sidebar nav label | body2 (14px) | 13px |

**Rationale**: MUI `typography` section in `createTheme` maps directly to variant sizes. A single change cascades to every Typography component in the app.

**Alternatives considered**:
- **CSS custom properties**: Would require coordinating with MUI's own font-size resolution — error-prone.
- **Per-component fontSize**: Too scattered; misses all implicit uses of Typography variants.

---

## Research Finding 5: MetricCard (Dashboard KPI Widget)

**Decision**: Change `MetricCard.tsx` to use `Typography variant="h5"` at 20px (via theme) for the value, and `Typography variant="caption"` for the label — removing `textTransform: 'uppercase'` from the label style.

**Rationale**:
- Current `variant="h5"` renders at 24px (too large — spec wants 18–24px, 20px is a good balance).
- Current `textTransform: 'uppercase'` on the title label violates FR-016.
- The fix is isolated to `MetricCard.tsx` — one file, two line changes.

---

## Research Finding 6: Content Padding

**Decision**: Reduce page-level padding from `p: 3` (24px) to `p: 2` (16px) across all page components. Override `MuiCard`'s default content padding via theme.

**Rationale**:
- MUI spacing(2) = 16px. Spec requires 16–20px (FR-017). Using `p: 2` gives exactly 16px.
- DashboardPage, CustomerListPage, and all other page wrappers use `<Box sx={{ p: 3 }}>` — a global search-and-replace catches all instances.
- Card internal padding: `MuiCardContent` default is 16px; can be reduced to 12px via theme override (FR-020).

---

## Research Finding 7: Table Row Height

**Decision**: `MuiTableRow` height is controlled by `MuiTableCell` padding. Current theme already sets `padding: '6px 12px'` on cells. With 13px font and 6px top/bottom padding, row height ≈ 13 + 12 = 25px — already well under the 40px limit.

**Rationale**: No additional theme changes needed for table row height. FR-013 is already met by the existing `MuiTableCell` override.

---

## Research Finding 8: Button Size

**Decision**: Add `MuiButton` size override in theme: `small` variant height 28px, `medium` (default) height 32px. Set `fontSize: '0.8125rem'` (13px) on all button sizes.

**Rationale**: FR-018 requires ≤ 32px tall buttons. Current MUI v9 default button height is 36px for `size="medium"`. Overriding via `styleOverrides` in theme is the cleanest approach.

---

## Research Finding 9: Sidebar Nav Item Height

**Decision**: Set sidebar nav item height to 34px via `MuiListItemButton` style override in AppShell or via theme. FR-010 requires ≤ 36px per item.

**Rationale**: The current nav items use `ListItemButton` without explicit height — MUI default is 48px. A theme override on `MuiListItemButton` to `minHeight: 34px, padding: '4px 12px'` reduces this globally and aligns with FR-010.

---

## Research Finding 10: Accent Colour Consistency

**Decision**: Use the existing primary palette `#1976d2` as the single accent colour for active states, primary buttons, and links (FR-023). The active sidebar item gets `backgroundColor: alpha('#1976d2', 0.12)` with primary-coloured text/icon.

**Rationale**: The existing theme already uses `#1976d2` as primary. Reusing it avoids introducing a second colour and maintains MUI's built-in active/selected state handling.

---

## Implementation Scope Summary

| Change | Mechanism | Files Affected |
|--------|-----------|----------------|
| Typography scale | `createTheme` typography section | `theme.ts` |
| Button size | `MuiButton` styleOverrides | `theme.ts` |
| Table cell padding | already done | `theme.ts` (no change) |
| Card padding | `MuiCardContent` styleOverrides | `theme.ts` |
| ListItemButton height | `MuiListItemButton` styleOverrides | `theme.ts` |
| Sidebar width | `DRAWER_WIDTH` constant | `AppShell.tsx` |
| Sidebar background | `Drawer PaperProps sx` | `AppShell.tsx` |
| Sidebar nav active style | `ListItemButton selected sx` | `AppShell.tsx` |
| Header search width | `maxWidth: 280` | `GlobalSearchBar.tsx` |
| KPI metric labels | Remove uppercase, adjust variant | `MetricCard.tsx` |
| Page padding | `p: 2` (16px) | All page components (~13 files) |
| Section heading size | typography variant via theme | `theme.ts` |

All changes are visual-only. No backend APIs, no data models, no new routes.
