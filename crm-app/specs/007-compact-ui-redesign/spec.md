# Feature Specification: Compact Professional UI Redesign

**Feature Branch**: `007-compact-ui-redesign`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User description: "I need this kind of UI - more professional - check the placement of elements - header - searchbar - avatar - sidebar - main layout - fonts - sizes - compact design. But current UI looks like this - too much spacing, large fonts, large searchbar, large buttons - please refer the 1st attached image for reference - use that kind of theme across the project."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Experience a Compact, Glanceable Interface (Priority: P1)

A sales rep opens the CRM on their laptop. Instead of the current layout where large stat cards, oversized text, and excessive padding push content far below the fold, they see a dense, information-rich screen — KPI widgets, recent activities, and navigation all visible simultaneously without scrolling.

**Why this priority**: The most immediate pain point. Users spend most time on list/dashboard pages; wasted vertical space directly reduces productivity and professional feel.

**Independent Test**: Open the Dashboard page on a 1280×768 viewport. Verify that at least 4 KPI widgets, the sidebar navigation, and the header are all visible simultaneously without any scrolling.

**Acceptance Scenarios**:

1. **Given** a logged-in user on the Dashboard, **When** the page loads at 1280×768 resolution, **Then** the full sidebar, header, and at least 4 stat widgets are visible without scrolling.
2. **Given** any list page (Customers, Contacts, Opportunities), **When** the page loads, **Then** at least 8 table rows are visible without scrolling on a 1280×768 viewport.
3. **Given** a user navigating between pages, **When** they arrive at any page, **Then** primary actions (Add button, search field) and at least the first 6 nav items are visible in a single glance.

---

### User Story 2 - Navigate via a Slim, Icon-Label Sidebar (Priority: P1)

A user navigates the application using the left sidebar. Instead of the current wide sidebar with large text and generous padding, they see a narrow, compact sidebar with small icons alongside short labels — similar to the reference design — that takes minimal horizontal space and keeps focus on the main content area.

**Why this priority**: The sidebar is always visible and defines the overall spatial hierarchy of the application. Fixing it unlocks room for the main content area on every single page.

**Independent Test**: Measure sidebar width. Verify it is 180px or narrower. Verify all primary nav labels and icons are visible and clickable.

**Acceptance Scenarios**:

1. **Given** the sidebar is open, **When** rendered at any screen size ≥ 1280px, **Then** the sidebar is no wider than 180px and shows icons + labels.
2. **Given** the sidebar, **When** a nav item is active, **Then** it is highlighted with a distinct background color and the text remains legible.
3. **Given** the sidebar, **When** a user clicks any nav item, **Then** they navigate to the correct page without layout shift.
4. **Given** admin-only items (Users, Audit Log, Settings), **When** viewed by a non-admin user, **Then** those items are hidden from the sidebar.

---

### User Story 3 - Use a Compact, Centred Header Bar (Priority: P2)

A user looks at the top of the screen. Instead of a tall app bar with an oversized search field stretching across most of the header width, they see a slim header (≤ 48px tall) with a proportionally-sized search input centred or right-aligned, a notification bell, and a small avatar menu — all visually balanced as in the reference image.

**Why this priority**: The header is rendered on every page. Reducing its height and visual weight immediately increases vertical space for content across the entire application.

**Independent Test**: Measure the rendered header height. Confirm it is ≤ 48px. Confirm search input width is no wider than 280px. Confirm avatar and notification bell are right-aligned.

**Acceptance Scenarios**:

1. **Given** any page in the application, **When** rendered, **Then** the header height is ≤ 48px.
2. **Given** the header, **When** a user types in the search field, **Then** the autocomplete dropdown appears without layout shift.
3. **Given** the header, **When** a user clicks the avatar, **Then** the profile/logout menu appears.
4. **Given** the header, **When** the page title is displayed (if applicable), **Then** it fits within the available space without truncation at 1280px.

---

### User Story 4 - Read Content with Compact, Legible Typography (Priority: P2)

A user reads table rows, form labels, and card data. Instead of the current large uppercase labels, oversized metric numbers, and generous line heights that waste space, they see a consistent type scale using small, crisp fonts that maintain legibility while showing more data per screen.

**Why this priority**: Typography drives perceived compactness more than any other single change. Fixing the type scale affects every page uniformly.

**Independent Test**: Open any list page. Verify table row height is ≤ 40px. Verify body text is rendered at 13–14px. Verify metric labels are not all-caps uppercase.

**Acceptance Scenarios**:

1. **Given** any data table, **When** rendered, **Then** table rows are ≤ 40px tall and body text is 13–14px.
2. **Given** KPI/stat widgets on the Dashboard, **When** rendered, **Then** the metric value is displayed prominently (18–22px) but labels are in 11–12px regular-weight text, not all-caps.
3. **Given** form pages, **When** rendered, **Then** input fields and labels use the compact type scale consistent with the rest of the application.
4. **Given** button elements, **When** rendered, **Then** primary buttons are ≤ 32px tall and use 13px text.

---

### User Story 5 - Experience a Cohesive Visual Theme Across All Pages (Priority: P3)

A user visits every major section of the application (Dashboard, Customers, Contacts, Opportunities, Pipeline, Tasks, Activities, Reports). They experience a visually consistent theme — consistent sidebar, consistent header, consistent card/table styles, consistent colour usage — without any page looking visually disconnected from the others.

**Why this priority**: Consistency is a quality-of-polish concern. The core compactness changes (P1/P2) deliver immediate value; this story validates that no pages were missed.

**Independent Test**: Open each major page in sequence and verify the header, sidebar, and content area maintain consistent visual style (font sizes, padding, colours, button sizes).

**Acceptance Scenarios**:

1. **Given** a user visiting Dashboard, Customers, Contacts, Opportunities, Pipeline, Tasks, Activities, and Reports, **When** on each page, **Then** the header and sidebar appear identically styled.
2. **Given** any page with a "list + action button" layout, **When** rendered, **Then** the top action button size, font, and padding are consistent.
3. **Given** the application colour palette, **When** any page is rendered, **Then** accent colours, background tones, and text colours are consistent with the defined design theme.

---

### Edge Cases

- **Sidebar at < 1280px**: The persistent expanded sidebar switches to a temporary overlay drawer opened by a hamburger menu icon in the header. The main content area expands to full width when the drawer is closed.
- **Long text in table cells**: Text that overflows a cell (e.g., long company names or email addresses) MUST be truncated with an ellipsis and the full value MUST be revealed on hover via a tooltip. Row height MUST remain ≤ 40px regardless of content length.
- How does the notification bell behave when there are 99+ unread notifications (badge overflow)?
- How does the search autocomplete dropdown position itself near the edges of the header on narrow viewports?
- What happens to form pages with many fields — does the compact padding remain legible?

## Requirements *(mandatory)*

### Functional Requirements

**Header**

- **FR-001**: The application header MUST be no taller than 48px in rendered height.
- **FR-002**: The CRM application logo/name MUST appear at the left of the header at 14–15px font size.
- **FR-003**: The global search input MUST be centred or right-of-centre in the header and MUST NOT exceed 280px in width.
- **FR-004**: The notification bell icon and user avatar MUST be right-aligned in the header.
- **FR-005**: The user avatar MUST display as a small circular element (28–32px diameter) with the user's initials or profile image.

**Sidebar**

- **FR-006**: The sidebar MUST be no wider than 180px when expanded.
- **FR-007**: Each sidebar navigation item MUST display an icon alongside a short text label.
- **FR-008**: The active navigation item MUST be visually distinguished with a highlighted background.
- **FR-009**: The sidebar MUST preserve role-based visibility (admin-only items hidden from non-admin users).
- **FR-010**: The sidebar item height MUST be ≤ 36px per item, with ≤ 4px vertical padding between items.
- **FR-011**: The sidebar MUST include a section divider between primary navigation items and admin items.

**Typography & Spacing**

- **FR-012**: Body text across all pages MUST use a font size of 13–14px.
- **FR-013**: Table row height MUST be ≤ 40px on all list pages.
- **FR-014**: Section headings (page titles) MUST use ≤ 18px font size.
- **FR-015**: KPI metric values on the Dashboard MUST use 18–24px font size; their labels MUST use 11–12px.
- **FR-016**: KPI metric labels MUST NOT use all-caps styling.
- **FR-017**: Content area padding MUST be 16–20px (reduced from current 24px+).
- **FR-018**: Primary action buttons MUST be ≤ 32px tall with 13px text.

**Main Content Area**

- **FR-019**: The main content area MUST expand to fill the remaining width after the sidebar.
- **FR-020**: Card and widget components MUST use reduced internal padding (≤ 12px) compared to the current design.
- **FR-021**: Dashboard KPI widgets MUST display in a grid of at least 4 columns on a 1280px viewport.

**Colour & Visual Theme**

- **FR-022**: The sidebar MUST use `#1e293b` (dark blue-grey) as its background colour, contrasting clearly with the main content area's `#f5f5f5` background.
- **FR-023**: The application MUST use a consistent accent colour for active states, primary buttons, and links throughout all pages.
- **FR-024**: Table rows MUST use alternating or hover-state highlighting for scannability.

**Scope**

- **FR-025**: The compact theme MUST be applied consistently across all pages: Dashboard, Customers, Contacts, Opportunities, Pipeline, Tasks, Activities, Reports, Users, Audit Log, Import/Export, Settings, and all form/detail pages.
- **FR-026**: At viewport widths < 1280px, the sidebar MUST switch to a temporary overlay drawer triggered by a hamburger menu icon in the header. The main content area MUST expand to full width when the overlay drawer is closed.
- **FR-027**: Text content in table cells that overflows the available width MUST be truncated with a trailing ellipsis. The full value MUST be revealed via a tooltip on hover. Row height MUST NOT exceed 40px regardless of text length.

### Key Entities

- **Theme Configuration**: Defines global typography scale, spacing values, colour palette, and component size overrides applied application-wide.
- **Header Component**: The top navigation bar containing branding, search, notifications, and user menu.
- **Sidebar Component**: The persistent left navigation containing route links organised by role and section.
- **Page Layout Wrapper**: The shell that positions header, sidebar, and main content area relative to each other.
- **KPI Widget**: A compact card displaying a single metric value with label and optional trend indicator.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At 1280×768 resolution, the Dashboard page shows at least 4 KPI widgets, the full sidebar, and the header without any scrolling required.
- **SC-002**: The sidebar width is ≤ 180px when expanded, freeing at least 40px of additional horizontal space compared to the current design.
- **SC-003**: The header height is ≤ 48px, reducing vertical chrome by at least 30% compared to the current 64px+ header.
- **SC-004**: Table rows on all list pages are ≤ 40px tall, enabling at least 8 rows to be visible on a 768px-tall viewport without scrolling.
- **SC-005**: The type scale is consistent across all pages — no page uses font sizes outside the defined compact scale (11–24px range based on element role).
- **SC-006**: All 13 major page sections (Dashboard, Customers, Contacts, Opportunities, Pipeline, Tasks, Activities, Reports, Users, Audit Log, Import/Export, Settings, and form/detail pages) reflect the compact theme with no visual inconsistencies.
- **SC-007**: A first-time user comparing the before/after identifies the redesigned UI as "more professional" and "easier to scan" (qualitative acceptance).
- **SC-008**: No existing functionality is broken or hidden as a result of the visual redesign — all CRUD operations, navigation, and role-based access controls continue to work correctly.

## Assumptions

- The redesign is a visual/layout change only — no new backend APIs, data models, or business logic are introduced.
- The reference image (Velo CRM) is used as a directional guide for compactness and layout hierarchy, not as a pixel-perfect copy. The application's own colour scheme and branding may differ.
- The sidebar background colour is `#1e293b` (dark blue-grey slate), chosen to match the Velo CRM reference image tone while complementing the existing `#1976d2` primary accent.
- The application uses MUI (Material UI v9) as the component library — the compact theme will be achieved through MUI theme overrides (typography scale, component size defaults, spacing) rather than replacing the component library.
- Desktop-first design at 1280px is the primary target viewport; at < 1280px the sidebar switches to a temporary overlay drawer (see FR-026).
- The redesign applies to all authenticated pages; the login, password reset, and SSO pages are out of scope as they are standalone flows with different layout needs.
- Accessibility (WCAG 2.1 AA) MUST be preserved — reducing font sizes MUST NOT drop below 12px for body content, and colour contrast ratios MUST remain compliant.
- The `autocomplete` attribute warning on the password field (a browser DOM issue) is a separate pre-existing concern and is out of scope for this feature.

## Clarifications

### Session 2026-06-14

- Q: What should the sidebar do at viewport widths < 1280px? → A: Switch to a temporary overlay drawer opened by a hamburger menu icon in the header; main content expands to full width when closed.
- Q: How should long text (company names, emails) be handled in table cells to preserve row height ≤ 40px? → A: Truncate with ellipsis; reveal full value in a hover tooltip.
- Q: What background colour should the sidebar use? → A: `#1e293b` (dark blue-grey slate).
