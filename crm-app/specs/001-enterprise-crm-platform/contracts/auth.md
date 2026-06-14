# API Contract: Authentication

**Base path**: `/api/v1/auth` | **Auth required**: see per-endpoint notes

All responses use the canonical envelope:
- Success: `{ data: <payload> }`
- Error: `{ error: { code: string, message: string } }`

---

## POST /api/v1/auth/login

**Auth**: Public (email/password — SystemAdministrator only)

**Request body**:
```json
{
  "email": "admin@example.com",
  "password": "SecurePass123!"
}
```

**Response 200**:
```json
{
  "data": {
    "accessToken": "<jwt>",
    "expiresIn": 900,
    "user": {
      "id": "uuid",
      "email": "admin@example.com",
      "firstName": "Alice",
      "lastName": "Smith",
      "role": "SYSTEM_ADMINISTRATOR"
    }
  }
}
```
Refresh token set in `httpOnly; Secure; SameSite=Strict` cookie `crm_refresh`.

**Errors**: `401 INVALID_CREDENTIALS`, `403 ROLE_NOT_PERMITTED` (non-admin attempts email/password)

---

## POST /api/v1/auth/sso/initiate

**Auth**: Public

**Query params**: `provider=saml|oidc`

**Response**: `302` redirect to IdP login page.

---

## GET /api/v1/auth/sso/callback

**Auth**: Public (IdP-signed assertion)

**Query params (OIDC)**: `code`, `state`
**POST body (SAML)**: `SAMLResponse`

**Response 200**: Same shape as `/login` (access token + httpOnly refresh cookie).

**Errors**: `401 SSO_ASSERTION_INVALID`, `403 USER_NOT_PROVISIONED`, `403 ACCOUNT_INACTIVE`

---

## POST /api/v1/auth/refresh

**Auth**: Public (refresh token in `crm_refresh` cookie)

**Response 200**:
```json
{
  "data": {
    "accessToken": "<new-jwt>",
    "expiresIn": 900
  }
}
```
New refresh token replaces old cookie (rotation).

**Errors**: `401 REFRESH_TOKEN_INVALID`, `401 REFRESH_TOKEN_EXPIRED`

---

## POST /api/v1/auth/logout

**Auth**: Bearer JWT

Revokes the current refresh token.

**Response 204**: No content. `crm_refresh` cookie cleared.

---

## POST /api/v1/auth/password/reset-request

**Auth**: Public

**Request body**: `{ "email": "admin@example.com" }`

**Response 202**: Always returns 202 (prevents email enumeration).

---

## POST /api/v1/auth/password/reset

**Auth**: Public

**Request body**:
```json
{
  "token": "<reset-token-from-email>",
  "newPassword": "NewSecurePass123!"
}
```

**Response 204**: No content.

**Errors**: `400 TOKEN_INVALID_OR_EXPIRED`

---

## POST /api/v1/auth/password/change

**Auth**: Bearer JWT (SystemAdministrator only)

**Request body**:
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass123!"
}
```

**Response 204**: No content. All refresh tokens for the user are revoked.

**Errors**: `400 CURRENT_PASSWORD_INCORRECT`

---

## GET /api/v1/auth/me

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

## PATCH /api/v1/auth/me

**Auth**: Bearer JWT

**Request body** (all fields optional):
```json
{
  "firstName": "Robert",
  "lastName": "Jones",
  "phone": "+1-555-0101",
  "jobTitle": "Senior Sales Representative"
}
```

**Response 200**: Updated user profile (same shape as GET /auth/me).

---

## GET /api/v1/auth/sso/config

**Auth**: Bearer JWT — `SYSTEM_ADMINISTRATOR`

**Response 200**: Current SSO configuration (certificate redacted).

---

## PUT /api/v1/auth/sso/config

**Auth**: Bearer JWT — `SYSTEM_ADMINISTRATOR`

**Request body**:
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
