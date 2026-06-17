## Environment Variables (required)

```
DATABASE_URL               # PostgreSQL connection string
JWT_SECRET                 # HS256 access token signing secret
JWT_REFRESH_SECRET         # Refresh token signing secret
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
S3_BUCKET_NAME
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
FRONTEND_URL               # CORS allow-origin + password reset link base
SESSION_TIMEOUT_MINUTES    # Default: 30
```

## Notes

- **No automatic account lockout** on failed logins — logged to AuditLog for admin review
- **AuditLog is append-only** — never soft-deleted, never updated
- **Pipeline stages**: 6 seeded defaults (Lead → Qualified → Proposal → Negotiation → Won → Lost); Won and Lost are terminal and cannot be edited
- **Performance targets**: Dashboard < 2s; list pages (10k records) < 3s; global search < 2s; CSV export (12 months) < 30s; 1k concurrent users without degradation
- **SSO only for non-admin users** — email/password login for SYSTEM_ADMINISTRATOR only
- **No mobile support in v1** — desktop and tablet only (≥1280px desktop, 768–1279px tablet)
