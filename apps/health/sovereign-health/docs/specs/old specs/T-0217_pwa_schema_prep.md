# T-0217 — PWA Schema Prep (Pre-Launch Database Foundation)

**Target:** Claude Code on LOCAL DEV MACHINE
**Priority:** HIGH — foundation for PWA offline-first (E-26)
**Sprint:** SPRINT-2026-03-14

⚠️ **Do NOT touch `/app/settings/` — FROZEN.**
⚠️ **MIGRATIONS ARE CRITICAL — backup before running.**

---

## ⚠️ PRECAUTION: Backup migrations + DB before ANY changes

**MANDATORY first step — do this before writing ANY migration:**

```bash
# 1. Backup all existing migrations
cd ~/projects/sovereign-health/core-backend
cp -r migrations/ migrations_backup_$(date +%Y%m%d_%H%M%S)/
echo "✅ Migrations backed up"

# 2. Dump the current dev DB schema
docker compose -f ~/projects/sovereign-health/docker-compose.dev.yml exec db \
  pg_dump -U sovereign_health -d sovereign_health --schema-only \
  > ~/projects/sovereign-health/db_schema_backup_$(date +%Y%m%d_%H%M%S).sql
echo "✅ Schema backed up"

# 3. Dump full dev DB data (small — dev only)
docker compose -f ~/projects/sovereign-health/docker-compose.dev.yml exec db \
  pg_dump -U sovereign_health -d sovereign_health \
  > ~/projects/sovereign-health/db_full_backup_$(date +%Y%m%d_%H%M%S).sql
echo "✅ Full DB backed up"

# 4. List current migration count
ls migrations/*.sql | wc -l
echo "migrations before T-0217"
```

**If anything breaks after migrations run:**
```bash
# Restore from backup:
docker compose -f ~/projects/sovereign-health/docker-compose.dev.yml exec -T db \
  psql -U sovereign_health -d sovereign_health < ~/projects/sovereign-health/db_full_backup_YYYYMMDD_HHMMSS.sql
```

---

## ANALYSE FIRST — Current schema state

```bash
# List all tables
docker compose -f ~/projects/sovereign-health/docker-compose.dev.yml exec db \
  psql -U sovereign_health -d sovereign_health -c "\dt" 2>/dev/null

# Check if any of these columns already exist
docker compose -f ~/projects/sovereign-health/docker-compose.dev.yml exec db \
  psql -U sovereign_health -d sovereign_health -c "
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE column_name IN ('client_id', 'idempotency_key', 'deleted_at', 'sync_version', 'updated_at')
    AND table_schema = 'public'
    ORDER BY table_name, column_name;
  "

# Check existing updated_at triggers
docker compose -f ~/projects/sovereign-health/docker-compose.dev.yml exec db \
  psql -U sovereign_health -d sovereign_health -c "
    SELECT trigger_name, event_object_table 
    FROM information_schema.triggers 
    WHERE trigger_name LIKE '%updated_at%'
    ORDER BY event_object_table;
  "

# Check existing indexes
docker compose -f ~/projects/sovereign-health/docker-compose.dev.yml exec db \
  psql -U sovereign_health -d sovereign_health -c "
    SELECT indexname, tablename 
    FROM pg_indexes 
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  " | head -50

# List all existing migrations
ls -la ~/projects/sovereign-health/core-backend/migrations/*.sql | tail -10

# Count total migrations
ls ~/projects/sovereign-health/core-backend/migrations/*.sql | wc -l
```

**Report:**
1. Which tables exist?
2. Do any tables already have `client_id`, `idempotency_key`, `deleted_at`, `updated_at`?
3. Which tables have `updated_at` triggers?
4. How many migrations exist? What's the latest number?

---

## MIGRATION 1: `updated_at` auto-trigger on ALL tables

Every table needs an `updated_at` column that auto-updates on row change. This is essential for sync — the PWA needs to know "what changed since my last sync."

```sql
-- Create the trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at column + trigger to ALL tables that don't have it yet
-- Check each table first. Example pattern:
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        -- Add updated_at if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = tbl.table_name AND column_name = 'updated_at'
        ) THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now()', tbl.table_name);
        END IF;

        -- Add trigger if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE event_object_table = tbl.table_name AND trigger_name = format('trg_%s_updated_at', tbl.table_name)
        ) THEN
            EXECUTE format(
                'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
                tbl.table_name, tbl.table_name
            );
        END IF;
    END LOOP;
END;
$$;
```

**Use `IF NOT EXISTS` / `IF NOT` checks everywhere — migration must be re-runnable without breaking.**

---

## MIGRATION 2: `client_id` for multi-device conflict resolution

When a user has the PWA on phone + laptop, both creating measurements offline, we need to know which device wrote what.

Add `client_id` to tables that accept user-created data:

```sql
-- Tables that need client_id:
-- measurements, measurement_templates, user_settings (if exists), medications, notes

ALTER TABLE measurements ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE measurement_templates ADD COLUMN IF NOT EXISTS client_id TEXT;
-- Add to other user-writable tables found in analysis

-- Index for sync queries: "give me all rows from this client since X"
CREATE INDEX IF NOT EXISTS idx_measurements_client_updated ON measurements(client_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_measurement_templates_client_updated ON measurement_templates(client_id, updated_at);
```

`client_id` is a UUID generated once per device/browser and stored in localStorage. It's sent with every write request.

---

## MIGRATION 3: `idempotency_key` on write-heavy tables

Offline sync will replay queued writes. Without idempotency, the same measurement could be inserted twice.

```sql
-- Add idempotency_key to tables that receive POST/PUT from clients
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;
ALTER TABLE measurement_templates ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;
-- Add to other tables as found

-- Partial unique index (only non-null keys are unique)
-- This allows existing rows without keys to coexist
DROP INDEX IF EXISTS measurements_idempotency_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_measurements_idempotency 
  ON measurements(idempotency_key) WHERE idempotency_key IS NOT NULL;

DROP INDEX IF EXISTS measurement_templates_idempotency_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_measurement_templates_idempotency 
  ON measurement_templates(idempotency_key) WHERE idempotency_key IS NOT NULL;
```

**Backend handling:**
```rust
// On POST /measurements:
// If idempotency_key is provided AND a row with that key exists:
//   → return the existing row (200 OK, not 409 Conflict)
// If idempotency_key is provided AND no row exists:
//   → insert normally
// If idempotency_key is NULL:
//   → insert normally (backward compatible)
```

---

## MIGRATION 4: Soft delete (`deleted_at`)

When a user deletes a measurement on their phone offline, we can't just DELETE the row — other devices need to know it was deleted during sync.

```sql
-- Add soft delete to user-writable tables
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE measurement_templates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
-- Add to other tables as found

-- Index for filtering out deleted rows
CREATE INDEX IF NOT EXISTS idx_measurements_not_deleted ON measurements(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_measurement_templates_not_deleted ON measurement_templates(user_id) WHERE deleted_at IS NULL;
```

**Backend changes:**
```rust
// All SELECT queries must add: WHERE deleted_at IS NULL
// Delete endpoints change from DELETE to:
//   UPDATE measurements SET deleted_at = now() WHERE id = $1 AND user_id = $2

// Add a "purge" admin endpoint for GDPR/actual deletion (runs periodically):
//   DELETE FROM measurements WHERE deleted_at < now() - interval '90 days'
```

**Important:** Add `WHERE deleted_at IS NULL` to ALL existing queries that read measurements, templates, etc. This is the biggest change — grep carefully:

```bash
grep -rn "FROM measurements\|JOIN measurements\|FROM measurement_templates\|JOIN measurement_templates" \
  --include="*.rs" \
  ~/projects/sovereign-health/core-backend/src/ | grep -v target | head -30
```

---

## MIGRATION 5: `sync_version` (monotonic counter for efficient sync)

Instead of comparing timestamps (which can have clock skew issues across devices), use a server-side monotonic version counter:

```sql
-- Global sync version sequence
CREATE SEQUENCE IF NOT EXISTS sync_version_seq;

-- Add sync_version to sync-relevant tables
ALTER TABLE measurements ADD COLUMN IF NOT EXISTS sync_version BIGINT DEFAULT nextval('sync_version_seq');
ALTER TABLE measurement_templates ADD COLUMN IF NOT EXISTS sync_version BIGINT DEFAULT nextval('sync_version_seq');

-- Auto-update sync_version on every change
CREATE OR REPLACE FUNCTION update_sync_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sync_version = nextval('sync_version_seq');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER trg_measurements_sync_version
  BEFORE INSERT OR UPDATE ON measurements
  FOR EACH ROW EXECUTE FUNCTION update_sync_version();

CREATE TRIGGER trg_measurement_templates_sync_version
  BEFORE INSERT OR UPDATE ON measurement_templates
  FOR EACH ROW EXECUTE FUNCTION update_sync_version();

-- Index for sync queries: "give me everything with sync_version > X"
CREATE INDEX IF NOT EXISTS idx_measurements_sync_version ON measurements(sync_version);
CREATE INDEX IF NOT EXISTS idx_measurement_templates_sync_version ON measurement_templates(sync_version);
```

**Sync API pattern (future, not implemented now):**
```
GET /sync/changes?since_version=12345&tables=measurements,templates
→ returns all rows with sync_version > 12345 (including soft-deleted ones)
```

---

## BACKEND: Idempotency middleware (lightweight)

Add to the existing measurement creation handler:

```rust
// In the POST /measurements handler:
if let Some(key) = &body.idempotency_key {
    // Check if this key already exists
    let existing = sqlx::query_as::<_, Measurement>(
        "SELECT * FROM measurements WHERE idempotency_key = $1 AND user_id = $2"
    )
    .bind(key)
    .bind(&user.id)
    .fetch_optional(&pool).await?;

    if let Some(m) = existing {
        return Ok(HttpResponse::Ok().json(m)); // Return existing, don't duplicate
    }
}

// ... normal insert with idempotency_key included
```

---

## IMPORTANT: Write all migrations as ONE migration file

Don't create 5 separate migration files — combine into one:

```
migrations/NNNN_pwa_schema_prep.sql
```

Where NNNN is the next number after the last existing migration. This keeps the migration history clean and makes rollback easier.

**The migration file MUST:**
- Use `IF NOT EXISTS` / `IF NOT` for every DDL statement
- Be re-runnable without errors
- Not drop any existing data
- Not rename any existing columns

---

## Rebuild

```bash
cd ~/projects/sovereign-health

# Backend (migrations + idempotency logic):
docker compose -f docker-compose.dev.yml build backend
docker compose -f docker-compose.dev.yml up -d backend
sleep 10

# Verify migrations ran
docker compose -f docker-compose.dev.yml exec db \
  psql -U sovereign_health -d sovereign_health -c "
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'measurements' 
    AND column_name IN ('client_id', 'idempotency_key', 'deleted_at', 'sync_version', 'updated_at')
    ORDER BY column_name;
  "
# Should show all 5 columns
```

## Verification

- [ ] Migrations backup created before any changes
- [ ] All 5 new columns exist on `measurements` table
- [ ] All 5 new columns exist on `measurement_templates` table
- [ ] `updated_at` trigger fires on all tables (test with manual UPDATE)
- [ ] `sync_version` auto-increments on INSERT and UPDATE
- [ ] `idempotency_key` prevents duplicate inserts (test: POST same key twice → second returns existing)
- [ ] Existing queries filter `WHERE deleted_at IS NULL`
- [ ] Existing API responses still work (no breaking changes)
- [ ] No existing data lost or modified
- [ ] Migration file is re-runnable (run it twice — no errors)
- [ ] `migrations_backup_*` folder exists with pre-change copies

## DO NOT

- Do NOT touch `/app/settings/` — FROZEN
- Do NOT deploy to VPS
- Do NOT use `npm run dev`
- Do NOT drop any existing tables, columns, or data
- Do NOT create separate migration files for each change — one file
- Do NOT modify the sync API yet (that's T-0208, Phase 2)
