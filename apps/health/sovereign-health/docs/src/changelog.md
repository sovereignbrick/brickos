# Changelog

## v0.14.0 (2026-03-10)

Initial open source release of Sovereign Health.

### Features

- **8 Health Zones:** Metabolic Energy, Cardiovascular, Body Composition, Inflammation and Immunity, Liver Function, Kidney Function, Thyroid, Blood Health
- **84+ Biomarkers:** complete marker definitions with descriptions, units, and display ordering
- **Measurements:** create, read, update, and soft-delete health measurements with protocol tagging
- **Calculated Markers:** automatic derivation of GKI, BMI, HOMA-IR, WHtR, TG/HDL ratio, AST/ALT ratio, BUN/creatinine ratio, free T3/reverse T3 ratio
- **Protocol-Aware Reference Ranges:** thresholds for standard, fasting 16:8, OMAD, 48-hour fast, extended fast, ketogenic, and carnivore protocols
- **Traffic Light Status:** every measurement receives green, yellow, or red status based on reference ranges
- **AES-256-GCM Encryption:** health measurement values encrypted at rest when ENCRYPTION_KEY is configured
- **JWT + Argon2 Authentication:** secure token-based auth with Argon2 password hashing
- **Dr. Alex AI Assistant:** 6 specialist modes (general, trends, labs, diet, supplements, protocols) with conversation history
- **Medication Tracking:** catalog of common medications with interaction warnings and marker effect annotations
- **Supplement Tracking:** supplement catalog with dosage guidance and interaction checking
- **Knowledge Engine:** marker relationships, food impacts, supplement recommendations, protocol effects, published references
- **Trend Analysis:** measurement history with date range filtering, protocol filtering, and rolling averages
- **User Settings:** unit preferences (metric/imperial), lifestyle configuration, custom reference range overrides
- **Data Export:** JSON export of all user health data
- **Account Deletion:** full data removal on request
- **License Tiers (SaaS):** Glimpse (free), Focus, Insight, Clarity, Horizon with feature and quota gating
- **OSS Mode:** all features unlocked for self-hosted deployments (`SHI_MODE=oss`)
- **Dark Theme UI:** Next.js 16 frontend with Tailwind CSS and shadcn/ui components
- **Docker Compose Deployment:** single-command setup with automatic migrations and data seeding
