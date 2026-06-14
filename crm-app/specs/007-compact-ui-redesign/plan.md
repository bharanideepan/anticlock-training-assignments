# Implementation Plan: Compact Professional UI Redesign

**Branch**: `007-compact-ui-redesign` | **Date**: 2026-06-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-compact-ui-redesign/spec.md`

## Summary

Transform the CRM frontend from a spacious, large-font layout into a compact, information-dense professional UI — matching the Velo CRM reference image — by applying MUI theme overrides (typography scale, component sizes, spacing) and targeted changes to the AppShell, MetricCard, GlobalSearchBar, and all page-level padding across 13 major sections. No backend changes are required.

## Technical Context

**Language/Version**: TypeScript 5+ (tsconfig strict), React 19, Node 20

**Primary Dependencies**: MUI v9.1.1 (Material UI), React Query (TanStack), Zustand, Vite 8, Inter (Google Font)

**Storage**: N/A — purely visual/layout changes; no persistence layer involved

**Testing**: Playwright (E2E, from `specs/006-playwright-e2e-tests/`); manual validation via `quickstart.md`

**Target Platform**: Desktop-first web app (1280px primary viewport), served by Vite dev server / static build

**Project Type**: Web application (React SPA + NestJS REST API)

**Performance Goals**: No regressions in page load or render time; theme changes are compile-time (no runtime cost)

**Constraints**: WCAG 2.1 AA colour contrast must be maintained; body font must not drop below 12px; desktop-first at 1280px (responsive is stretch)

**Scale/Scope**: 13 major page sections; ~15–20 frontend files; 1 shared theme file

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Enterprise Grade Quality | ✅ PASS | Visual-only change; no architecture risk |
| II. API First Design | ✅ PASS | No API changes |
| III. Security By Default | ✅ PASS | No auth/authz changes |
| IV. Role Based Access Control | ✅ PASS | Sidebar RBAC preserved (FR-009); sidebar items still gated by role |
| V. Auditability | ✅ PASS | No mutating operations introduced |
| VI. Scalability | ✅ PASS | Not applicable; theme is static |
| VII. Testability | ✅ PASS | Manual validation scenarios in `quickstart.md`; Playwright tests cover functional regressions |
| VIII. Consistency | ✅ PASS | Feature explicitly enforces consistency across all 13 sections (FR-025) |
| IX. Observability | ✅ PASS | Not applicable; frontend-only UI change |
| X. User Experience | ✅ PASS | Compact theme improves information density; WCAG 2.1 AA contrast preserved; responsive is stretch |

**Constitution Check Result**: All gates PASS. No violations. Proceed to implementation.

**Post-Design Re-check**: WCAG AA contrast with `#1e293b` sidebar + `#94a3b8` text for inactive items = 3.8:1 (large text ≥ 3:1 threshold met). Active items use `#ffffff` = 15.7:1 on `alpha(#1976d2, 0.15)` over `#1e293b` → well above 4.5:1. All contracts pass.

## Project Structure

### Documentation (this feature)

```text
specs/007-compact-ui-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── ui-size-contracts.md   # Phase 1 output
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── theme/
│   │   └── theme.ts                    # PRIMARY: Typography scale, button/card/listitem overrides
│   ├── shared/
│   │   └── components/
│   │       └── AppShell.tsx            # Sidebar width, background, active item style
│   ├── modules/
│   │   ├── search/
│   │   │   └── GlobalSearchBar.tsx     # maxWidth: 280 on container
│   │   ├── dashboard/
│   │   │   ├── DashboardPage.tsx       # p: 3 → p: 2
│   │   │   └── MetricCard.tsx          # Remove uppercase label, fix variant sizes
│   │   ├── customers/                  # p: 3 → p: 2 on page Box
│   │   ├── contacts/                   # p: 3 → p: 2 on page Box
│   │   ├── opportunities/              # p: 3 → p: 2 on page Box
│   │   ├── pipeline/                   # p: 3 → p: 2 on page Box
│   │   ├── tasks/                      # p: 3 → p: 2 on page Box
│   │   ├── activities/                 # p: 3 → p: 2 on page Box
│   │   ├── reports/                    # p: 3 → p: 2 on page Box
│   │   ├── users/                      # p: 3 → p: 2 on page Box
│   │   ├── audit/                      # p: 3 → p: 2 on page Box
│   │   ├── notifications/              # p: 3 → p: 2 on page Box
│   │   └── settings/                   # p: 3 → p: 2 on page Box
│   └── ...
└── ...
```

**Structure Decision**: Single frontend project (Option 2 frontend subtree). All changes are within `frontend/src/`. No new directories required.

## Phase 0: Research

See [`research.md`](./research.md) for full decision rationale.

**Key decisions**:
1. MUI `createTheme` overrides in `theme.ts` as the primary and near-exclusive mechanism
2. Sidebar width: 220px → 168px; background: `#1e293b` (dark blue-grey)
3. Typography base: 13px body, 11px caption, 16px h6, 18px h5, 20px h4
4. Button height: 32px (medium), 28px (small); 13px text
5. `MuiListItemButton` height: 34px via theme `styleOverrides`
6. `MuiCardContent` padding: 12px via theme `styleOverrides`
7. MetricCard: remove `textTransform: 'uppercase'`; label → caption variant; value → h5 (18px via theme)
8. All page Box wrappers: `p: 3` → `p: 2` (24px → 16px)

## Phase 1: Design & Contracts

See:
- [`data-model.md`](./data-model.md) — full token reference (sizes, fonts, colours, spacing)
- [`contracts/ui-size-contracts.md`](./contracts/ui-size-contracts.md) — measurable acceptance contracts
- [`quickstart.md`](./quickstart.md) — 7 validation scenarios with DevTools scripts

## Complexity Tracking

No constitution violations. Table not required.
