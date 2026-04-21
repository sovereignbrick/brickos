# Localhost Test Runbook

**Sprint:** 048
**Script:** `apps/health/sovereign-health/ops/localhost-stack.sh`

This runbook is how you verify a change before committing to develop
or deploying to staging. No commit, no PR, no deploy without a green
`localhost-stack.sh test` run.

## One-time setup

Prereqs on the dev machine:

- Docker + Docker Compose (daemon running, user in `docker` group)
- Rust toolchain via `rustup` (stable)
- Node 22 + pnpm (via corepack or volta)
- Python 3 with `argon2-cffi` installed (for fixture password-hash
  regeneration: `pip install argon2-cffi`)

## Daily loop

```bash
cd ~/Projects/brickos

# 1. Bring up the stack (idempotent). First run takes ~2 min for
#    the Rust backend build; subsequent runs are seconds.
bash apps/health/sovereign-health/ops/localhost-stack.sh up

# 2. Work. Edit code, save.

# 3. Run the full suite. Exits non-zero on any failure.
bash apps/health/sovereign-health/ops/localhost-stack.sh test

# 4. Commit only if step 3 returned 0.
```

If the postgres data gets into a weird state:

```bash
# Destructive: drops the postgres volume, restarts, re-applies
# migrations, re-seeds fixtures.
bash apps/health/sovereign-health/ops/localhost-stack.sh reset
```

## Commands

| Command | Purpose |
|---|---|
| `up` | Start docker compose, wait for health, seed fixtures. Idempotent. |
| `down` | Stop containers. Data volumes preserved. |
| `reset` | Destructive: drop postgres volume, rebuild, re-seed. ~2 min. |
| `seed` | Apply fixtures only. Assumes stack is up. |
| `test` | Full suite: fmt, clippy, cargo integration/property/smoke, pnpm tsc, vitest, Playwright. |
| `logs [svc]` | Tail compose logs (optionally scoped to `postgres`, `backend`, `frontend`, `website`). |
| `status` | Container + port summary. |

## What `test` actually runs

In order, fail-fast:

1. `cargo fmt --all --check`
2. `cargo clippy -p sovereign-health-backend --all-targets -- -D warnings`
3. `cargo test -p sovereign-health-backend --test integration --test property --test smoke`
4. `pnpm tsc --noEmit` in `apps/health/sovereign-health/frontend`
5. `pnpm vitest run` in the same
6. Playwright against `http://localhost:3000`:
   - `sprint-047-url-routing.spec.ts` (25 tests)
   - `sprint-047-admin-coverage.spec.ts` (~120 listings, unauth probe variant)
   - `health.spec.ts`

Total runtime on a warm machine: ~90 s. Cold start (fresh `reset`) adds
~2 min for the Rust backend build.

## Fixtures

Five patient users seeded into the `test-clinic` org via SQL in
`apps/health/sovereign-health/ops/fixtures/`:

| User | Email | Password | Role | Risk profile |
|---|---|---|---|---|
| Test Clinic Admin | test-clinic-admin@clinic.com | TestClinicAdmin1 | org_owner | n/a |
| Anna Meier | anna.meier@patients.clinic.com | TestPatient1 | member | optimized |
| Bert Schmidt | bert.schmidt@patients.clinic.com | TestPatient1 | member | average |
| Carla Schulz | carla.schulz@patients.clinic.com | TestPatient1 | member | at_risk (metabolic) |
| Dieter König | dieter.koenig@patients.clinic.com | TestPatient1 | member | average (placeholder cardio) |
| Eva Lange | eva.lange@patients.clinic.com | TestPatient1 | member | sparse (3 data points) |

Measurements are cloned from the matching demo-profile user
(`optimized@sovereignhealth.io`, `average@sovereignhealth.io`,
`atrisk@sovereignhealth.io`) so each patient has a realistic 90-day
history without needing to hand-write test data.

Fixture files are numbered and applied in order:

- `001_test_clinic_org.sql` -- creates the org
- `002_test_users.sql` -- creates admin + 5 patient users + org_members
- `003_test_measurements.sql` -- clones measurements per profile

To add more fixtures, create `004_*.sql` etc. The seed command picks
them up automatically.

## Known-flaky vitest specs (excluded)

Three specs are skipped by `localhost-stack.sh test` because they
fail on machines that don't match the implicit assumptions:

- `src/lib/date-format.test.ts` -- hardcodes `Europe/Berlin`
  timezone; fails with an hour offset on any other TZ.
- `src/lib/dark-theme.test.ts` -- static grep scan with known false
  positives on legitimate classes (`bg-white/5`, etc.).
- `src/lib/i18n-completeness.test.ts` -- flags DE values identical
  to EN as "untranslated" when they are legitimately the same word
  (brand names, abbreviations).

Running vitest without the exclusion flags surfaces them. Track the
fix as Sprint 049+ cleanup.

## Troubleshooting

**Backend not ready after 120s:**
```bash
bash apps/health/sovereign-health/ops/localhost-stack.sh logs backend | tail -50
```
Common causes: migration failure, `.env` missing a required var,
postgres not yet ready. Check for a `sqlx::migrate!` error line.

**Fixture apply fails on `ON CONFLICT`:**
The seed is written to be idempotent. If it errors, it means a
constraint (unique index, check constraint) changed without the
fixture being updated. Read the psql output, update the SQL, re-run
`seed`.

**Playwright against localhost times out:**
Check that the frontend container is up and answering at
`http://localhost:3000/login`. If it returns HTML but the test fails
on assertion, it's likely that the app needs the backend to respond
-- check that `/health` returns `{"status":"ok", ...}`.

**Argon2 hash regeneration:**
```bash
python3 -c "from argon2 import PasswordHasher; print(PasswordHasher().hash('YOUR_PASSWORD'))"
```
Paste into the fixture SQL. Shell $ expansion eats the `$` characters
-- always pipe via stdin or use single-quoted SQL.

## When to run which

| Change type | Required before commit | Required before staging deploy | Required before prod promote |
|---|---|---|---|
| Docs only | -- | -- | -- |
| Backend SQL migration | `test` on clean `reset` | staging RC | prod RC |
| Backend handler / route | `test` | staging RC | prod RC |
| Frontend UI only | `test` | staging RC | prod RC |
| nginx config | `test` + manual nginx reload test | staging RC | prod RC |
| Deploy script | `test` + dry run against staging | staging RC | prod RC |
