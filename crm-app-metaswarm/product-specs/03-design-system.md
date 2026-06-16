# Design System

The application uses **Material UI v6 (MUI)** as its component library. All visual customization is achieved through MUI theme overrides — no component library replacements. The design targets a compact, professional, information-dense enterprise aesthetic.

---

## Layout Shell

### Overall Structure
```
┌────────────────────────────────────────────────────────────┐
│  HEADER (≤ 48px tall)                                       │
├──────────┬─────────────────────────────────────────────────┤
│ SIDEBAR  │  MAIN CONTENT AREA                              │
│ (≤180px) │  (padding: 16–20px)                             │
│          │                                                  │
│          │                                                  │
└──────────┴─────────────────────────────────────────────────┘
```

### Breakpoints
- **Desktop primary**: ≥ 1280px — sidebar persistent, full layout
- **Tablet**: 768–1279px — sidebar collapses to temporary overlay drawer, triggered by hamburger menu in header
- **Mobile**: < 768px — out of scope for v1

---

## Header

**Height**: ≤ 48px

| Element | Spec |
|---------|------|
| Logo / App name | Left-aligned, 14–15px font, bold |
| Global search input | Centred or right-of-centre, max 280px wide |
| Notification bell | Right-aligned, shows unread count badge |
| User avatar | Right-aligned, 28–32px circular, displays initials or profile image |

On click of avatar: profile/logout dropdown appears.

---

## Sidebar

**Width**: ≤ 180px (expanded)

| Element | Spec |
|---------|------|
| Background | `#1e293b` (dark blue-grey slate) |
| Nav item height | ≤ 36px |
| Vertical gap between items | ≤ 4px |
| Nav item content | Icon + short label, side by side |
| Active item | Highlighted background, text remains legible |
| Section divider | Visible separator between primary nav and admin-only items |
| Role visibility | Admin-only items (Users, Audit Log, Settings) hidden from non-admin users |

---

## Colour Palette

| Token | Value | Usage |
|-------|-------|-------|
| Sidebar background | `#1e293b` | Left navigation panel |
| Main content background | `#f5f5f5` | Page background |
| Primary accent | `#1976d2` (MUI default blue) | Active states, primary buttons, links |
| Text primary | `#212121` | Body text, headings |
| Text secondary | `#757575` | Labels, metadata |
| Divider | `#e0e0e0` | Section borders, table row lines |
| Success | `#2e7d32` | Won status, completed tasks |
| Warning | `#ed6c02` | Overdue tasks, warning states |
| Error | `#d32f2f` | Lost status, error messages |

---

## Typography Scale

All font sizes must stay within 11–24px. No all-caps labels.

| Element | Size | Weight | Notes |
|---------|------|--------|-------|
| Page title / section heading | ≤ 18px | 600 | `h5` or `h6` equivalent |
| KPI metric value | 18–24px | 700 | Dashboard stat cards |
| KPI metric label | 11–12px | 400 | Below the metric value |
| Body text (table rows, paragraphs) | 13–14px | 400 | |
| Form labels | 13px | 500 | |
| Button text | 13px | 500 | |
| Caption / metadata | 11–12px | 400 | Dates, secondary info |

---

## Spacing Scale

| Usage | Value |
|-------|-------|
| Content area padding | 16–20px |
| Card / widget internal padding | ≤ 12px |
| Table cell padding (vertical) | 6–8px |
| Table cell padding (horizontal) | 12–16px |
| Form field gap | 12–16px between fields |
| Button height (primary) | ≤ 32px |

---

## Component Standards

### Data Tables

- Row height: ≤ 40px
- Alternating row colours or hover-state highlight for scannability
- Text overflow: truncate with ellipsis; reveal full value in tooltip on hover
- Column headers: 12px, uppercase or 500-weight, muted colour
- Pagination controls at bottom

### Form Pages

- Field sizing consistent across all forms
- Label alignment: left-aligned above each input
- Validation error displayed below the field in red, 12px
- Primary action button (Save / Submit) at bottom-right
- Secondary action (Cancel) adjacent to primary, left

### Modal Dialogs

- Structure: header with title → scrollable body → action footer
- Consistent padding: 16px top/sides, 16px between header/body/footer
- Action buttons right-aligned in footer
- Close icon in header top-right
- Max width varies by content; min 360px

### Status Chips

Compact, colour-coded chips for statuses:

| Status | Colour |
|--------|--------|
| PROSPECT | Blue grey |
| ACTIVE | Green |
| INACTIVE | Orange |
| ARCHIVED | Grey |
| OPEN | Blue |
| COMPLETED | Green |
| CANCELLED | Grey |
| OVERDUE | Red |
| Won | Green |
| Lost | Red |
| Lead | Blue grey |
| Qualified | Teal |
| Proposal | Blue |
| Negotiation | Purple |

### Empty States

Every list or tab with no records shows:
- An icon (relevant to the entity type)
- A short, friendly message (e.g., "No contacts yet.")
- A CTA button to create the first record (permission-gated — hidden if user cannot create)

### Loading States

- Loading feedback appears within 300ms of initiating any async operation
- Use skeleton loaders for list pages and detail sections
- Inline spinner for button actions

### Error States

- User-friendly message — no raw error codes or stack traces exposed
- Retry option where applicable
- Maintain current screen state (don't navigate away on error)

---

## Navigation Routes

| Route | Page | Roles |
|-------|------|-------|
| `/login` | Login page | Public |
| `/auth/sso/callback` | SSO callback | Public |
| `/auth/password-reset` | Password reset | Public |
| `/dashboard` | Dashboard | All authenticated |
| `/customers` | Customer list | All authenticated |
| `/customers/new` | Create customer | ADMIN, MANAGER, REP |
| `/customers/:id` | Customer detail | All authenticated |
| `/customers/:id/edit` | Edit customer | ADMIN, MANAGER, REP |
| `/contacts` | Contact list | All authenticated |
| `/contacts/new` | Create contact | ADMIN, MANAGER, REP, SUPPORT |
| `/contacts/:id` | Contact detail | All authenticated |
| `/contacts/:id/edit` | Edit contact | ADMIN, MANAGER, REP, SUPPORT |
| `/opportunities` | Opportunity list | All authenticated |
| `/opportunities/new` | Create opportunity | ADMIN, MANAGER, REP |
| `/opportunities/:id` | Opportunity detail | All authenticated |
| `/opportunities/:id/edit` | Edit opportunity | ADMIN, MANAGER, REP |
| `/pipeline` | Pipeline board | All authenticated |
| `/tasks` | Task list | All authenticated |
| `/activities` | Activity feed | All authenticated |
| `/reports` | Reports | All authenticated |
| `/notifications` | Notification center | All authenticated |
| `/search` | Search results | All authenticated |
| `/import-export` | Import / Export | ADMIN, MANAGER, REP |
| `/users` | User list | ADMIN, MANAGER (view) |
| `/users/new` | Create user | ADMIN |
| `/users/:id` | User detail | ADMIN, MANAGER (own team) |
| `/audit` | Audit log | ADMIN |
| `/settings` | Admin settings | ADMIN |

---

## Detail Page Layout Pattern

All detail pages (Customer, Contact, Opportunity) follow this structure:

```
┌─────────────────────────────────────────────────────────────┐
│ Breadcrumb: Home > Customers > Acme Corp                    │
│                                                             │
│ ┌─────────────────────┐  ┌──────────────────────────────┐   │
│ │ SUMMARY PANEL       │  │  TABS                        │   │
│ │ Key fields, owner,  │  │  [Contacts] [Activities]     │   │
│ │ status chip, dates  │  │  [Opportunities] [Tasks]     │   │
│ │                     │  │  [Files]                     │   │
│ │ Edit / Archive btn  │  │  ──────────────────────────  │   │
│ └─────────────────────┘  │  Tab content (lazy-loaded)   │   │
│                          │  Max 10 rows + "View all"    │   │
│                          └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Tab Content Requirements

- Tab data is **lazy-loaded** — API call triggered only when tab is first clicked
- Max **10 most recent records** per tab; "View all" link navigates to filtered list
- Each row shows **at least 3 data fields**

**Contact rows**: Full name (bold), designation + department, email as mailto link, phone as tel link

**Activity rows**: Type chip, subject, occurrence date, notes preview (max 80 chars, truncated)

**Opportunity rows**: Name (clickable), stage chip (coloured), expected revenue (currency formatted), close date, owner name

**Task rows**: Title, status chip, due date, assignee name

**File rows**: File name, formatted size, upload date, uploader name

---

## Dashboard Layout

At 1280px viewport, the following must be visible without scrolling:
- Full sidebar
- Header
- At least 4 KPI metric cards in a grid (min 4 columns)
- At least 1 chart below the KPI cards

### KPI Card Structure
```
┌──────────────────┐
│  icon            │
│  1,482           │  ← 18–24px, bold
│  Total Customers │  ← 11–12px, regular, not all-caps
│  ↑ 38 this month │  ← trend indicator
└──────────────────┘
```

### Required Charts
1. **Revenue Trend** — line chart, monthly, won vs. forecast revenue
2. **Pipeline Funnel** — funnel or bar chart showing stage counts and values
3. **Activity Trend** — bar chart, daily/weekly activity counts by type
4. **Team Performance** — table or bar (Manager / Admin only)
5. **Opportunity Distribution** — pie or bar by industry

---

## Accessibility

- WCAG 2.1 AA compliance maintained throughout
- Colour contrast ratios compliant (no font below 12px for body content)
- Drag-and-drop on pipeline board is keyboard-accessible (`@dnd-kit`)
- All interactive elements have visible focus states
- All form inputs have associated labels
- Screen reader-friendly ARIA attributes on custom components
