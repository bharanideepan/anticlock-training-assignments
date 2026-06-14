# Quickstart: Detail Page Enrichment Validation

## Prerequisites

- CRM app running (`pnpm dev` in `frontend/`, backend running)
- At least one customer with: 1 contact, 1 activity, 1 opportunity, 1 task, 1 file
- At least one contact linked to an opportunity

---

## Scenario 1: Customer Detail — Rich Tab Content (US1)

1. Navigate to any customer detail page (`/customers/:id`)
2. Click the **Contacts** tab
   - **Expect**: Each row shows full name (bold), designation/department subtitle, email as a mailto link, phone as tel link
   - **Expect**: "Add Contact" button visible at top of tab (for authorized users)
3. Click the **Activities** tab
   - **Expect**: Each row shows: type chip, subject, date, notes preview
4. Click the **Opportunities** tab
   - **Expect**: Each row shows: name, stage chip (colored), expected revenue, close date, owner
5. Click the **Tasks** tab
   - **Expect**: Each row shows: title, status chip, due date (red if overdue), assignee
6. Click any contact row → **Expect**: navigates to `/contacts/:id`
7. For a customer with >10 contacts: **Expect** "View all →" link appears below the list
8. **Network tab check**: Open DevTools, switch to Activities tab → verify API call fires on first click, NOT on page load

---

## Scenario 2: Opportunity Detail — Working Tabs (US2)

1. Navigate to any opportunity detail page (`/opportunities/:id`)
2. Click the **Tasks** tab
   - **Expect**: Real task rows (or empty state with "Add Task" button) — NO "coming in Phase 10" text
3. Click **Add Task** → **Expect**: TaskFormDialog opens with opportunityId pre-filled
4. Click the **Files** tab
   - **Expect**: Real file rows (or empty state) — NO "coming in Phase 13" text
5. If files exist: **Expect** each row shows file name, size (formatted KB/MB), upload date, uploader name

---

## Scenario 3: Contact Detail — Enriched Info & Opportunities Tab (US3)

1. Navigate to any contact detail page (`/contacts/:id`)
2. **Summary panel**:
   - **Expect**: Email rendered as a clickable mailto link with a mail icon (not plain "Email: ...")
   - **Expect**: Phone rendered as a clickable tel link with a phone icon (not plain "Phone: ...")
3. Click the **Opportunities** tab
   - **Expect**: Linked opportunities displayed as rows — NOT "Opportunity association shown in Opportunities module"
   - **Expect**: Each row shows: opportunity name, stage chip, expected revenue, close date
4. Click the **Activities** tab
   - **Expect**: Each row shows: type chip, subject, date, notes preview (not just "type — subject")
5. Click **Log Activity** → **Expect**: ActivityFormDialog opens with contactId pre-filled

---

## Scenario 4: Empty States (US4)

1. Create a brand-new customer with no related records
2. Open its detail page
3. Click each tab in order
   - **Expect**: Each tab shows an icon + short message + CTA button (e.g. "No contacts yet. Add Contact")
   - **Expect**: NO blank space, no placeholder text referencing unreleased phases
4. Click the CTA in the Contacts tab → **Expect**: navigates to contact creation form with customer pre-filled
5. Click the CTA in the Activities tab → **Expect**: ActivityFormDialog opens

---

## Scenario 5: Permission Gating

1. Log in as a read-only user (VIEWER role or equivalent)
2. Open any customer detail page
   - **Expect**: "Add Contact", "Log Activity", "Add Opportunity", "Add Task" buttons are NOT visible
   - **Expect**: Rows are still visible and clickable for navigation

---

## Scenario 6: Lazy Loading Verification

1. Open DevTools → Network tab → filter by XHR/Fetch
2. Navigate to a customer detail page
   - **Expect**: Only the customer record request fires on load (not contacts/activities/etc.)
3. Click the Contacts tab
   - **Expect**: One request fires: `GET /customers/:id/contacts?pageSize=10`
4. Click Activities tab
   - **Expect**: One request fires: `GET /customers/:id/activities?pageSize=10`
5. Click Contacts tab again
   - **Expect**: No new request (cached)
