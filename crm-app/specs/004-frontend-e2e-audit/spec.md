# Feature Specification: Frontend End-to-End Audit & Error Remediation

**Feature Branch**: `004-frontend-e2e-audit`

**Created**: 2026-06-13

**Status**: Draft

**Input**: User description: "run the frontend application using playwright, run through all routes, pages, modal popups, functionalities to identify and fix the crashes and console errors."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Zero Console Errors on Page Load (Priority: P1)

A developer opens the CRM application in a browser and navigates to each page. No browser console errors appear during normal navigation or when interacting with core features (opening lists, viewing detail pages, clicking buttons).

**Why this priority**: Console errors are the earliest signal of broken UI components and are visible to end users in some environments. Eliminating them is the prerequisite for all other quality improvements.

**Independent Test**: Navigate to each page listed in the CRM router. Observe the browser console for errors. Pass when the console is free of errors on initial load and on standard interaction with each page.

**Acceptance Scenarios**:

1. **Given** the application is loaded in a browser and a user is logged in, **When** the user visits the Dashboard page, **Then** the console shows zero errors.
2. **Given** a user is on any listed route, **When** the page finishes rendering, **Then** no React prop warnings, uncaught exceptions, or network failures are present in the console.
3. **Given** a user navigates between pages using the sidebar, **When** each page mounts, **Then** no new console errors appear.

---

### User Story 2 — All Routes Render Without Crash (Priority: P1)

Every route defined in the application router renders a visible page without throwing an unhandled error or showing a blank/error boundary fallback.

**Why this priority**: A crashing page is completely unusable and blocks the user from any work on that module.

**Independent Test**: Programmatically visit every known route. Each route must produce a rendered page with at least one visible heading or content element. Pass when no route triggers an error boundary or blank screen.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** the user visits `/dashboard`, `/customers`, `/contacts`, `/opportunities`, `/activities`, `/tasks`, `/reports`, `/audit-logs`, `/search`, **Then** each page renders its primary content area without a crash.
2. **Given** a valid resource ID exists in the database, **When** the user visits a detail page (e.g., `/customers/:id`), **Then** the detail view renders without error.
3. **Given** a user visits a route requiring a role they do not have, **When** the route guard evaluates access, **Then** the user is redirected gracefully instead of seeing a crash.

---

### User Story 3 — Modal Dialogs Open and Close Without Error (Priority: P2)

All modal dialogs (create, edit, delete confirm, filters) open when triggered and close correctly without producing console errors or leaving the page in a broken state.

**Why this priority**: Modals are the primary path for data entry and editing in the CRM. A broken modal blocks all mutations.

**Independent Test**: On each page that has an "Add", "Edit", or "Delete" action, trigger the modal. Confirm it opens, renders its form/content, and closes on cancel or submit without console errors.

**Acceptance Scenarios**:

1. **Given** a user is on a list page with an "Add" button, **When** the user clicks "Add", **Then** a modal or dialog opens with a form and no console errors appear.
2. **Given** an open modal, **When** the user clicks "Cancel" or the close icon, **Then** the modal closes and the list page returns to its prior state without errors.
3. **Given** an open form modal with required fields, **When** the user submits a valid form, **Then** the record is saved (or an API error is shown gracefully) and the modal closes without crashing.

---

### User Story 4 — Navigation Does Not Redirect to Login for Authenticated Users (Priority: P1)

An authenticated user who navigates between pages or refreshes the browser remains logged in and is not unexpectedly redirected to the login page.

**Why this priority**: Unexpected logout on navigation is a critical UX regression that makes the app unusable for multi-page workflows.

**Independent Test**: Log in, then navigate to several pages and refresh each one. Pass when each page loads correctly and the user remains authenticated throughout.

**Acceptance Scenarios**:

1. **Given** a user has successfully logged in, **When** the user navigates to `/dashboard` and then `/customers`, **Then** both pages load and no redirect to `/login` occurs.
2. **Given** a logged-in user who refreshes the browser, **When** the page reloads, **Then** the session is restored and the user sees the expected page rather than the login screen.

---

### Edge Cases

- What happens when a list API returns an empty array? The page must not crash; it should show an empty state.
- What happens when an API call fails due to a network error? The page must display a user-friendly error message rather than crashing.
- What happens when a detail page is loaded for a resource ID that does not exist? The page must show a 404/not-found message, not a blank page.
- What happens when a user with a restricted role accesses an admin-only page URL directly? The page must redirect or show an access-denied message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All application routes MUST render a visible page without triggering an unhandled exception or error boundary.
- **FR-002**: The browser console MUST be free of errors (not warnings) after navigating to any application route while logged in.
- **FR-003**: All modal dialogs MUST open, render their content, and close without producing console errors.
- **FR-004**: An authenticated user who refreshes the browser MUST have their session restored automatically without being redirected to the login page.
- **FR-005**: List pages MUST render gracefully when the API returns an empty result set, displaying an appropriate empty-state message.
- **FR-006**: Detail pages MUST render gracefully when the API returns a 404 for a resource ID, displaying a not-found message.
- **FR-007**: All deprecated component API usages (e.g., obsolete prop patterns) MUST be replaced with current supported equivalents so that no related warnings appear in the console.
- **FR-008**: Interactive elements (buttons, form fields, dropdowns, date pickers) MUST respond to user interaction without crashing or producing console errors.
- **FR-009**: Role-based access control MUST silently redirect unauthorized users to an appropriate page rather than crashing.
- **FR-010**: All pages MUST render correctly for each defined user role (SYSTEM_ADMINISTRATOR, SALES_MANAGER, SALES_REPRESENTATIVE).

### Key Entities

- **Route**: A URL path defined in the application router, mapped to a specific page component.
- **Console Error**: A browser console message with level `error`, indicating a runtime exception, a failed network request, or a React/component library violation.
- **Console Warning**: A browser console message with level `warn`; specifically, deprecation warnings from component libraries that indicate future breakage risk.
- **Modal Dialog**: An overlay UI element triggered by user action, used for create, edit, delete, or filter operations.
- **Session**: The authenticated state stored by the application, derived from the access token and the user profile, persisting across page navigations and browser refreshes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero console errors appear when visiting any of the application's defined routes while logged in as any seeded user role.
- **SC-002**: 100% of defined routes render a non-empty page content area without triggering an error boundary.
- **SC-003**: 100% of modal dialogs that can be opened via UI interaction open and close without a console error.
- **SC-004**: A logged-in user who refreshes any page remains authenticated in 100% of cases when a valid session exists.
- **SC-005**: Empty-state and error-state scenarios produce a user-visible message on 100% of list and detail pages.
- **SC-006**: All console warnings related to deprecated component library prop usage are eliminated.

## Assumptions

- The application is running in development mode on `localhost:5173` (frontend) with the backend on `localhost:3000`.
- A seeded database is available with at least one user of each role (SYSTEM_ADMINISTRATOR, SALES_MANAGER, SALES_REPRESENTATIVE).
- Playwright (or equivalent headless browser automation) is available in the development environment for automated route traversal.
- The audit covers the current MUI v9 component library; warnings about future deprecations beyond v9 are out of scope.
- API-level bugs (incorrect business logic, wrong data returned) are out of scope; only frontend crashes and console errors caused by the frontend code are in scope.
- Mobile/tablet responsive rendering issues are out of scope; this audit targets desktop viewport (≥1024px).
