# Customizing Thresholds

Sovereign Health lets users override the default reference ranges for any marker. This is useful when your doctor provides specific targets or when population-level ranges do not fit your situation.

## How Reference Ranges Work

Each marker has default reference ranges defined in the database, organized by:

- **Protocol tag:** standard, fasting_16_8, omad, fasting_48h, extended_fast, ketogenic, carnivore
- **Biological sex:** male, female, or all

The system evaluates measurements in this priority order:

1. **User custom range** (if set for this marker)
2. **Protocol-specific range** (matching the measurement's protocol tag and user's sex)
3. **Default range** (standard protocol, sex = all)

## Customizing via the Settings Page

1. Navigate to Settings, then Reference Ranges
2. Browse or search for the marker you want to customize
3. Enter your custom values:
   - **Optimal min / Optimal max:** the green zone (values within this range get a green status)
   - **Borderline min / Borderline max:** the yellow zone (values outside optimal but within these limits)
4. Click Save

Values outside the borderline range receive a red status.

## Customizing via the API

Send a PUT request to update your custom reference ranges:

```bash
curl -X PUT http://localhost:8080/api/v1/settings/reference-ranges \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "marker_slug": "glucose",
    "optimal_min": 70,
    "optimal_max": 90,
    "borderline_min": 65,
    "borderline_max": 100,
    "unit": "mg/dL"
  }'
```

## Resetting to Defaults

To remove a custom range and revert to the system default:

1. Go to Settings, then Reference Ranges
2. Find the customized marker (indicated by a "Custom" badge)
3. Click "Reset to Default"

Or via the API:

```bash
curl -X DELETE http://localhost:8080/api/v1/settings/reference-ranges/glucose \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Examples

### Tighter Glucose Control

A user with pre-diabetes might want stricter glucose targets:

| Range | Default | Custom |
|-------|---------|--------|
| Optimal | 70-99 mg/dL | 70-85 mg/dL |
| Borderline | 60-109 mg/dL | 60-95 mg/dL |

### Higher Ketone Targets

A user on a therapeutic ketogenic diet might consider higher ketone levels optimal:

| Range | Default | Custom |
|-------|---------|--------|
| Optimal | 0.5-3.0 mmol/L | 1.5-4.0 mmol/L |
| Borderline | 0.1-5.0 mmol/L | 0.5-6.0 mmol/L |

## How Custom Ranges Affect the Dashboard

Once you set a custom range:

- The marker's traffic light status recalculates based on your custom thresholds
- Trend chart background bands update to show your custom green/yellow/red zones
- Dr. Alex AI uses your custom ranges when discussing this marker

## Storage

Custom ranges are stored in the `user_settings` table as part of the `custom_ranges` JSONB column. They are included in data exports and will transfer if you migrate between instances.

## Protocol Interaction

Custom ranges apply regardless of protocol. If you set a custom glucose range, that range is used whether the measurement is tagged as standard or fasting. If you want protocol-specific customization, you would need to set custom ranges per protocol (this is planned for a future release; currently custom ranges apply globally).
