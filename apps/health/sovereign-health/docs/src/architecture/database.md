# Database Schema

Sovereign Health uses PostgreSQL 16 with UUID primary keys, timestamps on all tables, and soft delete for mutable records.

## Core Conventions

- Primary keys: `id UUID DEFAULT gen_random_uuid()`
- All tables: `created_at TIMESTAMPTZ DEFAULT now()`
- Mutable tables: `updated_at TIMESTAMPTZ DEFAULT now()`
- Soft delete: `is_deleted BOOLEAN DEFAULT false`
- Enums: stored as `TEXT` (not Postgres ENUM types) for easier migration
- Flexible data: `JSONB` columns for preferences, overrides, and feature flags

## Key Tables

### users

Stores account credentials and profile information.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | User identifier |
| email | TEXT | Unique email address |
| password_hash | TEXT | Argon2-hashed password |
| display_name | TEXT | User's display name |
| role | TEXT | `user` or `admin` |
| is_deleted | BOOLEAN | Soft delete flag |
| created_at | TIMESTAMPTZ | Account creation time |
| updated_at | TIMESTAMPTZ | Last profile update |

### zones

The 8 health zones that organize markers.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Zone identifier |
| name | TEXT | Zone display name |
| slug | TEXT | URL-friendly identifier |
| description | TEXT | Zone description |
| display_order | INTEGER | Sort order on dashboard |

### markers

Individual biomarkers, each belonging to a zone.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Marker identifier |
| zone_id | UUID (FK) | Parent zone |
| name | TEXT | Display name (e.g., "Fasting Glucose") |
| slug | TEXT | URL-friendly identifier |
| unit | TEXT | Canonical measurement unit |
| description | TEXT | Plain-language explanation |
| is_calculated | BOOLEAN | Whether this marker is derived from others |

### measurements

User health data entries. Values are encrypted at rest when `ENCRYPTION_KEY` is configured.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Measurement identifier |
| user_id | UUID (FK) | Owning user |
| marker_slug | TEXT | Which marker was measured |
| value | TEXT | Encrypted measurement value |
| unit | TEXT | Unit of measurement |
| protocol_tag | TEXT | Protocol at time of measurement |
| measured_at | TIMESTAMPTZ | When the measurement was taken |
| notes | TEXT | Optional user notes |

### reference_ranges

Threshold definitions per marker, per protocol, per biological sex.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Range identifier |
| marker_slug | TEXT | Associated marker |
| protocol_tag | TEXT | Protocol context (standard, fasting_16_8, etc.) |
| sex | TEXT | `male`, `female`, or `all` |
| optimal_min / optimal_max | NUMERIC | Green zone boundaries |
| borderline_min / borderline_max | NUMERIC | Yellow zone boundaries |
| unit | TEXT | Unit for these thresholds |

### calculated_markers

Definitions for derived markers (formulas and component mappings).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Definition identifier |
| marker_slug | TEXT | The calculated marker |
| formula | TEXT | Calculation formula description |
| component_slugs | TEXT[] | Array of input marker slugs |

### doctor_chat_conversations / doctor_chat_messages

AI conversation storage.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Conversation identifier |
| user_id | UUID (FK) | Owning user |
| mode | TEXT | Specialist mode (general, trends, labs, diet, supplements, protocols) |
| title | TEXT | Conversation title |
| messages | (separate table) | Individual messages with role and content |

### user_medications

Active medication and supplement tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Record identifier |
| user_id | UUID (FK) | Owning user |
| medication_id | UUID (FK) | Catalog reference (nullable for custom entries) |
| name | TEXT | Medication name |
| dosage | TEXT | Dosage amount and unit |
| frequency | TEXT | How often taken |
| started_at | DATE | Start date |
| ended_at | DATE | End date (null if ongoing) |

### user_settings

Per-user preferences stored as JSONB.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Settings identifier |
| user_id | UUID (FK) | Owning user |
| preferences | JSONB | Units, protocol, lifestyle, notification settings |
| custom_ranges | JSONB | Per-marker reference range overrides |

### license_tiers

SaaS tier definitions (read by the application to enforce quotas).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Tier identifier |
| slug | TEXT | Tier identifier (glimpse, focus, insight, clarity, horizon) |
| name | TEXT | Display name |
| price_monthly | NUMERIC | Monthly price in USD |
| features | JSONB | Feature flags and quota limits |
