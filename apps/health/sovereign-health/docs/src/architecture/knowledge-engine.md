# Knowledge Engine

The knowledge engine is the data layer that powers contextual information throughout Sovereign Health. It stores relationships between markers, protocol effects, food and supplement impacts, and medication interactions.

## Marker Relationships

Markers are connected to each other through typed relationships:

| Relationship Type | Description | Example |
|-------------------|-------------|---------|
| `correlates_with` | Markers that tend to move together | glucose correlates_with HbA1c |
| `derived_from` | Calculated marker depends on input markers | GKI derived_from glucose, ketones |
| `antagonist` | Markers that tend to move in opposite directions | HDL antagonist triglycerides |
| `related` | Clinically relevant but not directly correlated | TSH related free T4 |

These relationships power the "Related Markers" section on marker detail pages and help Dr. Alex provide contextual guidance.

## Protocol Effects

Each marker can have protocol-specific annotations describing how a given protocol affects expected values:

- **Standard:** baseline reference ranges
- **Fasting 16:8:** mild adjustments (slightly lower fasting glucose, slightly higher ketones)
- **OMAD:** moderate adjustments
- **48-hour fast:** significant shifts (elevated ketones, lower insulin, lower glucose)
- **Extended fast (72h+):** large shifts across metabolic markers
- **Ketogenic:** sustained elevated ketones, lower glucose, altered lipid panel
- **Carnivore:** elevated LDL (often expected), very low glucose, high protein markers

Protocol effects are stored as structured data and used to:
1. Adjust reference range thresholds
2. Display contextual banners on marker detail pages
3. Inform Dr. Alex about expected variations

## Food Impact Data

The knowledge engine stores foods that affect specific markers:

```json
{
  "marker_slug": "glucose",
  "foods_that_lower": [
    {"name": "Cinnamon", "notes": "May improve insulin sensitivity"},
    {"name": "Berries", "notes": "Low glycemic, rich in fiber"}
  ],
  "foods_that_raise": [
    {"name": "White bread", "notes": "High glycemic index"},
    {"name": "Fruit juice", "notes": "Concentrated sugar without fiber"}
  ]
}
```

This data appears on marker detail pages in the "Foods" section.

## Supplement Impact Data

Similar to foods, supplements are linked to markers with effect direction and typical dosage:

```json
{
  "marker_slug": "vitamin_d",
  "supplements": [
    {
      "name": "Vitamin D3",
      "effect": "raises",
      "typical_dose": "2000-5000 IU daily",
      "notes": "Take with fat for absorption"
    }
  ]
}
```

## Medication Interactions

The knowledge engine includes a medication interaction database:

- **Medication to medication:** known drug-drug interactions with severity levels
- **Medication to supplement:** interactions between drugs and supplements (e.g., blood thinners and fish oil)
- **Medication to marker:** which markers a medication typically affects and in which direction

Interaction data is checked when a user adds a new medication or supplement. Warnings are surfaced immediately.

## Published References

Each piece of knowledge (reference ranges, food effects, supplement recommendations) can be backed by published references:

| Field | Description |
|-------|-------------|
| title | Publication or guideline title |
| source | Journal, organization, or URL |
| year | Publication year |

References appear on marker detail pages and provide transparency about where the recommendations come from.

## Search

The knowledge engine supports full-text search across marker descriptions, food names, supplement names, and medication names. This powers the search bar in the navigation and the marker search in Dr. Alex conversations.

## Data Seeding

All knowledge data is seeded from migration files on first startup. The seed data includes:

- 84+ marker definitions with descriptions
- Reference ranges for all markers across all supported protocols
- Food and supplement recommendations for major markers
- A medication catalog with common prescriptions
- Marker relationship mappings
