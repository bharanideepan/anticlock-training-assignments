# Module: File Management

## Overview

Users upload files (contracts, proposals, documents) and associate them with a customer, opportunity, or activity. Files are stored in S3-compatible object storage via a presigned URL flow that bypasses the backend for large uploads. Downloads use short-lived presigned GET URLs.

---

## User Stories

### US-1: Upload and Download Files (Priority: P3)
A user uploads a PDF to a customer record and downloads it again.

**Acceptance scenarios**:
1. User uploads PDF to customer → file appears in customer's document list with name, uploader, and upload date.
2. User clicks Download → file downloaded with original name and content intact.
3. User without access to the customer attempts to download the file directly → rejected with 403.

---

## Functional Requirements

- **FR-046**: Users MUST be able to upload files and associate them with a customer, opportunity, or activity.
- **FR-047**: Users with access to the parent record MUST be able to download associated files.
- **FR-048**: File access MUST be restricted based on the viewer's permission to the parent record.

---

## File Constraints

- Maximum size: 25 MB per file
- Allowed resource types: `CUSTOMER`, `OPPORTUNITY`, `ACTIVITY`
- S3 lifecycle policy handles physical deletion 30 days after soft-delete

---

## Upload Flow

```
1. Frontend → POST /api/v1/files/upload-url
   (requests presigned S3 POST URL, validates user has write access to parent record)

2. Backend → responds with presigned URL + uploadFields + fileId (5-minute expiry)

3. Frontend → uploads file DIRECTLY to S3 using presigned URL
   (bypasses backend — no server bandwidth consumed)

4. Frontend → POST /api/v1/files/confirm { fileId }
   (tells backend upload succeeded; backend records file metadata in DB)
```

---

## Download Flow

```
1. Frontend → GET /api/v1/files/:id/download-url
   (backend validates user has read access to parent record)

2. Backend → responds with presigned GET URL (15-minute expiry)

3. Frontend → redirects or fetches presigned URL directly from browser
```

---

## API Endpoints

### POST /api/v1/files/upload-url
**Auth**: Bearer JWT

**Request**:
```json
{
  "originalName": "Acme_Contract_2026.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 2048576,
  "resourceType": "CUSTOMER",
  "resourceId": "uuid"
}
```

**Validations**:
- `sizeBytes` ≤ 26,214,400 (25 MB)
- `resourceType` ∈ { CUSTOMER, OPPORTUNITY, ACTIVITY }
- Requesting user must have write access to the referenced resource

**Response 200**:
```json
{
  "data": {
    "uploadUrl": "https://s3.amazonaws.com/crm-files/...",
    "uploadFields": { "key": "...", "policy": "...", "x-amz-signature": "..." },
    "fileId": "uuid",
    "expiresAt": "2026-06-12T10:05:00Z"
  }
}
```

---

### POST /api/v1/files/confirm
**Auth**: Bearer JWT

**Request**: `{ "fileId": "uuid" }`

**Response 200**:
```json
{
  "data": {
    "id": "uuid",
    "originalName": "Acme_Contract_2026.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 2048576,
    "resourceType": "CUSTOMER",
    "resourceId": "uuid",
    "uploadedBy": { "id": "uuid", "firstName": "Jane", "lastName": "Doe" },
    "createdAt": "2026-06-12T10:03:00Z"
  }
}
```

---

### GET /api/v1/files
**Auth**: Bearer JWT

**Query params**: `resourceType` (required), `resourceId` (required)

**Response 200**: Array of file objects (without download URL — request `/download-url` separately).

---

### GET /api/v1/files/:id/download-url
**Auth**: Bearer JWT

**Response 200**:
```json
{
  "data": {
    "downloadUrl": "https://s3.amazonaws.com/crm-files/...?X-Amz-Expires=900&...",
    "expiresAt": "2026-06-12T10:18:00Z"
  }
}
```

**Errors**: `404 FILE_NOT_FOUND`, `403 ACCESS_DENIED`

---

### DELETE /api/v1/files/:id
**Roles**: Uploader or SYSTEM_ADMINISTRATOR, SALES_MANAGER

Soft-deletes the DB record. S3 object is physically removed after 30 days by lifecycle policy.

**Response 204**

---

## Frontend Components

| Component | Usage |
|-----------|-------|
| `FileUploadZone` | Drag-and-drop or click-to-upload area on detail pages |
| `FileList` | Table of attached files with download and delete actions |
| `FileItem` | Single file row: name, formatted size, upload date, uploader |

### File Row (in detail page tabs)
- File name (truncated with tooltip if long)
- Formatted file size (e.g., "2.0 MB")
- Upload date
- Uploader name
- Download button → calls `/download-url` and opens presigned URL
- Delete button (uploader, admin, or manager only)

### Upload UX
- Drag-and-drop zone or "Browse files" button
- Shows progress indicator during S3 direct upload
- Confirms when upload completes (calls `/confirm`)
- Error state if presign expired or upload failed (with retry option)

---

## Business Rules

- A file record is created in the database at presign time with a pending state; `/confirm` finalizes it.
- If `/confirm` is never called (e.g., browser closed mid-upload), the pending record can be cleaned up by a scheduled job after 24 hours.
- Files are always scoped to their parent resource's visibility — a user who cannot see the parent customer cannot download its files.
- Uploader, System Admin, and Sales Manager can soft-delete files; the S3 object persists for 30 days per lifecycle policy.
