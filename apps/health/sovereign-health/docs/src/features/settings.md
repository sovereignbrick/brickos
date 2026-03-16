# Settings & Preferences

The Settings page lets you configure your profile, measurement units, lifestyle preferences, and reference range customizations.

## Profile

Basic account information:

- Display name
- Email address
- Password change
- Date of birth (used for age-adjusted reference ranges)
- Biological sex (used for sex-specific reference ranges)

## Units of Measurement

Choose between metric and imperial units for applicable markers:

| Category | Metric | Imperial |
|----------|--------|----------|
| Weight | kg | lbs |
| Height | cm | ft/in |
| Waist/Hip | cm | in |
| Temperature | Celsius | Fahrenheit |
| Glucose | mmol/L | mg/dL |

The unit preference is stored per user and applied consistently across the dashboard, trend charts, and data entry forms. Internally, all values are stored in a canonical unit and converted for display.

## Lifestyle Preferences

Configure your health context so the system can adjust reference ranges:

- **Active protocol:** standard, fasting 16:8, OMAD, 48-hour fast, extended fast, ketogenic, carnivore
- **Activity level:** sedentary, lightly active, moderately active, very active
- **Dietary pattern:** omnivore, vegetarian, vegan, pescatarian

Your active protocol affects which reference ranges are displayed on marker detail pages and how traffic light statuses are calculated.

## Reference Range Customization

Override the default reference ranges for any marker. This is useful if your doctor has given you a specific target that differs from population-level ranges.

To customize a range:

1. Go to Settings, then Reference Ranges
2. Find the marker you want to customize
3. Enter your custom optimal min/max and borderline min/max
4. Save

Custom ranges take precedence over both the default ranges and protocol-adjusted ranges. You can reset any marker to its default range at any time.

## Data Export

Export all your health data as a JSON file. The export includes:

- All measurements with timestamps and protocol tags
- User settings and preferences
- Custom reference range overrides
- Medication and supplement history

This supports data portability. You can use the export to migrate between instances or to process your data with external tools.

## Account Deletion

Delete your account and all associated data. This action is permanent and cannot be undone. All measurements, settings, conversations, and medication records are removed from the database.

To delete your account:

1. Go to Settings, then Account
2. Click "Delete Account"
3. Confirm by typing your email address
4. Click "Permanently Delete"

## Notification Preferences

Configure which notifications you receive (if notifications are enabled on your instance):

- Measurement reminders
- Trend alerts (when a marker moves from green to yellow or red)
- Dr. Alex follow-up suggestions
