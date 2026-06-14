# Anti-Clock Training — Assignments

This repository contains hands-on assignments built during the Anti-Clock Training program. Each assignment is a standalone project in its own directory.

---

## Assignments

### [`crm-app/`](./crm-app) — Enterprise CRM Platform

A production-grade Customer Relationship Management platform demonstrating full-stack enterprise patterns.

| Layer | Technology |
|---|---|
| Backend | NestJS 10, TypeScript, Prisma ORM |
| Frontend | React 19, Vite, Material UI v6, TanStack Query |
| Database | PostgreSQL 16 |
| Auth | JWT access tokens + httpOnly refresh tokens |
| Storage | S3-compatible object storage (MinIO in dev) |
| Deployment | Docker, Kubernetes |

**Key features:**
- Role-based access control (5 roles: Admin, Sales Manager, Sales Rep, Support, Read-Only)
- Customer, Contact, and Opportunity management with configurable pipeline stages
- Activity tracking (calls, meetings, emails, notes, follow-ups)
- Task management with overdue detection
- Dashboard with role-based metrics and revenue trend charts
- Reports with CSV export, global search (Ctrl+K), audit log, file attachments
- In-app notifications via SSE + email with daily reminders

**Quick start:**
```bash
cd crm-app
cp .env.example .env        # edit secrets
docker compose up -d
# Frontend:   http://localhost:8080
# API:        http://localhost:3000/api/v1
# Swagger:    http://localhost:3000/api/docs
```

See [`crm-app/README.md`](./crm-app/README.md) for full setup and development instructions.

---

## CI

GitHub Actions runs on every push and PR to `main` / `develop`:

| Job | What it covers |
|---|---|
| Backend — Lint & Test | Prisma migration, lint, unit tests, build (with Postgres service) |
| Frontend — Lint & Test | TypeScript type check, lint, unit tests, build |
| Docker build | Backend and frontend image build (on push to `main` only) |

Workflow: [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)
