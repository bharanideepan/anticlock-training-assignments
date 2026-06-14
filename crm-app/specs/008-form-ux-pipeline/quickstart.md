# Quickstart Validation Guide: Form UX & Pipeline Improvements

## Purpose

This guide validates that the four improvements in feature 008 are working correctly.
Run these after completing all tasks in `tasks.md`.

## Prerequisites

- Frontend dev server running: `cd frontend && pnpm dev`
- Backend running: `cd backend && pnpm start:dev`
- Database seeded with sample data (customers, contacts, users, opportunities)
- Logged in as an admin user

---

## Scenario 1: Searchable Dropdown — Opportunity Form (C-001, C-002)

1. Navigate to **Opportunities → Add Opportunity**.
2. Click the **Customer** field.
   - **Expected**: A dropdown opens with placeholder "Search customers…"
3. Type 2 characters (e.g., "Te").
   - **Expected**: Dropdown shows matching customers with name and status subtitle. A spinner appears briefly.
4. Scroll to the bottom of the dropdown list (if more than 10 results).
   - **Expected**: More customers load and append to the list (infinite scroll).
5. Select a customer from the list.
   - **Expected**: The customer name appears in the field; UUID is stored internally.
6. Click the **Contact** field and search for a contact. Select one.
7. Click the **Owner** field and search for a user. Select one.
8. Fill remaining required fields and submit.
   - **Expected**: Opportunity is created and you are navigated to the detail page. The Customer, Contact, and Owner show names (not UUIDs).

**Pass criteria**: All three dropdown fields work with search, pagination, and selection.

---

## Scenario 2: Searchable Dropdown — Edit Mode Pre-population (C-001-H)

1. Navigate to an existing **Opportunity** and click **Edit**.
2. Observe the Customer, Contact, and Owner fields on load.
   - **Expected**: All three fields show the current record's **name** (not UUID).
3. Clear the Owner field and search for a different user. Select one.
4. Save.
   - **Expected**: Opportunity updated; Owner now shows the new user's name.

**Pass criteria**: Edit mode pre-populates labels correctly.

---

## Scenario 3: Searchable Dropdown — Contact and Task Forms (C-002)

**Contact form**:
1. Navigate to **Contacts → Add Contact**.
2. Click the **Customer** field, search, and select a customer.
   - **Expected**: Autocomplete works the same as in Scenario 1.

**Task form**:
1. Navigate to **Tasks** and click **Add Task**.
2. Click the **Assignee** dropdown — type a name.
   - **Expected**: Users appear as search results (no longer a plain Select).
3. Click the **Customer** dropdown — type a company name.
   - **Expected**: Customers appear as search results.
4. Create the task.

**Pass criteria**: Both forms use the new searchable dropdowns.

---

## Scenario 4: Global Search — No Crash (C-003)

1. Click the global search bar in the header (or press Ctrl+K).
2. Type 2 characters (e.g., "ac").
   - **Expected**: Dropdown opens with results. **No app crash. No React error in console.**
3. Open DevTools Console. Verify no errors logged.
4. Click a search result.
   - **Expected**: Navigates to the correct record detail page.
5. Search for something with no results (e.g., "zzzzzz").
   - **Expected**: Dropdown shows "No options" or similar empty state — no crash.
6. Click "View all results for '…'" in the dropdown footer.
   - **Expected**: Navigates to `/search?q=...`.

**Pass criteria**: Search works without crashing; navigation works; footer action works.

---

## Scenario 5: Pipeline Drag Overlay (C-004)

1. Navigate to **Pipeline**.
2. Ensure there are multiple stages with opportunities.
3. Click and hold an opportunity card and begin dragging.
   - **Expected**: A floating clone of the card appears **above** all other elements (header, other cards, column headers). The original card position shows an empty ghost (space preserved but invisible).
4. While still dragging, hover over a different stage column.
   - **Expected**: The target column shows a highlighted background.
5. Drop the card on the new stage.
   - **Expected**: The card moves to the new stage. The overlay disappears. The board updates.
6. Drag a card and drop it outside any column (e.g., on blank space).
   - **Expected**: Card returns to its original stage. No error.

**Pass criteria**: Dragged card floats above all elements; ghost preserves space; drop works correctly.

---

## Scenario 6: Pipeline Stage Color Coding (C-005)

1. Navigate to **Pipeline**.
2. Observe the stage column headers.
   - **Expected**: Each column has a distinct color indicator (left border or top stripe).
3. Count the number of stages. Verify each has a different color.
4. If there are more than 10 stages, verify colors start cycling but adjacent stages still have different colors.

**Pass criteria**: Each stage column is visually distinguished by color.

---

## Scenario 7: Functional Regression (all features still work)

- [ ] Create a Customer (no UUID fields affected — form should still work as before)
- [ ] Create a Contact with the new Customer dropdown
- [ ] Create an Opportunity with the new Customer, Contact, Owner dropdowns
- [ ] Create a Task with the new Assignee dropdown
- [ ] Use global search to find a customer — navigate to detail
- [ ] Drag two opportunities to different stages on Pipeline board
- [ ] Verify RBAC: non-admin cannot access Users list or Audit Log

**Pass criteria**: All CRUD operations work; no regressions from previous features.
