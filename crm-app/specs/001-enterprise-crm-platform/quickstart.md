# Quickstart Validation Guide: Enterprise CRM Platform

**Phase 1 Output** | **Date**: 2026-06-12 | **Plan**: [plan.md](plan.md)

This guide documents how to stand up the CRM locally and validate each major user story end-to-end.
It does not contain implementation code — only setup commands and validation steps.

---

## Prerequisites

| Requirement | Version | Check |
|-------------|---------|-------|
| Node.js | 20 LTS | `node --version` |
| pnpm | 8+ | `pnpm --version` |
| Docker + Docker Compose | Latest | `docker --version` |
| PostgreSQL client | 16 | `psql --version` (optional, for manual DB inspection) |
| AWS CLI or S3-compatible client | — | For file upload validation |

---

## Environment Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url> crm-app && cd crm-app
pnpm install --filter backend
pnpm install --filter frontend
```

### 2. Configure environment variables

```bash
# backend/.env (copy from backend/.env.example)
DATABASE_URL="postgresql://crm_user:crm_pass@localhost:5432/crm_dev"
JWT_SECRET="<min-32-char-random-string>"
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=604800
S3_ENDPOINT="http://localhost:9000"
S3_BUCKET="crm-files"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
MAIL_HOST="localhost"
MAIL_PORT=1025

# frontend/.env
VITE_API_BASE_URL="http://localhost:3000"
```

### 3. Start infrastructure (PostgreSQL + MinIO + MailHog)

```bash
docker compose -f docker-compose.dev.yml up -d
# Services: postgres:5432, minio:9000 (S3), mailhog:8025 (SMTP web UI)
```

### 4. Run database migrations and seed

```bash
cd backend
pnpm prisma migrate deploy
pnpm prisma db seed
# Seeds: 5 roles, 1 admin user (admin@crm.local / Admin123!), default pipeline stages
```

### 5. Start backend and frontend

```bash
# Terminal 1
cd backend && pnpm start:dev   # http://localhost:3000

# Terminal 2
cd frontend && pnpm dev        # http://localhost:5173
```

### 6. Verify backend health

```bash
curl http://localhost:3000/health
# Expected: { "status": "ok" }

curl http://localhost:3000/health/ready
# Expected: { "status": "ok", "db": "connected" }
```

### 7. Open API docs

Navigate to `http://localhost:3000/api/docs` — Swagger UI with all endpoints.

---

## Validation Scenarios

Run these in order. Each scenario validates one or more user stories.

---

### Scenario 1: Authentication (US1)

**Goal**: Verify login, profile, and logout.

```bash
# Admin email/password login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@crm.local","password":"Admin123!"}'
# Expected: 200 with accessToken + crm_refresh cookie

# Save token
TOKEN="<accessToken from response>"

# Get current user
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 with admin user profile

# Logout
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer $TOKEN"
# Expected: 204
```

**Browser validation**: Open `http://localhost:5173`, log in, verify dashboard loads, log out,
verify redirect to login page.

---

### Scenario 2: User Management (US2)

**Goal**: Create a Sales Representative user.

```bash
# Create sales rep user (as admin)
curl -X POST http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane.doe@crm.local",
    "firstName": "Jane",
    "lastName": "Doe",
    "jobTitle": "Sales Representative",
    "roleId": "<sales-rep-role-id-from-seed>"
  }'
# Expected: 201 with user object

# Log in as Jane (check MailHog at http://localhost:8025 for activation email)
# After activation, Jane logs in via SSO (or email/password if configured as admin fallback)
```

**Browser validation**: Admin navigates to User Management, creates the user, verifies user
appears in list with "Sales Representative" role badge.

---

### Scenario 3: Customer Management (US3)

**Goal**: Create, search, filter, and archive a customer.

```bash
JANE_TOKEN="<Jane's access token>"

# Create customer
curl -X POST http://localhost:3000/api/v1/customers \
  -H "Authorization: Bearer $JANE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Acme Corp","industry":"Technology","status":"PROSPECT"}'
# Expected: 201, status=PROSPECT

CUSTOMER_ID="<id from response>"

# Search by name
curl "http://localhost:3000/api/v1/customers?search=Acme" \
  -H "Authorization: Bearer $JANE_TOKEN"
# Expected: 200 with Acme Corp in results

# Transition to ACTIVE
curl -X POST "http://localhost:3000/api/v1/customers/$CUSTOMER_ID/status" \
  -H "Authorization: Bearer $JANE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"ACTIVE"}'
# Expected: 200, status=ACTIVE

# Archive (as manager/admin)
curl -X POST "http://localhost:3000/api/v1/customers/$CUSTOMER_ID/archive" \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200, status=ARCHIVED
```

---

### Scenario 4: Contacts (US4)

```bash
# Create contact linked to customer
curl -X POST http://localhost:3000/api/v1/contacts \
  -H "Authorization: Bearer $JANE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Sarah","lastName":"Lee","email":"sarah@acme.com","designation":"CTO","customerId":"'$CUSTOMER_ID'"}'
# Expected: 201

CONTACT_ID="<id from response>"

# Verify contact appears on customer
curl "http://localhost:3000/api/v1/customers/$CUSTOMER_ID/contacts" \
  -H "Authorization: Bearer $JANE_TOKEN"
# Expected: 200, Sarah Lee in results
```

---

### Scenario 5: Activities (US5)

```bash
# Log a phone call
curl -X POST http://localhost:3000/api/v1/activities \
  -H "Authorization: Bearer $JANE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"PHONE_CALL","subject":"Intro call","durationMinutes":20,"customerId":"'$CUSTOMER_ID'","contactId":"'$CONTACT_ID'"}'
# Expected: 201

# View customer timeline
curl "http://localhost:3000/api/v1/customers/$CUSTOMER_ID/activities" \
  -H "Authorization: Bearer $JANE_TOKEN"
# Expected: 200, phone call in first position (reverse-chron)
```

---

### Scenario 6: Opportunities & Pipeline (US6, US7)

```bash
# Create opportunity
curl -X POST http://localhost:3000/api/v1/opportunities \
  -H "Authorization: Bearer $JANE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Renewal","customerId":"'$CUSTOMER_ID'","expectedRevenue":50000,"probability":40}'
# Expected: 201, stage=Lead (default)

OPP_ID="<id from response>"

# Get pipeline board
curl http://localhost:3000/api/v1/pipeline \
  -H "Authorization: Bearer $JANE_TOKEN"
# Expected: Acme Renewal in Lead column

# Move to Qualified
QUALIFIED_STAGE_ID="<qualified-stage-id-from-seed>"
curl -X PATCH "http://localhost:3000/api/v1/opportunities/$OPP_ID/stage" \
  -H "Authorization: Bearer $JANE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stageId":"'$QUALIFIED_STAGE_ID'"}'
# Expected: 200, stage=Qualified

# Close as Won
curl -X POST "http://localhost:3000/api/v1/opportunities/$OPP_ID/close/won" \
  -H "Authorization: Bearer $JANE_TOKEN"
# Expected: 200, terminal Won stage, actualCloseDate set
```

---

### Scenario 7: Tasks & Notifications (US8, US11)

```bash
# Create task assigned to Jane from Admin
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"FOLLOW_UP","title":"Send proposal","dueDate":"2026-12-31T17:00:00Z","assigneeId":"<jane-user-id>","customerId":"'$CUSTOMER_ID'"}'
# Expected: 201

# Check Jane's notifications (as Jane)
curl "http://localhost:3000/api/v1/notifications?unreadOnly=true" \
  -H "Authorization: Bearer $JANE_TOKEN"
# Expected: TASK_ASSIGNED notification for the new task

# Mark as read
NOTIF_ID="<notification id>"
curl -X POST "http://localhost:3000/api/v1/notifications/$NOTIF_ID/read" \
  -H "Authorization: Bearer $JANE_TOKEN"
# Expected: 204

# Complete the task
TASK_ID="<task id>"
curl -X POST "http://localhost:3000/api/v1/tasks/$TASK_ID/complete" \
  -H "Authorization: Bearer $JANE_TOKEN"
# Expected: 200, status=COMPLETED
```

---

### Scenario 8: File Upload (US12)

```bash
# Request presigned URL
curl -X POST http://localhost:3000/api/v1/files/upload-url \
  -H "Authorization: Bearer $JANE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"originalName":"contract.pdf","mimeType":"application/pdf","sizeBytes":102400,"resourceType":"CUSTOMER","resourceId":"'$CUSTOMER_ID'"}'
# Expected: 200 with uploadUrl and fileId

# Upload file directly to MinIO using returned presigned URL (use curl or browser)
# ...

# Confirm upload
FILE_ID="<fileId from step 1>"
curl -X POST http://localhost:3000/api/v1/files/confirm \
  -H "Authorization: Bearer $JANE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileId":"'$FILE_ID'"}'
# Expected: 200 with file metadata

# Request download URL
curl "http://localhost:3000/api/v1/files/$FILE_ID/download-url" \
  -H "Authorization: Bearer $JANE_TOKEN"
# Expected: 200 with presigned downloadUrl
```

---

### Scenario 9: Global Search (US13)

```bash
curl "http://localhost:3000/api/v1/search?q=Acme" \
  -H "Authorization: Bearer $JANE_TOKEN"
# Expected: results in customers and contacts sections with Acme-related records
```

---

### Scenario 10: Dashboard & Reports (US9, US10)

```bash
# Dashboard metrics
curl http://localhost:3000/api/v1/dashboard/metrics \
  -H "Authorization: Bearer $JANE_TOKEN"
# Expected: non-zero metrics

# Revenue report
curl "http://localhost:3000/api/v1/reports/sales/revenue?fromDate=2026-01-01&toDate=2026-12-31" \
  -H "Authorization: Bearer $JANE_TOKEN"
# Expected: revenue data for period

# CSV export
curl "http://localhost:3000/api/v1/reports/sales/revenue/export?fromDate=2026-01-01&toDate=2026-12-31" \
  -H "Authorization: Bearer $JANE_TOKEN" \
  -o revenue-report.csv
# Expected: CSV file downloaded
```

---

### Scenario 11: CSV Import (US14)

```bash
# Prepare a sample customers.csv with headers: companyName,industry,status
# e.g., "TestCo,Finance,PROSPECT"

curl -X POST http://localhost:3000/api/v1/import/customers \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/customers.csv"
# Expected: 202 with jobId

JOB_ID="<jobId>"

# Poll status
curl "http://localhost:3000/api/v1/import/$JOB_ID" \
  -H "Authorization: Bearer $TOKEN"
# Expected: status transitions to COMPLETED, errorRows=0

# Verify records created
curl "http://localhost:3000/api/v1/customers?search=TestCo" \
  -H "Authorization: Bearer $TOKEN"
# Expected: TestCo in results
```

---

### Scenario 12: Audit Log (US15)

```bash
# View audit entries for the customer (as admin)
curl "http://localhost:3000/api/v1/audit/logs?resourceType=CUSTOMER&resourceId=$CUSTOMER_ID" \
  -H "Authorization: Bearer $TOKEN"
# Expected: entries for RECORD_CREATED, STATUS_CHANGED (PROSPECT→ACTIVE), STATUS_CHANGED (→ARCHIVED)
```

---

## Running Automated Tests

```bash
# Backend unit tests
cd backend && pnpm test

# Backend integration tests (requires running postgres)
cd backend && pnpm test:integration

# Frontend unit tests
cd frontend && pnpm test

# Playwright E2E tests (requires both servers running)
cd frontend && pnpm test:e2e
```

---

## Teardown

```bash
docker compose -f docker-compose.dev.yml down -v
# Removes all containers and volumes
```
