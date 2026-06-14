# UI Interaction Contracts: Form UX & Pipeline Improvements

## Contract C-001: AsyncAutocomplete Dropdown Behavior

**Component**: `AsyncAutocomplete` (shared)

| Contract | Expected Behavior |
|----------|------------------|
| C-001-A | Typing ≥ 1 character triggers a debounced (300ms) API search |
| C-001-B | While loading, a spinner appears inside the dropdown |
| C-001-C | Results render as `{label} / {subtitle}` in the dropdown list |
| C-001-D | Scrolling to within 80px of the bottom of the list triggers page+1 load |
| C-001-E | New page results append below existing results (no reset) |
| C-001-F | When no results found, "No options" text appears |
| C-001-G | On selection, the label is displayed in the field; the UUID is the form value |
| C-001-H | On edit form load, the existing record's name is shown (not UUID) |
| C-001-I | Clearing the field sets the form value to `undefined` / `null` |
| C-001-J | The component is keyboard navigable (arrow keys, Enter, Escape) |

---

## Contract C-002: Reference Field Replacement

**Forms affected**: OpportunityFormPage, ContactFormPage, TaskFormDialog, PipelineBoardPage (owner filter)

| Field | Previous UX | New UX |
|-------|------------|--------|
| Opportunity → Customer | Raw UUID TextField | AsyncAutocomplete (search customers) |
| Opportunity → Contact | Raw UUID TextField | AsyncAutocomplete (search contacts) |
| Opportunity → Owner | Raw UUID TextField | AsyncAutocomplete (search users) |
| Contact → Customer | Raw UUID TextField | AsyncAutocomplete (search customers) |
| Task → Assignee | Select (loads 100 users) | AsyncAutocomplete (search users) |
| Task → Customer | Select (loads 100 customers) | AsyncAutocomplete (search customers) |
| Pipeline → Owner filter | Select (loads 100 users) | AsyncAutocomplete (search users) |

**Value contract**: The `id` (UUID) is always what is stored and submitted to the API. The `label` is display-only.

---

## Contract C-003: Global Search Correctness

| Contract | Expected Behavior |
|----------|------------------|
| C-003-A | Typing 2+ characters triggers search; spinner shown during fetch |
| C-003-B | Results render in dropdown without React error or crash |
| C-003-C | Each result shows type chip + label + subtitle |
| C-003-D | Clicking a result navigates to the record's detail page |
| C-003-E | A "View all results for '…'" footer item navigates to `/search?q=...` |
| C-003-F | Clearing input closes the dropdown |
| C-003-G | Ctrl+K focuses the search input |

---

## Contract C-004: Pipeline Drag Overlay

| Contract | Expected Behavior |
|----------|------------------|
| C-004-A | Drag begins: original card becomes invisible (ghost placeholder remains in DOM to hold column space) |
| C-004-B | A floating clone of the card appears under the cursor, above all other UI elements |
| C-004-C | The overlay clone is visually identical to the original card (same content, same styling) |
| C-004-D | Hovering over a stage column during drag shows a highlighted background on that column |
| C-004-E | Dropping on a different stage moves the card and triggers API update |
| C-004-F | Dropping outside any valid column cancels the drag; card returns to original position |
| C-004-G | After drop (success or cancel), the overlay disappears and the card is fully visible again |

---

## Contract C-005: Pipeline Stage Color Coding

| Contract | Expected Behavior |
|----------|------------------|
| C-005-A | Each stage column displays a unique color indicator in its header |
| C-005-B | Color is assigned by column index (0-based) from a fixed palette |
| C-005-C | If there are more stages than palette colors, colors cycle |
| C-005-D | The color indicator is a left border or top stripe (not full background fill) |
| C-005-E | Stage color does not interfere with the `isOver` drop-target highlight |
| C-005-F | The colored indicator is visible in both light and dark environments |
