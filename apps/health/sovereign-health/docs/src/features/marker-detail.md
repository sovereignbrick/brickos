# Marker Detail Pages

Each biomarker in Sovereign Health has a dedicated detail page that provides comprehensive information about that marker, its trends, and actionable context.

## Page Sections

### Description

A plain-language explanation of what the marker measures and why it matters. Written for people who are not medical professionals. Example: "HbA1c reflects your average blood sugar over the past 2-3 months. It measures the percentage of hemoglobin proteins that have glucose attached to them."

### Trend Chart

An interactive line chart showing all recorded measurements for the marker over time. The chart includes:

- Data points connected by a trend line
- Color-coded reference range bands (green, yellow, red) as background shading
- Date range selector (7 days, 30 days, 90 days, 1 year, all time)
- Protocol filter to show only measurements taken under a specific protocol
- Rolling average overlay (7-day or 30-day)

### Current Status

The most recent measurement displayed with its traffic light status (green, yellow, or red). If the value has changed since the previous measurement, a directional arrow and percentage change are shown.

### Reference Ranges

A table showing the optimal, borderline, and out-of-range thresholds for the marker. If the user follows a specific protocol (e.g., fasting 16:8), the protocol-adjusted ranges are displayed alongside standard ranges.

| Range | Standard | Fasting 16:8 |
|-------|----------|--------------|
| Optimal | 70-85 mg/dL | 65-80 mg/dL |
| Borderline | 86-99 mg/dL | 81-95 mg/dL |
| High | 100+ mg/dL | 96+ mg/dL |

### Foods That Affect This Marker

A list of foods known to influence the marker, grouped by effect direction:

- **Foods that may help lower this marker** (e.g., cinnamon, berries for glucose)
- **Foods that may raise this marker** (e.g., refined carbohydrates for glucose)

### Supplements

Supplements with evidence for affecting the marker, including typical dosage ranges and notes on timing or interactions.

### Related Markers

Links to other markers that correlate with this one. For example, the glucose detail page links to HbA1c, fasting insulin, HOMA-IR, and GKI. Relationship types include: correlates_with, derived_from, and antagonist.

### Published References

Citations for the reference ranges and recommendations shown on the page. Each reference includes the source title, journal or organization, and year.

## Calculated Marker Pages

Calculated markers (GKI, BMI, HOMA-IR, WHtR, TG/HDL) have additional sections:

- **Formula** showing exactly how the value is computed
- **Component markers** with links to each input marker
- **Auto-calculation note** explaining that the value updates automatically when any component marker receives a new measurement

## Protocol Context

If the user has an active protocol (fasting, keto, carnivore), the detail page displays a banner noting how the protocol affects interpretation of this marker. For example: "During extended fasting, elevated ketone levels (3.0-6.0 mmol/L) are expected and considered normal."
