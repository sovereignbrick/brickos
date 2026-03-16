# Medications API

Medication endpoints manage the medication catalog, user medication tracking, and interaction checking. All endpoints require authentication.

## GET /api/v1/medications/catalog

Browse the built-in medication catalog.

**Request:**

```bash
curl "http://localhost:8080/api/v1/medications/catalog?search=metformin" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | Search by medication name |
| category | string | Filter by drug class |
| page | integer | Page number (default: 1) |
| per_page | integer | Items per page (default: 50) |

**Response (200):**

```json
{
  "data": [
    {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "name": "Metformin",
      "brand_names": ["Glucophage", "Fortamet"],
      "drug_class": "Biguanide",
      "category": "Diabetes",
      "marker_effects": [
        {"marker_slug": "glucose", "direction": "lowers", "notes": "Primary mechanism of action"},
        {"marker_slug": "hba1c", "direction": "lowers", "notes": "Typical reduction of 1-1.5%"},
        {"marker_slug": "fasting-insulin", "direction": "lowers", "notes": "Improves insulin sensitivity"}
      ]
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 50,
    "total": 1
  },
  "error": null
}
```

## GET /api/v1/medications

List the current user's active medications and supplements.

**Request:**

```bash
curl http://localhost:8080/api/v1/medications \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**

```json
{
  "data": [
    {
      "id": "d4e5f6a7-b8c9-0123-def1-234567890123",
      "medication_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "name": "Metformin",
      "dosage": "500mg",
      "frequency": "twice daily",
      "started_at": "2025-06-01",
      "ended_at": null,
      "is_active": true,
      "notes": "With meals"
    }
  ],
  "error": null
}
```

## POST /api/v1/medications

Add a medication or supplement to the user's profile.

**Request (from catalog):**

```bash
curl -X POST http://localhost:8080/api/v1/medications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "medication_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "dosage": "500mg",
    "frequency": "twice daily",
    "started_at": "2025-06-01",
    "notes": "With meals"
  }'
```

**Request (custom entry):**

```bash
curl -X POST http://localhost:8080/api/v1/medications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Custom Supplement",
    "dosage": "1 capsule",
    "frequency": "daily",
    "started_at": "2026-03-01"
  }'
```

If the medication is from the catalog (via `medication_id`), the system automatically checks for interactions with other active medications.

**Response (201):**

```json
{
  "data": {
    "id": "d4e5f6a7-b8c9-0123-def1-234567890123",
    "name": "Metformin",
    "dosage": "500mg",
    "frequency": "twice daily",
    "started_at": "2025-06-01",
    "interactions": []
  },
  "error": null
}
```

## GET /api/v1/medications/interactions

Check for interactions between all active medications and supplements.

**Request:**

```bash
curl http://localhost:8080/api/v1/medications/interactions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**

```json
{
  "data": {
    "interactions": [
      {
        "medication_a": "Warfarin",
        "medication_b": "Fish Oil",
        "severity": "caution",
        "description": "Omega-3 supplements may increase bleeding risk when combined with blood thinners"
      }
    ],
    "total": 1
  },
  "error": null
}
```

**Severity levels:** `informational`, `caution`, `serious`

## PUT /api/v1/medications/:id

Update a medication record (dosage, frequency, notes, or end date).

**Request:**

```bash
curl -X PUT http://localhost:8080/api/v1/medications/d4e5f6a7-b8c9-0123-def1-234567890123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dosage": "1000mg",
    "ended_at": "2026-03-10"
  }'
```

Setting `ended_at` marks the medication as no longer active. It remains in the history.

## DELETE /api/v1/medications/:id

Soft-delete a medication record.

**Request:**

```bash
curl -X DELETE http://localhost:8080/api/v1/medications/d4e5f6a7-b8c9-0123-def1-234567890123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (204):** No content.
