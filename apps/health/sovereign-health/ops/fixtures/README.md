# ops/fixtures/ — Deterministic Test Data

SQL seed scripts that populate a known-good test org (`test-clinic`)
with 6 users and measurement histories. Run by
`ops/localhost-stack.sh seed` on local dev and applied directly via
`docker exec ... psql` on staging when the data needs to match.

## Files

| File | What it seeds |
|---|---|
| `001_test_clinic_org.sql` | The `test-clinic` org (slug `test-clinic`, name "Test Clinic", branding) |
| `002_test_users.sql` | 1 org_owner (`test-clinic-admin@clinic.com`) + 5 patients (Anna/Bert/Carla/Dieter/Eva) + their `org_members` rows |
| `003_test_measurements.sql` | Clones 90-day measurement histories from the `optimized` / `average` / `at_risk` demo-profile users into each patient per their risk profile |

## Conventions (Sprint 048 #048-01)

### 1. Idempotent

Every `INSERT` uses `ON CONFLICT` so the seed can run repeatedly
without duplicating rows or failing mid-way:

- `ON CONFLICT (slug) DO NOTHING` on `organizations`
- `ON CONFLICT (email) DO UPDATE SET ...` on `users` (resets
  password hash, display_name, email_verified to fixture values)
- `ON CONFLICT (user_id, org_id) DO NOTHING` on `org_members`
- Measurements: `DELETE WHERE user_id = ...; INSERT ...` so a
  re-run is a clean reseed

### 2. Business-key lookups, not UUIDs

Early versions (pre-Sprint 048 RC) hardcoded fixture UUIDs in every
INSERT. That broke on staging where the same logical entities
already existed with different UUIDs. Current convention:

- The `users` INSERT sets a deterministic UUID for *new* rows, but
  the `ON CONFLICT (email) DO UPDATE` branch preserves whatever
  UUID staging already assigned.
- Every downstream reference uses a subquery or CROSS JOIN on a
  stable business key (email for users, slug for orgs):

  ```sql
  INSERT INTO org_members (id, user_id, org_id, role, joined_at)
  SELECT gen_random_uuid(), u.id, o.id, 'member', ...
    FROM users u
    CROSS JOIN organizations o
   WHERE o.slug = 'test-clinic'
     AND u.email IN ('anna.meier@patients.clinic.com', ...)
  ON CONFLICT (user_id, org_id) DO NOTHING;
  ```

Result: the same fixture file runs cleanly on a fresh localhost DB
AND on a months-old staging DB with random UUIDs, without edits.

### 3. Schema-agnostic

Tables unqualified. Relies on the DB's `search_path` including both
`public` and `brickos` (per ADR-035 platform schema elevation). On
localhost, platform tables live in `public`; on staging,
`organizations` / `users` / `org_members` live in `brickos`. The
unqualified references resolve to whichever schema has the table.

**Do not schema-qualify** (`brickos.users`, `public.users`) -- that
breaks portability. If you must qualify, use `to_regclass` probes
like migration `20260421000001_sprint048_reconcile_org_members_role_check.sql`.

### 4. Source demo users must exist

`003_test_measurements.sql` clones from `optimized@sovereignhealth.io`
/ `average@sovereignhealth.io` / `atrisk@sovereignhealth.io`. These
are created by the `20240401000001_bootstrap_demo_users.sql` seed
migration (runs automatically on `migrate`). If any demo user is
missing, `003` emits a `RAISE NOTICE` and no-ops instead of failing.

### 5. Columns that don't exist, don't name

The original `003` referenced a `source_type` column on
`measurements` that never existed in the live schema; the INSERT
threw on staging. Fixed in `fc7235f`. When cloning columns between
tables, copy the exact column list from `\d <table>`, not from
memory.

## Running the fixtures

### Localhost (via the stack runner)

```bash
bash apps/health/sovereign-health/ops/localhost-stack.sh seed
```

### Staging / production (manual, with backup first)

```bash
# 1. Backup
ssh root@<vps> "docker exec sh-staging-db pg_dump -U sovereign_health \
  -d sovereign_health_staging > /opt/sovereign-health/backups/manual_$(date +%s).sql"

# 2. Apply in order
for f in 001_test_clinic_org.sql 002_test_users.sql 003_test_measurements.sql; do
  cat "apps/health/sovereign-health/ops/fixtures/$f" \
    | ssh root@<vps> 'docker exec -i sh-staging-db psql \
        -U sovereign_health -d sovereign_health_staging -v ON_ERROR_STOP=1'
done
```

Production is identical but against `sovereign_health` (no
`_staging` suffix). Don't apply the fixtures to production unless
explicitly requested -- they're for staging RC walk-throughs and
localhost dev. Production real customer data stays untouched.

## Expected state after seed

After a clean run on any environment:

- 1 `organizations` row with `slug = 'test-clinic'`
- 1 user `test-clinic-admin@clinic.com` (password `TestClinicAdmin1`) with role `org_owner` in test-clinic
- 5 user `{anna.meier,bert.schmidt,carla.schulz,dieter.koenig,eva.lange}@patients.clinic.com` (all password `TestPatient1`) each with role `member` in test-clinic
- Anna has ~920 measurements (optimized profile)
- Bert, Carla, Dieter each have ~440 measurements
- Eva has 3 measurements (sparse-data edge case)

Passwords are argon2id hashes committed to the repo -- they're
fixture passwords only, safe to publish. Production credentials
are in 1Password.

## Related

- `apps/health/sovereign-health/api/migrations/` — the real schema
  migrations. Fixtures depend on these being applied first.
- `apps/health/sovereign-health/frontend/e2e/sprint-048-impersonation.spec.ts`
  — Playwright spec that runs against whatever fixture state is
  seeded (localhost or staging), looking up IDs by business key.
- ADR-035 — why platform tables live in `brickos` schema on
  staging/prod.
- ADR-052 — effective-user swap (requires the patient_consents
  rows that the Sprint 048 spec creates via the API, not via
  fixtures).
