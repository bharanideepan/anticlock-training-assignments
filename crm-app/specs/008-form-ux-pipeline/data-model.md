# Data Model: Form UX & Pipeline Improvements

This feature introduces no new backend entities or schema changes. All changes are frontend-only.

---

## UI Component Model

### AsyncAutocomplete (new shared component)

Location: `frontend/src/shared/components/AsyncAutocomplete.tsx`

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | TextField label |
| `value` | `string \| null` | The selected record UUID |
| `onChange` | `(id: string \| null) => void` | Called with UUID on selection |
| `fetchOptions` | `(search: string, page: number) => Promise<{ items: OptionItem[], hasMore: boolean }>` | API loader |
| `getInitialLabel` | `() => Promise<string> \| string \| null` | Fetches display label for existing UUID (edit mode) |
| `placeholder` | `string?` | Input placeholder |
| `error` | `boolean?` | Error state |
| `helperText` | `string?` | Error or hint message |
| `required` | `boolean?` | Required field indicator |
| `disabled` | `boolean?` | Disabled state |
| `size` | `'small' \| 'medium'?` | MUI size (default: `'small'`) |

```typescript
interface OptionItem {
  id: string;      // The UUID stored in the form
  label: string;   // Human-readable display name
  subtitle?: string; // Secondary info (email, status, etc.)
}
```

**Behavior**:
- On mount (edit mode): calls `getInitialLabel()` to display current record name
- On input change with ≥1 char: debounces 300ms then calls `fetchOptions(search, 1)`
- On scroll to bottom of dropdown: calls `fetchOptions(currentSearch, currentPage + 1)`, appends results
- On selection: calls `onChange(selectedId)` and displays selected label
- On clear: calls `onChange(null)`

---

## Form Field Mapping

Which fields get replaced with `AsyncAutocomplete`:

| Form | Field | Replaces | `fetchOptions` source |
|------|-------|----------|----------------------|
| `OpportunityFormPage` | `customerId` | `TextField` (raw UUID) | `useCustomers` search |
| `OpportunityFormPage` | `contactId` | `TextField` (raw UUID) | `useContacts` search |
| `OpportunityFormPage` | `ownerId` | `TextField` (raw UUID) | `useUsers` search |
| `ContactFormPage` | `customerId` | `TextField` (raw UUID) | `useCustomers` search |
| `TaskFormDialog` | `assigneeId` | `Select` (100 users loaded) | `useUsers` search |
| `TaskFormDialog` | `customerId` | `Select` (100 customers loaded) | `useCustomers` search |
| `PipelineBoardPage` | `ownerId` filter | `Select` (100 users loaded) | `useUsers` search |

---

## Pipeline State Model

### DragState (PipelineBoardPage local state)

```typescript
interface DragState {
  activeId: string | null;       // Opportunity UUID being dragged
  activeStageId: string | null;  // Stage the card came from
  activeName: string | null;     // Card name for overlay rendering
  activeRevenue?: string;
  activeCloseDate?: string;
  activeOwner?: { id: string; firstName: string; lastName: string };
}
```

### StageColor (frontend constant)

```typescript
const STAGE_PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
  '#14b8a6', // teal
  '#6366f1', // indigo
];
// Usage: STAGE_PALETTE[columnIndex % STAGE_PALETTE.length]
```

`StageColumn` receives a new `stageColor: string` prop and renders a colored left border or top stripe.

---

## Global Search Fix

No model changes. The fix is to remove the `listbox.footer` slot hack and add a sentinel option:

```typescript
// Footer sentinel option appended to options array when results exist
const FOOTER_OPTION: Option = {
  type: '__footer__',
  id: '__footer__',
  label: '',  // rendered via renderOption
};
```

`filterOptions` already passes through server-side results unchanged (`(x) => x`), so the sentinel just needs to be excluded from standard selection behavior in `onChange`.
