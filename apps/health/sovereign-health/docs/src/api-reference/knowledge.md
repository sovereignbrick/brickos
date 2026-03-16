# Knowledge API

The knowledge API provides access to the relationship engine, protocol effect data, and search functionality. All endpoints require authentication.

## GET /api/v1/knowledge/markers/:slug

Get the full knowledge profile for a marker, including relationships, protocol effects, and related content.

**Request:**

```bash
curl http://localhost:8080/api/v1/knowledge/markers/glucose \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**

```json
{
  "data": {
    "marker_slug": "glucose",
    "relationships": [
      {"target_slug": "hba1c", "type": "correlates_with", "description": "HbA1c reflects average glucose over 2-3 months"},
      {"target_slug": "fasting-insulin", "type": "correlates_with", "description": "Insulin regulates glucose uptake"},
      {"target_slug": "gki", "type": "derived_from", "description": "GKI = glucose (mmol/L) / ketones (mmol/L)"},
      {"target_slug": "homa-ir", "type": "derived_from", "description": "HOMA-IR = (insulin x glucose) / 405"}
    ],
    "protocol_effects": [
      {"protocol": "fasting_16_8", "effect": "Fasting glucose typically decreases 5-10 mg/dL"},
      {"protocol": "extended_fast", "effect": "Glucose may drop to 55-70 mg/dL, which is expected"}
    ],
    "medication_effects": [
      {"medication": "Metformin", "effect": "Lowers fasting glucose by 20-30%"},
      {"medication": "Prednisone", "effect": "Can significantly raise blood glucose"}
    ]
  },
  "error": null
}
```

## GET /api/v1/knowledge/relations

Get all marker relationships, optionally filtered by type.

**Request:**

```bash
curl "http://localhost:8080/api/v1/knowledge/relations?type=correlates_with" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by relationship type: `correlates_with`, `derived_from`, `antagonist`, `related` |
| marker | string | Filter by source marker slug |

**Response (200):**

```json
{
  "data": [
    {
      "source_slug": "glucose",
      "target_slug": "hba1c",
      "type": "correlates_with",
      "description": "HbA1c reflects average glucose over 2-3 months"
    },
    {
      "source_slug": "hdl",
      "target_slug": "triglycerides",
      "type": "antagonist",
      "description": "HDL and triglycerides typically move in opposite directions"
    }
  ],
  "error": null
}
```

## GET /api/v1/knowledge/protocols/:protocol

Get information about a specific protocol and its effects on markers.

**Request:**

```bash
curl http://localhost:8080/api/v1/knowledge/protocols/fasting_16_8 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**

```json
{
  "data": {
    "protocol": "fasting_16_8",
    "display_name": "Intermittent Fasting 16:8",
    "description": "16 hours of fasting with an 8-hour eating window",
    "marker_effects": [
      {"marker_slug": "glucose", "direction": "lower", "magnitude": "mild", "notes": "5-10 mg/dL decrease typical"},
      {"marker_slug": "ketones", "direction": "higher", "magnitude": "mild", "notes": "May reach 0.3-0.8 mmol/L by end of fast"},
      {"marker_slug": "fasting-insulin", "direction": "lower", "magnitude": "moderate", "notes": "Improved insulin sensitivity over time"}
    ]
  },
  "error": null
}
```

**Supported protocols:** `standard`, `fasting_16_8`, `omad`, `fasting_48h`, `extended_fast`, `ketogenic`, `carnivore`

## GET /api/v1/knowledge/search

Search across markers, foods, supplements, and medications.

**Request:**

```bash
curl "http://localhost:8080/api/v1/knowledge/search?q=cholesterol" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| q | string | Search query (minimum 2 characters) |
| category | string | Limit search to: `markers`, `foods`, `supplements`, `medications` |

**Response (200):**

```json
{
  "data": {
    "markers": [
      {"slug": "total-cholesterol", "name": "Total Cholesterol", "zone": "cardiovascular"},
      {"slug": "ldl", "name": "LDL Cholesterol", "zone": "cardiovascular"},
      {"slug": "hdl", "name": "HDL Cholesterol", "zone": "cardiovascular"}
    ],
    "supplements": [
      {"name": "Red Yeast Rice", "related_marker": "ldl"}
    ],
    "foods": [
      {"name": "Oats", "related_marker": "total-cholesterol", "effect": "lowers"}
    ]
  },
  "error": null
}
```
