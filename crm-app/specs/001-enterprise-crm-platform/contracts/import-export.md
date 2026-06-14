# API Contract: Data Import & Export

**Base path**: `/api/v1` | **Auth**: Bearer JWT required

---

## Import

### POST /api/v1/import/customers

Upload a CSV file to import customer records.

**Roles**: `SYSTEM_ADMINISTRATOR`, `SALES_MANAGER`

**Request**: `multipart/form-data`
- `file`: CSV file (max 10 MB, UTF-8)

**CSV columns** (first row = headers):
`companyName*`, `industry`, `website`, `revenueRange`, `addressLine1`, `city`, `state`,
`country`, `postalCode`, `status` (defaults to PROSPECT), `ownerEmail` (defaults to uploader)

`*` = required

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

### POST /api/v1/import/contacts

**Roles**: `SYSTEM_ADMINISTRATOR`, `SALES_MANAGER`

**Request**: `multipart/form-data` — `file`: CSV

**CSV columns**:
`firstName*`, `lastName*`, `email`, `phone`, `designation`, `department`, `notes`,
`customerCompanyName*` (matched by exact company name)

**Response 202**: Same shape as customer import.

---

### GET /api/v1/import/:jobId

Poll import job status.

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

The `resultDownloadUrl` points to a CSV detailing per-row validation errors.

**Import job statuses**: `PENDING → VALIDATING → PROCESSING → COMPLETED | FAILED`

---

## Export

### GET /api/v1/export/customers

**Roles**: All (visibility-scoped)

**Query params**: `status`, `industry`, `ownerId`, `fromDate`, `toDate`

**Response**: `Content-Type: text/csv`
`Content-Disposition: attachment; filename="customers-export-<date>.csv"`

---

### GET /api/v1/export/contacts

**Roles**: All (visibility-scoped)

**Query params**: `customerId`, `fromDate`, `toDate`

**Response**: CSV download.

---

### GET /api/v1/export/report-data

Delegates to the reports export endpoint. See [reports.md](reports.md).
