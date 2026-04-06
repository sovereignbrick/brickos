# Sovereign Link API Reference

Base URL: `http://localhost:8080` (or your configured `SOVEREIGN_LINK_BASE_URL`)

## Authentication

All `/api/v1/*` endpoints require authentication via the `Authorization` header:

```
Authorization: Bearer <jwt_token_or_api_key>
```

The server tries JWT verification first, then API key lookup.

---

## Public Endpoints

### GET /r/{code}

Redirect to the target URL. Returns 301 Moved Permanently.

```bash
curl -L http://localhost:8080/r/abc123
```

**Responses:**
- `301` -- Redirect with `Location` header
- `404` -- Link not found

### GET /r/{code}.qr

Get a QR code (SVG) for the short link.

```bash
curl http://localhost:8080/r/abc123.qr -o qr.svg
```

**Responses:**
- `200` -- SVG image (`image/svg+xml`)
- `404` -- Link not found

### GET /health

Health check endpoint.

```bash
curl http://localhost:8080/health
```

**Response:**
```json
{"status": "ok"}
```

---

## Auth Endpoints

### POST /auth/register

Create a new user account. The first user automatically becomes admin.

```bash
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword",
    "display_name": "Alice"
  }'
```

**Request body:**
| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | yes | Valid email address |
| `password` | string | yes | Minimum 8 characters |
| `display_name` | string | no | Display name |

**Response (201):**
```json
{
  "token": "eyJhbGci...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "display_name": "Alice",
    "is_admin": true
  }
}
```

**Errors:**
- `400` -- Invalid email or short password
- `403` -- Registration disabled
- `409` -- Email already registered

### POST /auth/login

Authenticate with email and password.

```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword"
  }'
```

**Request body:**
| Field | Type | Required |
|---|---|---|
| `email` | string | yes |
| `password` | string | yes |

**Response (200):**
```json
{
  "token": "eyJhbGci...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "display_name": "Alice",
    "is_admin": true
  }
}
```

**Errors:**
- `401` -- Invalid credentials

### POST /auth/nostr

Authenticate with a NIP-98 signed event. Auto-creates the user on first login.

```bash
curl -X POST http://localhost:8080/auth/nostr \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "id": "...",
      "pubkey": "...",
      "created_at": 1712345678,
      "kind": 27235,
      "tags": [["u", "http://localhost:8080/auth/nostr"], ["method", "POST"]],
      "content": "",
      "sig": "..."
    }
  }'
```

**NIP-98 event requirements:**
- `kind` must be `27235`
- `created_at` must be within 60 seconds of server time
- `u` tag must match `{base_url}/auth/nostr`
- Event ID must be valid SHA-256 of canonical serialization
- Schnorr signature must be valid against pubkey

**Response (200):**
```json
{
  "token": "eyJhbGci...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "display_name": "nostr:a1b2c3d4",
    "nostr_pubkey": "a1b2c3d4...",
    "is_admin": false
  },
  "created": true
}
```

**Errors:**
- `400` -- NOSTR disabled, or invalid NIP-98 event

### POST /auth/refresh

Issue a new JWT from an existing valid token.

```bash
curl -X POST http://localhost:8080/auth/refresh \
  -H "Authorization: Bearer eyJhbGci..."
```

**Response (200):**
```json
{
  "token": "eyJhbGci...(new)...",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "display_name": "Alice",
    "is_admin": true
  }
}
```

**Errors:**
- `401` -- Missing, invalid, or expired token

### POST /auth/login/form

Form-based login from the web UI. Sets an `auth_token` cookie and redirects.

**Request:** `application/x-www-form-urlencoded` with `email` and `password` fields.

**Response:** `303 See Other` redirect to `/dashboard` (success) or `/login?error=invalid` (failure).

### POST /auth/register/form

Form-based registration from the web UI. Sets an `auth_token` cookie and redirects.

**Request:** `application/x-www-form-urlencoded` with `email`, `password`, and optional `display_name` fields.

**Response:** `303 See Other` redirect to `/dashboard` (success) or `/register?error=...` (failure).

---

## Links API

### GET /api/v1/links

List all links owned by the authenticated user.

```bash
curl http://localhost:8080/api/v1/links \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "code": "abc123",
    "target_url": "https://example.com/long-url",
    "link_type": "shortener",
    "domain": "localhost",
    "app_key": "standalone",
    "owner_user_id": "...",
    "owner_org_id": null,
    "affiliate_code": null,
    "title": "My Link",
    "is_active": true,
    "expires_at": null,
    "created_at": "2026-04-05T12:00:00Z",
    "updated_at": "2026-04-05T12:00:00Z"
  }
]
```

### POST /api/v1/links

Create a new short link.

```bash
curl -X POST http://localhost:8080/api/v1/links \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target_url": "https://example.com/very-long-url-here",
    "code": "my-link",
    "title": "Example Link"
  }'
```

**Request body:**
| Field | Type | Required | Description |
|---|---|---|---|
| `target_url` | string | yes | Destination URL |
| `code` | string | no | Custom short code (3-30 chars, lowercase alphanumeric + hyphens) |
| `title` | string | no | Descriptive title |
| `link_type` | string | no | Link category (default: "shortener") |
| `domain` | string | no | Domain override |
| `app_key` | string | no | Application key |
| `expires_at` | string | no | ISO 8601 expiration timestamp |

**Code validation rules:**
- 3-30 characters
- Lowercase alphanumeric and hyphens only
- Cannot start or end with a hyphen
- Reserved words blocked: api, admin, health, login, signup, etc.

**Response (201):** Full link object (same schema as list response).

**Errors:**
- `400` -- Invalid code format
- `401` -- Unauthorized
- `409` -- Code already taken

### PUT /api/v1/links/{id}

Update a link. Only the link owner can update it.

```bash
curl -X PUT http://localhost:8080/api/v1/links/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target_url": "https://example.com/new-destination",
    "title": "Updated Title",
    "is_active": true
  }'
```

**Request body (all optional):**
| Field | Type | Description |
|---|---|---|
| `target_url` | string | New destination URL |
| `title` | string | New title |
| `is_active` | bool | Enable/disable the link |
| `expires_at` | string | New expiration (ISO 8601) |

**Response (200):** Updated link object.

**Errors:**
- `401` -- Unauthorized
- `404` -- Link not found or not owned by user

### DELETE /api/v1/links/{id}

Deactivate a link (soft delete). Only the link owner can delete it.

```bash
curl -X DELETE http://localhost:8080/api/v1/links/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**
```json
{"status": "deactivated"}
```

**Errors:**
- `401` -- Unauthorized
- `404` -- Link not found or not owned by user

### GET /api/v1/links/{id}/stats

Get click analytics for a link.

```bash
curl http://localhost:8080/api/v1/links/550e8400-e29b-41d4-a716-446655440000/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**
```json
{
  "total_clicks": 142,
  "clicks_7d": 23,
  "clicks_30d": 89,
  "unique_visitors_7d": 18,
  "top_countries": [
    {"country_code": "US", "count": 45},
    {"country_code": "DE", "count": 32}
  ]
}
```

---

## User API

### POST /api/v1/me/api-key

Generate a new API key for the authenticated user. The raw key is returned once; only the hash is stored.

```bash
curl -X POST http://localhost:8080/api/v1/me/api-key \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response (200):**
```json
{
  "api_key": "slk_a1b2c3d4e5f6...",
  "warning": "Store this key securely. It will not be shown again."
}
```

---

## Web UI Pages

These pages are server-rendered HTML (standalone mode only):

| Path | Description |
|---|---|
| `/` | Home / landing page |
| `/login` | Login form |
| `/register` | Registration form |
| `/dashboard` | Link management dashboard |
| `/new` | Create new link form |
| `/links/{id}` | Link detail page with stats |
| `/links/{id}/edit` | Edit link (form POST) |
| `/links/{id}/delete` | Delete link (form POST) |
| `/settings` | User settings |
| `/settings/profile` | Update profile (form POST) |
| `/settings/password` | Change password (form POST) |
| `/logout` | Logout (form POST, clears cookie) |

---

## Error Format

All JSON error responses use the same format:

```json
{"error": "Human-readable error message"}
```

## Rate Limiting

Link creation is rate-limited to `SOVEREIGN_LINK_RATE_LIMIT_CREATES` per user per day (default: 50).
