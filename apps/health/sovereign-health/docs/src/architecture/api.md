# API Design

The Sovereign Health API follows RESTful conventions with a consistent JSON response envelope, JWT authentication, and kebab-case URL paths.

## Base URL

```
http://localhost:8080    (development)
https://api.yourdomain.com  (production)
```

All API routes are prefixed with `/api/v1/` except the health check endpoint.

## Response Envelope

Every response uses a consistent JSON structure:

**Success:**
```json
{
  "data": { ... },
  "error": null
}
```

**Error:**
```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Marker slug is required"
  }
}
```

## Authentication

Most endpoints require a JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

Tokens are issued by `POST /api/v1/auth/login` and `POST /api/v1/auth/signup`. Tokens expire after a configurable duration and can be refreshed via `POST /api/v1/auth/refresh`.

Public endpoints (no auth required):
- `GET /health`
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`

## URL Conventions

- Kebab-case for path segments: `/api/v1/doctor-chat`, `/api/v1/reference-ranges`
- Resource IDs as path parameters: `/api/v1/measurements/:id`
- Nested resources for relationships: `/api/v1/markers/:slug/trend`

## Pagination

List endpoints support pagination via query parameters:

```
GET /api/v1/measurements?page=1&per_page=50
```

Response includes pagination metadata:

```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "per_page": 50,
    "total": 234
  }
}
```

## Filtering

Measurements and other list endpoints support filtering:

```
GET /api/v1/measurements?marker=glucose&from=2026-01-01&to=2026-03-10&protocol=fasting_16_8
```

## Date Format

All dates use ISO 8601 format: `2026-03-10T14:30:00Z`. The API accepts and returns dates in UTC.

## HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Successful GET, PUT |
| 201 | Successful POST (resource created) |
| 204 | Successful DELETE |
| 400 | Validation error or bad request |
| 401 | Missing or invalid authentication token |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Conflict (e.g., duplicate email on signup) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

## Content Type

All requests and responses use `Content-Type: application/json`.

## CORS

The backend includes CORS headers based on the `CORS_ORIGINS` environment variable. In development, `http://localhost:3000` is allowed by default.

## Rate Limiting

API requests are rate-limited per user. The default limit is 100 requests per minute. Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1709913600
```
