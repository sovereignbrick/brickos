# Adding Custom Markers

Sovereign Health ships with 84+ markers, but you can add custom markers to track additional biomarkers specific to your needs.

## Overview

Adding a marker involves:

1. Creating a database migration to insert the marker
2. Setting up reference ranges for the marker
3. Optionally adding knowledge content (description, foods, supplements)

## Step 1: Create a Migration

Create a new SQL migration file in the `migrations/` directory. Use a timestamp prefix:

```bash
touch migrations/20260310120000_add_custom_marker.sql
```

Insert the marker into the `markers` table:

```sql
INSERT INTO markers (id, zone_id, name, slug, unit, description, is_calculated, display_order, created_at)
VALUES (
    gen_random_uuid(),
    (SELECT id FROM zones WHERE slug = 'metabolic-energy'),
    'Adiponectin',
    'adiponectin',
    'ug/mL',
    'A protein hormone produced by fat cells that helps regulate glucose levels and fatty acid breakdown. Higher levels are associated with better insulin sensitivity.',
    false,
    99,
    now()
);
```

Key fields:

- **zone_id:** Select the appropriate zone by slug
- **slug:** URL-friendly identifier, lowercase with hyphens. Must be unique.
- **unit:** The canonical storage unit for this marker
- **is_calculated:** Set to `false` for manually entered markers

## Step 2: Add Reference Ranges

In the same migration (or a separate one), insert reference ranges:

```sql
INSERT INTO reference_ranges (id, marker_slug, protocol_tag, sex, optimal_min, optimal_max, borderline_min, borderline_max, unit, created_at)
VALUES
    (gen_random_uuid(), 'adiponectin', 'standard', 'male', 10.0, 30.0, 5.0, 40.0, 'ug/mL', now()),
    (gen_random_uuid(), 'adiponectin', 'standard', 'female', 15.0, 40.0, 8.0, 50.0, 'ug/mL', now()),
    (gen_random_uuid(), 'adiponectin', 'fasting_16_8', 'all', 12.0, 35.0, 6.0, 45.0, 'ug/mL', now());
```

You can add ranges for as many protocol tags as needed: `standard`, `fasting_16_8`, `omad`, `fasting_48h`, `extended_fast`, `ketogenic`, `carnivore`.

The `sex` field accepts `male`, `female`, or `all`.

## Step 3: Add Knowledge Content (Optional)

Add marker content such as foods and supplements:

```sql
INSERT INTO marker_content (id, marker_slug, content_type, content, created_at)
VALUES
    (gen_random_uuid(), 'adiponectin', 'foods', '{"foods_that_raise": [{"name": "Fatty fish", "notes": "Omega-3 fatty acids increase adiponectin"}]}', now()),
    (gen_random_uuid(), 'adiponectin', 'supplements', '{"supplements": [{"name": "Omega-3", "effect": "raises", "typical_dose": "2-4g EPA+DHA daily"}]}', now());
```

## Step 4: Apply the Migration

Restart the backend. Migrations run automatically on startup:

```bash
docker compose restart backend
```

Or, if running locally:

```bash
cargo run
```

## Step 5: Verify

Check that the marker appears:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8080/api/v1/markers/adiponectin
```

## Calculated Markers

To add a calculated marker (derived from other markers), also insert into the `calculated_markers` table:

```sql
INSERT INTO markers (id, zone_id, name, slug, unit, description, is_calculated, display_order, created_at)
VALUES (gen_random_uuid(), (SELECT id FROM zones WHERE slug = 'liver'), 'De Ritis Ratio', 'de-ritis-ratio', 'ratio', 'AST/ALT ratio. Values above 2.0 may suggest alcoholic liver disease.', true, 99, now());

INSERT INTO calculated_markers (id, marker_slug, formula, component_slugs, created_at)
VALUES (gen_random_uuid(), 'de-ritis-ratio', 'ast / alt', ARRAY['ast', 'alt'], now());
```

The backend will automatically compute this marker whenever both component markers have measurements for the same date.

## Important Notes

- Never modify existing migration files. Always create new ones.
- Marker slugs must be unique across the entire system.
- Restart the backend after adding migrations for them to take effect.
