# BrickOS Licensing — Developer Guide

> Sprint 040 #487. design 022 §11–§12. This is the developer-facing reference for
> the brickos-licensing system: how features, tiers, and org licenses fit together,
> and how to use them from inside a BrickOS app.

## Mental model

```
brickos.feature_registry      ← every feature, namespaced (shi.csv_export, crm.lead_capture, …)
        │
        ▼
brickos.tier_features         ← which tier includes which feature, with limit values
        │
        ▼
brickos.org_licenses          ← signed RS256 JWT per org with tier_slug + features array
        │                       + max_owners / max_practitioners / max_members
        ▼
EmbeddedProvider.has_feature  ← runtime check inside an app handler
```

Two facts:
1. **Features are flat strings.** `shi.csv_export`, `crm.lead_capture`, `branding.custom_domain` — no enums, no enums in code.
2. **The org JWT is the source of truth at runtime.** The tier_features table is only read at issue time. Once a JWT is signed, its `features` array is what counts until the JWT expires, gets revoked, or gets replaced.

## Schema crash course

| Table | Schema | Owns |
|---|---|---|
| `brickos.feature_registry` | brickos | Master catalogue of every feature in every app |
| `brickos.tier_features` | brickos | Tier → feature mapping with limit_value + i18n labels |
| `brickos.license_tiers` | brickos | The tier definitions (slug, name, app_key) |
| `brickos.org_licenses` | brickos | Active + historic licenses, one row per issuance |
| `brickos.org_licenses_revoked` | brickos | Revocation list, polled every 60s |
| `brickos.admin_audit_log` | brickos | Every admin mutation to licensing state |

## How to add a new feature

1. Pick a namespaced slug. Apps own a namespace: `shi.*`, `crm.*`, `link.*`. Cross-app features use `branding.*` / `support.*` and `app_slug = '_platform'`.

2. Insert into `brickos.feature_registry`:
   ```sql
   INSERT INTO brickos.feature_registry
     (slug, app_slug, category, name_en, name_de, description_en, description_de, is_active)
   VALUES
     ('crm.fancy_thing', 'sovereign-crm', 'data',
      'Fancy thing', 'Tolles Ding',
      'Does the fancy thing.', 'Macht das tolle Ding.', true);
   ```
   Categories used today: `data`, `reporting`, `ai`, `security`, `integrations`, `branding`, `support`, `communication`. Add new ones as needed — there is no enum.

3. Map it to one or more tiers in `brickos.tier_features`:
   ```sql
   INSERT INTO brickos.tier_features
     (tier_slug, feature_slug, included, limit_value, limit_label_en, limit_label_de)
   VALUES
     ('horizon', 'crm.fancy_thing', true, NULL, 'unlimited', 'unbegrenzt'),
     ('focus',   'crm.fancy_thing', true, 100,  '100/month', '100/Monat');
   ```
   `limit_value = NULL` means the feature is included without a numeric cap. `included = false` means the feature exists in the registry but is not part of the tier.

4. Reference it from code:
   ```rust
   if licensing.has_feature(org_id, "crm.fancy_thing").await? {
       // gated branch
   }
   ```
   The string is the contract — there is intentionally no constant per feature. A typo in the slug is a bug; the matrix test (see Testing) catches divergence between code and seed.

5. Reseed any test fixtures and re-run the matrix test.

## How to add a new tier

1. Insert into `brickos.license_tiers`:
   ```sql
   INSERT INTO brickos.license_tiers
     (slug, name, description, app_key, sort_order, is_active)
   VALUES
     ('hyperion', 'Hyperion', 'Top-tier package', 'sovereign-health', 100, true);
   ```

2. Bulk-insert the tier_features rows for every feature this tier should include. The seed migration patterns (`011_roles_consolidation_canonical_seed.sql`, `012_register_crm_link_features.sql`) are good templates.

3. Add the tier to the locked decisions table in design 022 §2.2 if it should be a public option.

4. Tier editing via the admin GUI is intentionally not supported in Sprint 040 — tiers are owned by migrations so they get code review.

## Embedded vs client mode

The brickos-licensing crate has two modes:

- **Embedded** (`EmbeddedProvider`): the licensing crate runs inside an app binary that has direct access to the brickos PostgreSQL pool. Used by SHI today via the `PlatformPool` newtype. All queries (tier resolution, has_feature, issue_org_license, revoke_org_license) hit the DB directly.

- **Client** (`ClientProvider`): the licensing crate runs inside an app binary that talks to a separate `brickos-platform-api` HTTP service over HTTPS. The client caches the active org license JWT locally with a 370-day grace window so a temporary platform-api outage doesn't break runtime enforcement.

Pick embedded when you have direct DB access (e.g. SHI today). Pick client when the app is a separate service that should not depend on platform DB credentials.

## Cache freshness rules

- **Revocation list:** the embedded provider polls `brickos.org_licenses_revoked` every 60 seconds. A revoked license is enforced within 60s of the revoke API call.
- **Active license cache:** the embedded provider caches the active org license per org for 60 seconds. A new issuance via `issue_org_license()` invalidates that org's cache entry inside the same transaction.
- **Client mode 370-day grace:** the client provider keeps the last-known good JWT on disk and treats it as valid for up to 370 days past the original `iat` claim, even if the platform-api is unreachable. The grace window is wider than the normal exp claim so a long platform outage still leaves apps functional.

## RS256 keypair management

- **Dev keys:** `crates/brickos-licensing/keys/dev_*.pem`. Committed to the repo. Never use these in production.
- **Production keys:** Stored in 1Password Business under `brickos-licensing-prod`. Loaded at app startup via `Config::license_signing_key_path` (env var `LICENSE_SIGNING_KEY_PATH`).
- **Public key distribution:** Apps that only need to validate JWTs (not issue them) can use the public key shipped at `crates/brickos-licensing/keys/dev_public_key.pem` for dev, and the production public key for staging/prod. The public key is safe to commit alongside other config.
- **Rotation procedure:**
  1. Generate a new RSA-3072 keypair.
  2. Push the new public key to all apps first (rolling deploy).
  3. Wait until every app is on the new public key.
  4. Switch the issuer (platform admin) to sign with the new private key.
  5. Old JWTs signed with the previous key remain valid until they naturally expire.

## Testing patterns

### Tier × feature matrix test

Lives in `apps/health/sovereign-health/api/tests/tier_feature_matrix_test.rs`. Asserts that the legacy SHI tier.rs path and the new brickos-licensing path return identical answers for every (tier, feature) pair across the entire matrix. This is the regression anchor for all licensing changes.

```bash
TEST_DATABASE_URL=postgres://... cargo test -p sovereign-health-backend --test tier_feature_matrix_test
```

### brickos-licensing embedded runtime test

Lives in `crates/brickos-licensing/tests/embedded_runtime.rs`. Spins up an ephemeral postgres, applies the brickos-db migrations, issues a license, validates it, revokes it, and asserts the truth table for every tier_features row.

```bash
TEST_DATABASE_URL=postgres://... cargo test -p brickos-licensing --test embedded_runtime
```

### Stripe webhook contract test

For #481 manual invoices: when a Stripe webhook fires for `invoice.paid`, the SHI billing handler updates the matching `org_invoices` row. The contract test in `apps/health/sovereign-health/api/tests/webhook_contract.rs` posts a signed fake event and asserts the row transition.

### Playwright E2E

`apps/health/sovereign-health/frontend/e2e/suite-licensing-journeys.spec.ts` covers the four journey definitions from design 022 §13.5 M12. Journeys 3 and 4 require the two-pool E2E env (#491) which is still under construction.

## Common pitfalls

- **Don't bypass the JWT.** A handler that reads `brickos.tier_features` directly will fall out of sync with the issued JWT the moment a per-customer override is applied. Always go through `EmbeddedProvider::has_feature` (which reads the JWT, not the table).

- **Don't query the org table from the wrong pool.** SHI uses two pools: `pool` for SHI app data, `platform_pool` for everything in `brickos.*`. A query against the wrong pool either fails outright (in production two-pool) or silently hits a stale local copy (in single-DB dev). The matrix test catches the most common cases.

- **Don't add a feature to a tier without thinking about backward compatibility.** Existing JWTs are immutable until they expire. If you add a feature to the `focus` tier, existing focus customers won't get it until their license is reissued. For that reason, runtime feature checks should default to "yes" for grandfathered JWTs unless the feature is genuinely new.

- **Don't rename a feature slug.** The slug is the contract. Renaming requires a full re-issuance pass for every active license. Add a new slug, mark the old one `is_active = false`, and migrate the code.

## References

- design 022 (`docs/design/022-brickos-licensing-model.md`)
- Sprint 040 lessons (`docs/sprint-planning/sprints/sprint-040-lessons.md`)
- crate readme: `crates/brickos-licensing/README.md`
- migration patterns: `crates/brickos-db/migrations/009_licensing_foundation.sql`,
  `crates/brickos-db/migrations/011_roles_consolidation_canonical_seed.sql`,
  `crates/brickos-db/migrations/012_register_crm_link_features.sql`
