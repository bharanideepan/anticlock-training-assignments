# Module: Data Import & Export

## Overview

The Import/Export module enables bulk operations — importing customers and contacts from CSV files (with row-level validation and error reporting) and exporting entity data as CSV. Import jobs are async; status can be polled. Export is synchronous.

---

## User Stories

### US-1: Import Customers from CSV (Priority: P3)
A user uploads a customer CSV file, sees a validation preview, confirms the import, and verifies records appear in the customer list.

**Acceptance scenarios**:
1. Valid CSV uploaded → preview of records and validation results shown before confirmation.
2. CSV with missing required field → row-level errors clearly reported; no records imported until resolved.
3. Confirmed import completes → all valid records created with audit entry referencing the import operation.

### US-2: Export Data as CSV (Priority: P3)
A user applies filters and downloads customer or contact data as a CSV.

---

## Functional Requirements

- **FR-054**: Users MUST be able to import customer and contact records from CSV files.
- **FR-055**: System MUST validate imported rows and report errors before committing any records.
- **FR-056**: Users MUST be able to export customer data, contact data, and report data to CSV.

---

## Import: Customers

### POST /api/v1/import/customers
**Roles**: SYSTEM_ADMINISTRATOR, SALES_MANAGER

**Request**: `multipart/form-data`, field `file` — CSV file (max 10 MB, UTF-8)

**CSV columns** (first row = headers):

| Column | Required | Notes |
|--------|----------|-------|
| `companyName` | ✓ | |
| `industry` | — | |
| `website` | — | URL |
| `revenueRange` | — | Must be one of: UNDER_1M, 1M_10M, 10M_50M, 50M_250M, OVER_250M |
| `addressLine1` | — | |
| `city` | — | |
| `state` | — | |
| `country` | — | |
| `postalCode` | — | |
| `status` | — | Defaults to PROSPECT |
| `ownerEmail` | — | Defaults to uploader; must match an existing active user |

**Response 202**:
```json
{
  "data": {
    "jobId": "uuid",
    "status": "VALIDATING",
    "uploadedAt": "2026-06-12T10:00:00Z"
  }
}
```

---

## Import: Contacts

### POST /api/v1/import/contacts
**Roles**: SYSTEM_ADMINISTRATOR, SALES_MANAGER

**CSV columns**:

| Column | Required | Notes |
|--------|----------|-------|
| `firstName` | ✓ | |
| `lastName` | ✓ | |
| `email` | — | |
| `phone` | — | |
| `designation` | — | |
| `department` | — | |
| `notes` | — | |
| `customerCompanyName` | ✓ | Must match an existing customer by exact company name |

**Response 202**: Same shape as customer import.

---

## Poll Import Status

### GET /api/v1/import/:jobId
**Auth**: Bearer JWT (uploader or admin)

**Response 200**:
```json
{
  "data": {
    "jobId": "uuid",
    "type": "CUSTOMER",
    "status": "COMPLETED",
    "totalRows": 500,
    "processedRows": 500,
    "errorRows": 12,
    "resultDownloadUrl": "https://s3.../import-result-uuid.csv",
    "createdAt": "2026-06-12T10:00:00Z",
    "updatedAt": "2026-06-12T10:02:00Z"
  }
}
```

`resultDownloadUrl` points to a CSV with per-row validation errors.

---

## Import Job Status Flow

```
PENDING → VALIDATING → PROCESSING → COMPLETED
                  │           │
                  └───────────┴──→ FAILED
```

- **PENDING**: File uploaded, job queued.
- **VALIDATING**: Row-by-row validation. No records written yet.
- **PROCESSING**: Valid rows being written to DB.
- **COMPLETED**: All valid rows created. Error rows listed in result CSV.
- **FAILED**: Systemic failure (file unreadable, DB unreachable, etc.).

**Performance target**: 1,000-row CSV validates and processes in < 60 seconds.

---

## Export: Customers

### GET /api/v1/export/customers
**Roles**: All (visibility-scoped)

**Query params**: `status`, `industry`, `ownerId`, `fromDate`, `toDate`

**Response**: `Content-Type: text/csv`
`Content-Disposition: attachment; filename="customers-export-<date>.csv"`

---

## Export: Contacts

### GET /api/v1/export/contacts
**Roles**: All (visibility-scoped)

**Query params**: `customerId`, `fromDate`, `toDate`

**Response**: CSV download.

---

## Export: Report Data

### GET /api/v1/export/report-data

Delegates to the reports export endpoint. See the Reports module spec.

---

## Frontend Page

| Route | Component | Access |
|-------|-----------|--------|
| `/import-export` | `ImportExportPage` | ADMIN, MANAGER (import); All (export) |

### Import Tab
1. Select entity type (Customers / Contacts)
2. Download CSV template link
3. File upload input (CSV only, max 10 MB)
4. After upload: job status polling with progress bar
5. On validation errors: error count displayed; link to download error CSV
6. On completion: success count displayed; navigate to entity list

### Export Tab
1. Select entity type (Customers / Contacts)
2. Apply optional filters (status, industry, date range, etc.)
3. "Export CSV" button → file download begins

---

## Business Rules

- Import validates ALL rows first before writing any records. A partial import on the same file is not supported — it's all-or-nothing per valid row set.
- `ownerEmail` in customer CSV must match an active user within the uploader's visibility scope.
- `customerCompanyName` in contact CSV uses exact string match (case-insensitive) against existing customers. Unmatched rows are reported as errors.
- Duplicate detection: if a customer with the same `companyName` already exists, the row is flagged as an error — not merged or overwritten.
- Import operations produce an `IMPORT_COMPLETED` audit entry with the job ID.
- The CSV error report (per-row errors) is stored in S3 and linked via `resultDownloadUrl`.
- Export is scoped to the authenticated user's visibility — a sales rep exports only their own records.
