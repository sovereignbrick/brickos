# Authentication API

All authentication endpoints are under `/api/v1/auth`.

## POST /api/v1/auth/signup

Create a new user account.

**Request:**

```bash
curl -X POST http://localhost:8080/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "display_name": "Jane"
  }'
```

**Response (201):**

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "user@example.com",
      "display_name": "Jane",
      "role": "user",
      "created_at": "2026-03-10T12:00:00Z"
    }
  },
  "error": null
}
```

**Errors:**

| Code | Condition |
|------|-----------|
| 400 | Missing required fields or password too short |
| 403 | Registration is disabled (`REGISTRATION_ENABLED=false`) |
| 409 | Email already registered |

## POST /api/v1/auth/login

Authenticate and receive a JWT token.

**Request:**

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

**Response (200):**

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "user@example.com",
      "display_name": "Jane",
      "role": "user"
    }
  },
  "error": null
}
```

**Errors:**

| Code | Condition |
|------|-----------|
| 400 | Missing email or password |
| 401 | Invalid credentials |

## POST /api/v1/auth/refresh

Refresh an expiring token. Requires a valid (but possibly near-expiry) token.

**Request:**

```bash
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

**Response (200):**

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9.newtoken..."
  },
  "error": null
}
```

**Errors:**

| Code | Condition |
|------|-----------|
| 401 | Token is invalid or fully expired |

## GET /api/v1/auth/me

Get the current authenticated user's profile.

**Request:**

```bash
curl http://localhost:8080/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

**Response (200):**

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "user@example.com",
    "display_name": "Jane",
    "role": "user",
    "created_at": "2026-03-10T12:00:00Z",
    "tier": {
      "slug": "glimpse",
      "name": "Glimpse"
    }
  },
  "error": null
}
```

**Errors:**

| Code | Condition |
|------|-----------|
| 401 | Missing or invalid token |

## Token Format

Tokens are signed with HS256 using the `JWT_SECRET` environment variable. The payload includes:

```json
{
  "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "user@example.com",
  "role": "user",
  "exp": 1709913600,
  "iat": 1709827200
}
```

## Password Requirements

- Minimum 8 characters
- No maximum length enforced
- Passwords are hashed with Argon2 before storage
