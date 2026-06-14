# Research: Form UX & Pipeline Improvements

## Decision 1: Reusable Searchable Dropdown Component

**Decision**: Build a single reusable `AsyncAutocomplete` component using MUI `Autocomplete` with `filterOptions={(x) => x}` (server-side filtering), `onInputChange` for debounced API calls, and `IntersectionObserver` on the last list item to trigger infinite scroll.

**Rationale**: MUI `Autocomplete` already handles accessibility, keyboard navigation, and option rendering. Wrapping it with async loading + infinite scroll is a well-established pattern in the codebase (the global search already uses Autocomplete). A single reusable component avoids duplicating scroll logic in every form.

**Alternatives considered**:
- `react-select` with `loadOptions`: Would introduce a new dependency and diverge from the existing MUI design system.
- `react-virtualized` or `react-window` in the listbox: Overkill for dropdown lists; infinite scroll via IntersectionObserver is simpler.
- Custom `TextField` + `Popper`: Too much work to replicate accessibility MUI provides.

---

## Decision 2: Infinite Scroll Trigger Mechanism

**Decision**: Use MUI `Autocomplete`'s `ListboxComponent` override or `ListboxProps.onScroll` to detect scroll-to-bottom, then increment page count and append results.

**Rationale**: `ListboxProps` (or `slotProps.listbox`) on MUI Autocomplete accepts `onScroll` which fires when the dropdown list scrolls. Comparing `scrollTop + clientHeight >= scrollHeight - threshold` detects the bottom. This is simpler than IntersectionObserver inside a Portal.

**Alternatives considered**:
- `IntersectionObserver` on last item: Works but requires ref passing through renderOption and a sentinel element — more complex.
- Paginated "Load more" button: Explicitly disallowed by the requirement ("paginate using scroll").
- `react-infinite-scroll-component`: Extra dependency; the scroll handler approach is self-contained.

---

## Decision 3: Global Search Crash Fix

**Decision**: The crash is caused by `slotProps.listbox.footer` which is a non-existent MUI Autocomplete slot. Fix by removing the `// @ts-expect-error footer slot` hack and instead appending a "View all" pseudo-option to the options array, styled distinctly via `renderOption`.

**Rationale**: MUI v9 Autocomplete's listbox slot does not accept a `footer` prop. The `@ts-expect-error` suppresses the type error but the prop may be passed as an HTML attribute to the `<ul>` element, which React either ignores or may throw for. The safest fix without introducing a custom PaperComponent is a sentinel footer option (e.g., `{ type: '__footer__', id: '__footer__', label: 'View all results' }`) that renders differently and is excluded from filtering.

**Alternatives considered**:
- Custom `PaperComponent`: Works and allows a real footer outside the scrollable list, but requires more boilerplate.
- `slotProps.paper`: Not specific enough; paper wraps the entire popup not just the list.
- Remove the footer entirely: Loses the "View all results" affordance.

---

## Decision 4: Pipeline DragOverlay

**Decision**: Add `DragOverlay` from `@dnd-kit/core` to `PipelineBoardPage.tsx`. Track `activeId` and `activeData` in local state via `onDragStart`/`onDragEnd` callbacks on `DndContext`. Render an `OpportunityCard`-like clone inside `DragOverlay`. Make the original card render with `visibility: hidden` (not `opacity: 0`) when dragging to preserve space.

**Rationale**: `DragOverlay` is the canonical dnd-kit pattern for above-the-fold dragging. It renders in a Portal above everything at z-index 9999. The existing `OpportunityCard` already has all the rendering logic — a lightweight clone works. Using `visibility: hidden` (not `opacity: 0`) preserves column layout so cards don't jump when the original becomes invisible.

**Alternatives considered**:
- `transform: translate3d` on the original card (current behavior): The original stays in DOM flow, no z-index escaping — confirmed to render under columns.
- CSS `z-index` override on the dragging card: Doesn't work with transform-based drag because transforms create a new stacking context that still respects the DOM hierarchy.

---

## Decision 5: Pipeline Stage Color Coding

**Decision**: Define a 10-color `STAGE_PALETTE` constant on the frontend (muted, accessible colors). Assign colors by `columnIndex % STAGE_PALETTE.length`. Pass `stageColor` as a prop to `StageColumn` and apply it as the left border or header background accent.

**Rationale**: Storing colors in the backend (on the Stage entity) would require a backend migration and CRUD for color management. For visual distinction in the pipeline, frontend-assigned colors by index are deterministic, require no API changes, and perfectly serve the goal. Left-border coloring is a common, accessible pattern for stage differentiation.

**Alternatives considered**:
- Backend-stored colors with color picker: Enables customization but is substantial extra work for a UX enhancement.
- Semantic colors by stage name (e.g., green = "Won"): Fragile — stage names are user-defined.
- Full colored header background: Reduces text contrast; left-border or top-border is safer for WCAG compliance.

---

## API Compatibility

Existing API hooks already support the needed parameters:
- `useCustomers({ search, page, pageSize })` ✅
- `useUsers({ search, page, pageSize })` — need to verify `search` param exists
- `useContacts({ search, page, pageSize })` — need to verify
- `useOpportunities({ search, page, pageSize })` — needed for opportunity reference fields

No backend changes are required for this feature. All changes are purely frontend.
