# API Contract: File Management

**Base path**: `/api/v1/files` | **Auth**: Bearer JWT required

File uploads use a presigned S3 URL flow to bypass backend bandwidth constraints.

---

## POST /api/v1/files/upload-url

Request a presigned S3 POST URL. Frontend uploads directly to S3, then confirms.

**Request body**:
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

## POST /api/v1/files/confirm

Confirm that the S3 upload completed successfully.

**Request body**: `{ "fileId": "uuid" }`

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

## GET /api/v1/files

**Query params**: `resourceType` (required), `resourceId` (required)

Returns all non-deleted files for the given resource.

**Response 200**: Array of file objects (without download URL — request separately).

---

## GET /api/v1/files/:id/download-url

Generates a presigned GET URL (15-minute expiry).

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

## DELETE /api/v1/files/:id

**Roles**: Uploader or `SYSTEM_ADMINISTRATOR`, `SALES_MANAGER`

Soft-deletes the DB record. S3 object lifecycle policy handles physical deletion after 30 days.

**Response 204**.
