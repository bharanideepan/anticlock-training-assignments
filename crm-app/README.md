# Enterprise CRM Platform

A production-grade Customer Relationship Management platform built with NestJS, React, and PostgreSQL.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 10, TypeScript, Prisma ORM |
| Frontend | React 19, Vite, Material UI v6, TanStack Query |
| Database | PostgreSQL 16 |
| Auth | JWT access tokens + httpOnly refresh tokens |
| Storage | S3-compatible object storage (MinIO in dev) |
| Deployment | Docker, Kubernetes |

## Features

- **RBAC** — 5 roles: System Administrator, Sales Manager, Sales Representative, Support Representative, Read-Only
- **Customer & Contact Management** — full CRUD with soft delete
- **Sales Opportunity Management** — configurable pipeline stages
- **Activity Tracking** — phone calls, meetings, emails, notes, follow-ups
- **Task Management** — assignable tasks with overdue detection
- **Dashboard** — role-based metrics and Recharts visualizations
- **Reports** — sales, customer, and productivity reports with CSV export
- **Notifications** — in-app SSE + email with daily reminders
- **File Management** — presigned S3 upload/download
- **Global Search** — cross-entity search with Ctrl+K shortcut
- **Audit Log** — immutable audit trail for all changes
- **Import/Export** — CSV bulk import/export for customers and contacts

## Quick Start (Docker)

```bash
cp .env.example .env        # edit secrets
docker compose up -d
# frontend: http://localhost:8080
# backend API: http://localhost:3000/api/v1
# Swagger docs: http://localhost:3000/api/docs
# Metrics: http://localhost:3000/health/metrics
```

## Local Development

```bash
# Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run start:dev

# Frontend
cd frontend
npm install
npm run dev
```

## Project Structure

```
crm-app/
├── backend/          # NestJS API
│   ├── prisma/       # Schema and migrations
│   └── src/
│       ├── common/   # Guards, decorators, filters, pagination
│       ├── config/   # ConfigModule, logger, S3
│       └── modules/  # Domain modules (auth, users, customers, ...)
├── frontend/         # React SPA
│   └── src/
│       ├── api/      # TanStack Query hooks
│       ├── modules/  # Page components per domain
│       └── shared/   # Common components, hooks, types
├── e2e/              # Playwright E2E tests
├── k8s/              # Kubernetes manifests
└── specs/            # Feature specifications and plan
```

## API Documentation

Swagger UI available at `/api/docs` when the backend is running.

## Testing

```bash
# Backend unit tests
cd backend && npm test

# Frontend unit tests
cd frontend && npm test

# E2E tests (requires running app)
cd e2e && npm install && npm test
```

## Kubernetes Deployment

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl create secret generic crm-secrets \
  --from-literal=DATABASE_URL=... \
  --from-literal=JWT_SECRET=... \
  -n crm
kubectl apply -f k8s/
```

## License

MIT
