# Markers API

Marker endpoints provide biomarker definitions, trend data, and knowledge content. All endpoints require authentication.

## GET /api/v1/markers

List all available markers.

**Request:**

```bash
curl http://localhost:8080/api/v1/markers \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| zone | string | Filter by zone slug (e.g., `metabolic-energy`) |
| search | string | Search by marker name |

**Response (200):**

```json
{
  "data": [
    {
      "slug": "glucose",
      "name": "Fasting Glucose",
      "zone_slug": "metabolic-energy",
      "unit": "mg/dL",
      "is_calculated": false,
      "latest_value": 92.5,
      "latest_status": "green",
      "latest_measured_at": "2026-03-10T07:30:00Z"
    }
  ],
  "error": null
}
```

The `latest_value`, `latest_status`, and `latest_measured_at` fields reflect the user's most recent measurement for each marker. They are `null` if the user has no measurements for that marker.

## GET /api/v1/markers/:slug

Get detailed information about a single marker.

**Request:**

```bash
curl http://localhost:8080/api/v1/markers/glucose \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200):**

```json
{
  "data": {
    "slug": "glucose",
    "name": "Fasting Glucose",
    "zone_slug": "metabolic-energy",
    "unit": "mg/dL",
    "description": "Fasting glucose measures the amount of sugar in your blood after not eating for at least 8 hours...",
    "is_calculated": false,
    "reference_ranges": {
      "standard": {
        "optimal_min": 70,
        "optimal_max": 99,
        "borderline_min": 60,
        "borderline_max": 109
      },
      "fasting_16_8": {
        "optimal_min": 65,
        "optimal_max": 90,
        "borderline_min": 55,
        "borderline_max": 100
      }
    },
    "related_markers": [
      {"slug": "hba1c", "relationship": "correlates_with"},
      {"slug": "gki", "relationship": "derived_from"}
    ]
  },
  "error": null
}
```

## GET /api/v1/markers/:slug/trend

Get measurement trend data for a specific marker.

**Request:**

```bash
curl "http://localhost:8080/api/v1/markers/glucose/trend?from=2026-01-01&to=2026-03-10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| from | date | Start date (ISO 8601) |
| to | date | End date (ISO 8601) |
| protocol | string | Filter by protocol tag |
| rolling_avg | integer | Rolling average window in days (7 or 30) |

**Response (200):**

```json
{
  "data": {
    "marker_slug": "glucose",
    "points": [
      {"value": 95.0, "measured_at": "2026-01-15T07:00:00Z", "status": "green"},
      {"value": 92.5, "measured_at": "2026-02-10T07:30:00Z", "status": "green"}
    ],
    "rolling_average": [
      {"value": 93.8, "date": "2026-01-15"},
      {"value": 93.2, "date": "2026-02-10"}
    ],
    "reference_range": {
      "optimal_min": 70,
      "optimal_max": 99,
      "borderline_min": 60,
      "borderline_max": 109
    }
  },
  "error": null
}
```

## GET /api/v1/markers/:slug/content

Get knowledge content for a marker (description, context, protocol notes).

**Response (200):**

```json
{
  "data": {
    "marker_slug": "glucose",
    "description": "Fasting glucose measures the amount of sugar in your blood...",
    "protocol_notes": {
      "fasting_16_8": "During 16:8 fasting, slightly lower fasting glucose is expected.",
      "extended_fast": "Glucose may drop to 55-70 mg/dL during extended fasts. This is normal."
    }
  },
  "error": null
}
```

## GET /api/v1/markers/:slug/foods

Get food recommendations that affect this marker.

**Response (200):**

```json
{
  "data": {
    "marker_slug": "glucose",
    "foods_that_lower": [
      {"name": "Cinnamon", "notes": "May improve insulin sensitivity"},
      {"name": "Berries", "notes": "Low glycemic, high fiber"}
    ],
    "foods_that_raise": [
      {"name": "White rice", "notes": "High glycemic index"},
      {"name": "Sugary drinks", "notes": "Rapid glucose spike"}
    ]
  },
  "error": null
}
```

## GET /api/v1/markers/:slug/supplements

Get supplement recommendations for this marker.

**Response (200):**

```json
{
  "data": {
    "marker_slug": "glucose",
    "supplements": [
      {
        "name": "Berberine",
        "effect": "lowers",
        "typical_dose": "500mg 2-3x daily",
        "notes": "Take with meals. May interact with metformin."
      },
      {
        "name": "Chromium",
        "effect": "lowers",
        "typical_dose": "200-1000mcg daily",
        "notes": "Chromium picolinate is the most studied form."
      }
    ]
  },
  "error": null
}
```

## GET /api/v1/markers/:slug/references

Get published references for this marker's ranges and recommendations.

**Response (200):**

```json
{
  "data": {
    "marker_slug": "glucose",
    "references": [
      {
        "title": "Standards of Medical Care in Diabetes",
        "source": "American Diabetes Association",
        "year": 2024
      }
    ]
  },
  "error": null
}
```
