# Measurements API

All measurement endpoints require authentication and are under `/api/v1/measurements`.

## POST /api/v1/measurements

Create a new measurement.

**Request:**

```bash
curl -X POST http://localhost:8080/api/v1/measurements \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "marker_slug": "glucose",
    "value": 92.5,
    "unit": "mg/dL",
    "protocol_tag": "fasting_16_8",
    "measured_at": "2026-03-10T07:30:00Z",
    "notes": "Fasted 16 hours"
  }'
```

**Response (201):**

```json
{
  "data": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "marker_slug": "glucose",
    "value": 92.5,
    "unit": "mg/dL",
    "protocol_tag": "fasting_16_8",
    "measured_at": "2026-03-10T07:30:00Z",
    "notes": "Fasted 16 hours",
    "status": "green",
    "created_at": "2026-03-10T12:00:00Z"
  },
  "error": null
}
```

The `status` field (green, yellow, or red) is computed automatically based on the reference range for the marker, protocol, and user's biological sex.

If the measurement triggers a calculated marker update (e.g., logging glucose when ketones already exist for the same day), the calculated marker (GKI) is also updated.

## GET /api/v1/measurements

List measurements with optional filtering and pagination.

**Request:**

```bash
curl "http://localhost:8080/api/v1/measurements?marker=glucose&from=2026-01-01&to=2026-03-10&page=1&per_page=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| marker | string | Filter by marker slug |
| from | date | Start date (ISO 8601) |
| to | date | End date (ISO 8601) |
| protocol | string | Filter by protocol tag |
| page | integer | Page number (default: 1) |
| per_page | integer | Items per page (default: 50, max: 100) |

**Response (200):**

```json
{
  "data": [
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "marker_slug": "glucose",
      "value": 92.5,
      "unit": "mg/dL",
      "protocol_tag": "fasting_16_8",
      "measured_at": "2026-03-10T07:30:00Z",
      "status": "green"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 50,
    "total": 127
  },
  "error": null
}
```

## GET /api/v1/measurements/:id

Get a single measurement by ID.

**Request:**

```bash
curl http://localhost:8080/api/v1/measurements/b2c3d4e5-f6a7-8901-bcde-f12345678901 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**

```json
{
  "data": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "marker_slug": "glucose",
    "value": 92.5,
    "unit": "mg/dL",
    "protocol_tag": "fasting_16_8",
    "measured_at": "2026-03-10T07:30:00Z",
    "notes": "Fasted 16 hours",
    "status": "green",
    "created_at": "2026-03-10T12:00:00Z"
  },
  "error": null
}
```

## PUT /api/v1/measurements/:id

Update an existing measurement.

**Request:**

```bash
curl -X PUT http://localhost:8080/api/v1/measurements/b2c3d4e5-f6a7-8901-bcde-f12345678901 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": 91.0,
    "notes": "Corrected value"
  }'
```

Only the fields you include in the request body are updated.

## DELETE /api/v1/measurements/:id

Soft-delete a measurement (sets `is_deleted = true`).

**Request:**

```bash
curl -X DELETE http://localhost:8080/api/v1/measurements/b2c3d4e5-f6a7-8901-bcde-f12345678901 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (204):** No content.

## GET /api/v1/measurements/filters

Get available filter values for the current user (useful for building filter dropdowns).

**Response (200):**

```json
{
  "data": {
    "markers": ["glucose", "ketones", "weight", "systolic-bp"],
    "protocols": ["standard", "fasting_16_8", "omad"],
    "date_range": {
      "earliest": "2025-06-15T00:00:00Z",
      "latest": "2026-03-10T07:30:00Z"
    }
  },
  "error": null
}
```
