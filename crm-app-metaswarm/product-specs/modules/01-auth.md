# Module: Authentication & Session Management

## Overview

The Auth module handles all identity and session concerns: email/password login (System Administrators only), SSO via SAML 2.0 or OIDC (all other users), JWT token issuance and rotation, password reset, profile management, and SSO configuration.

---

## User Stories

### US-1: Login (Priority: P1)
A user opens the CRM and authenticates. Non-admin users use enterprise SSO; System Administrators use email/password. After authentication, the user reaches their role-based dashboard.

**Acceptance scenarios**:
1. Non-admin completes SSO flow → authenticated, redirected to dashboard without entering a CRM password.
2. System Administrator submits valid email + password → authenticated, redirected to admin dashboard.
3. Deactivated account attempts login → access denied with clear message.
4. Unauthenticated user accesses protected URL → redirected to login page.

### US-2: Logout (Priority: P1)
A logged-in user clicks logout → session terminated, refresh token revoked, redirected to login page.

### US-3: Password Management (Priority: P1)
A System Administrator can:
- Request a password reset via email link (time-limited token, 1-hour expiry).
- Change their current password while authenticated (all existing refresh tokens revoked).

### US-4: SSO Configuration (Priority: P2)
An administrator can configure the IdP endpoint, entity ID, and certificate from the settings screen. Configuration is stored encrypted at rest.

---

## Functional Requirements

- **FR-001**: System MUST require authentication before accessing any protected resource.
- **FR-002**: SSO (SAML 2.0 / OIDC) MUST be the primary authentication path for non-administrator users. Email/password MUST be available exclusively for System Administrator accounts.
- **FR-003**: Password-reset flow via email link with a time-limited token (1-hour expiry).
- **FR-004**: Users MUST be able to change their own password when authenticated.
- **FR-005**: Session MUST expire after a configurable period of inactivity (default 30 minutes).
- **FR-006**: All login, logout, failed login, and password-reset events MUST be logged. Failed login attempts visible in audit log; no automatic lockout.
- **FR-007**: Administrator can configure IdP endpoint, entity ID, and certificate via settings.

---

## API Endpoints

### POST /api/v1/auth/login
**Auth**: Public (SystemAdministrator only)

**Request**:
```json
{ "email": "admin@example.com", "password": "SecurePass123!" }
```

**Response 200**:
```json
{
  "data": {
    "accessToken": "<jwt>",
    "expiresIn": 900,
    "user": { "id": "uuid", "email": "...", "firstName": "...", "lastName": "...", "role": "SYSTEM_ADMINISTRATOR" }
  }
}
```
Refresh token set as `httpOnly; Secure; SameSite=Strict` cookie `crm_refresh`.

**Errors**: `401 INVALID_CREDENTIALS`, `403 ROLE_NOT_PERMITTED`, `403 ACCOUNT_INACTIVE`

---

### POST /api/v1/auth/sso/initiate
**Auth**: Public

**Query**: `provider=saml|oidc`

**Response**: `302` redirect to IdP login page.

---

### GET /api/v1/auth/sso/callback
**Auth**: Public (IdP-signed assertion)

**Response 200**: Same shape as `/login`.

**Errors**: `401 SSO_ASSERTION_INVALID`, `403 USER_NOT_PROVISIONED`, `403 ACCOUNT_INACTIVE`

---

### POST /api/v1/auth/refresh
**Auth**: Public (reads `crm_refresh` cookie)

**Response 200**:
```json
{ "data": { "accessToken": "<new-jwt>", "expiresIn": 900 } }
```
New refresh token replaces the old cookie (token rotation).

**Errors**: `401 REFRESH_TOKEN_INVALID`, `401 REFRESH_TOKEN_EXPIRED`

---

### POST /api/v1/auth/logout
**Auth**: Bearer JWT

Revokes current refresh token. Cookie `crm_refresh` cleared.

**Response 204**

---

### POST /api/v1/auth/password/reset-request
**Auth**: Public

**Request**: `{ "email": "admin@example.com" }`

**Response 202** — always 202 (prevents email enumeration).

---

### POST /api/v1/auth/password/reset
**Auth**: Public

**Request**: `{ "token": "<reset-token>", "newPassword": "NewSecurePass123!" }`

**Response 204**

**Errors**: `400 TOKEN_INVALID_OR_EXPIRED`

---

### POST /api/v1/auth/password/change
**Auth**: Bearer JWT (SystemAdministrator only)

**Request**: `{ "currentPassword": "OldPass123!", "newPassword": "NewSecurePass123!" }`

**Response 204** — all refresh tokens for the user are revoked.

**Errors**: `400 CURRENT_PASSWORD_INCORRECT`

---

### GET /api/v1/auth/me
**Auth**: Bearer JWT

**Response 200**:
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "Bob",
    "lastName": "Jones",
    "phone": "+1-555-0100",
    "jobTitle": "Sales Representative",
    "role": "SALES_REPRESENTATIVE",
    "teams": [{ "id": "uuid", "name": "West Coast Sales" }],
    "status": "ACTIVE"
  }
}
```

---

### PATCH /api/v1/auth/me
**Auth**: Bearer JWT

**Request** (all optional): `{ "firstName": "...", "lastName": "...", "phone": "...", "jobTitle": "..." }`

**Response 200**: Updated user profile (same shape as GET /auth/me).

---

### GET /api/v1/auth/sso/config
**Auth**: Bearer JWT — SYSTEM_ADMINISTRATOR only

**Response 200**: Current SSO configuration (certificate redacted).

---

### PUT /api/v1/auth/sso/config
**Auth**: Bearer JWT — SYSTEM_ADMINISTRATOR only

**Request**:
```json
{
  "provider": "SAML",
  "isActive": true,
  "config": {
    "entryPoint": "https://idp.example.com/saml/login",
    "issuer": "crm-app",
    "cert": "<base64-encoded-cert>"
  }
}
```

**Response 200**: Saved config (cert redacted).

---

## Implementation Notes

- Access token: HS256, TTL 15 minutes, payload `{ sub, email, role, teamIds }`.
- Refresh token: 64-byte cryptographically random hex, stored as bcrypt hash in `RefreshToken` table. Delivered in httpOnly cookie. Rotated on every use — old token revoked, new token issued.
- Token revocation occurs on: logout, password change, account deactivation, role change.
- SSO config stored encrypted at rest in `SsoConfig` table.
- SSO libraries: `passport-saml` (SAML 2.0), `openid-client` (OIDC).
- On SSO callback, user is looked up by email. If active → issue JWT. If not provisioned → `403 USER_NOT_PROVISIONED`.

---

## Frontend Pages

| Route | Component | Notes |
|-------|-----------|-------|
| `/login` | `LoginPage` | Email/password form; SSO initiate button |
| `/auth/sso/callback` | `SsoCallbackPage` | Handles IdP redirect; shows loading then redirects |
| `/auth/password-reset` | `PasswordResetPage` | Enter token + new password |
| (modal in profile) | `ChangePasswordPage` | Change current password |
