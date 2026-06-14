# Route Audit Contracts

**Feature**: `004-frontend-e2e-audit`
**Purpose**: Define the pass/fail criteria for each route during Playwright audit

All tests run with Chromium at 1440×900 (desktop viewport).
Backend: `http://localhost:3000` | Frontend: `http://localhost:5173`

---

## Auth Routes (unauthenticated)

| Route | Expected Element | Pass Criteria |
|-------|-----------------|---------------|
| `/login` | Login form | Form renders, zero console errors |
| `/password-reset` | Email input | Page renders, zero console errors |
| `/403` | Forbidden message | Page renders, zero console errors |

---

## Protected Routes (as `admin@crm.local`)

All protected routes must:
1. Render without triggering the error boundary
2. Show at least one visible heading or primary content container
3. Produce zero `console.error` or uncaught exception events

| Route | Expected Heading / Content | Additional Checks |
|-------|---------------------------|-------------------|
| `/dashboard` | "Dashboard" heading | Metric cards visible; no MUI Grid prop warnings |
| `/customers` | "Customers" heading | Table or list renders |
| `/customers/new` | "New Customer" or form heading | Form fields render |
| `/contacts` | "Contacts" heading | Table or list renders |
| `/contacts/new` | Form heading | Form fields render |
| `/opportunities` | "Opportunities" heading | Table or list renders |
| `/opportunities/new` | Form heading | Form fields render |
| `/pipeline` | "Pipeline" heading | Board renders |
| `/tasks` | "Tasks" heading | Table or list renders |
| `/notifications` | "Notifications" heading | Page renders (may be empty list) |
| `/reports` | "Reports" heading | Page renders |
| `/search` | "Search" or search input | Page renders, no ListItem button warnings |
| `/audit` | "Audit" heading | Admin-only; renders for admin role |
| `/users` | "Users" heading | Renders for admin/manager role |
| `/users/new` | Form heading | Renders for admin role |
| `/import-export` | "Import" or "Export" heading | Page renders |
| `/settings` | "Settings" heading | Admin-only; renders for admin role |
| `*` (404) | Not-found message | NotFoundPage renders |

---

## Role-Guard Contracts

| Route | Role | Expected Outcome |
|-------|------|-----------------|
| `/audit` | `salesrep@crm.local` | Redirect to `/403` or `/dashboard`; no crash |
| `/settings` | `salesrep@crm.local` | Redirect to `/403` or `/dashboard`; no crash |
| `/users` | `salesrep@crm.local` | Redirect to `/403` or `/dashboard`; no crash |

---

## Modal Dialog Contracts

| Page | Trigger | Expected |
|------|---------|----------|
| `/customers` | "Add Customer" / "New" button | Modal/form opens, zero console errors on open |
| `/contacts` | "Add Contact" / "New" button | Modal/form opens, zero console errors on open |
| `/opportunities` | "Add Opportunity" / "New" button | Modal/form opens, zero console errors on open |
| Any modal | Cancel or X button | Modal closes, page returns to list, zero console errors |
| Notification bell in AppShell | Click bell icon | Notification popover opens, no `ListItem button` warning |
| `/search` | Type 3+ characters | Results appear with `ListItemButton` (no `button` prop warning) |

---

## Session Restoration Contract

| Scenario | Steps | Expected |
|----------|-------|----------|
| Page refresh while authenticated | Login → navigate to `/customers` → hard refresh | `/customers` reloads as authenticated; no redirect to `/login` |
| Direct URL access while authenticated | Login → navigate to `/dashboard` → type `/contacts` in URL bar | `/contacts` loads without redirect |
