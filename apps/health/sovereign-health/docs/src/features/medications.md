# Medications & Supplements

Sovereign Health includes a medication and supplement tracking system with an interaction warning engine. This helps you understand how your medications may affect your biomarkers.

## Medication Catalog

The platform ships with a built-in catalog of common medications, seeded automatically on first startup. Each catalog entry includes:

- Generic name and common brand names
- Drug class and category
- Known marker effects (which biomarkers the medication typically raises or lowers)
- Common interactions with other medications and supplements

## Tracking Active Medications

To track a medication:

1. Navigate to the Medications page
2. Search the catalog or add a custom entry
3. Enter dosage, frequency, and start date
4. Optionally set an end date for time-limited prescriptions

Active medications appear on your profile and are factored into Dr. Alex AI conversations for more accurate guidance.

## Interaction Warnings

When you add a new medication, the system checks for known interactions with:

- Other active medications in your profile
- Supplements you are currently tracking
- Protocol-specific concerns (e.g., certain medications should not be taken during extended fasts)

Interaction warnings are displayed immediately when an interaction is detected. Each warning includes severity (informational, caution, or serious) and a brief explanation.

## Marker Effects

Each medication in the catalog has annotated marker effects. These appear on marker detail pages as contextual notes. For example, if you are taking metformin and viewing your glucose trend, you will see a note indicating that metformin typically lowers fasting glucose.

This helps you distinguish between changes caused by lifestyle interventions and changes caused by medication.

## Supplement Tracking

Supplements are tracked the same way as medications. The catalog includes common supplements such as:

- Vitamin D3, magnesium, omega-3, zinc
- CoQ10, berberine, alpha-lipoic acid
- Ashwagandha, curcumin, probiotics

Supplement entries include known marker effects and interactions with common medications.

## Custom Entries

If a medication or supplement is not in the catalog, you can add a custom entry with:

- Name and dosage
- Frequency and start date
- Optional notes

Custom entries do not include automated interaction checking, but they are still visible to Dr. Alex for conversation context.

## Data Privacy

Medication data is stored in your account and encrypted at rest (when `ENCRYPTION_KEY` is configured). It is never shared with external services except as anonymized context for Dr. Alex AI conversations.
