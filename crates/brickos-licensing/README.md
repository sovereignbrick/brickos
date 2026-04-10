# brickos-licensing

The single source of truth for tier resolution, feature gates, and signed RS256 license certificates across all BrickOS apps.

> **Status:** skeleton landed in Sprint 040 issue #462. Full implementation in #464 (runtime), #465 (effective tier resolver), #466 (RS256 JWT), #467 (SHI facade refactor).

See [docs/design/022-licensing-model.md](../../docs/design/022-licensing-model.md) for the complete architecture.

## Two execution modes

```rust
use brickos_licensing::{embedded::EmbeddedProvider, client::ClientProvider};

// Inside brickos-platform-api -- direct DB reads, no HTTP overhead
let provider = EmbeddedProvider::new(brickos_pool.clone());

// Inside SHI / CRM / Sovereign Link -- HTTP + local cache
let provider = ClientProvider::new(
    "https://platform.brickos.io".to_string(),
    config.service_account_token.clone(),
    "/var/lib/sovereign-health/licensing-cache".into(),
);
```

Both modes implement the same trait-shaped API. Tests use the embedded mode against an in-memory test DB.

## Offline cache (370-day grace)

Client-mode apps cache feature_registry, tier_definitions, and active org_licenses locally. If the platform API is unreachable for up to **370 days**, the cached data continues to be honored. After 370 days the app falls back to Glimpse with a banner. This makes the system safe for self-hosted deployments and tolerant of platform outages.

See design 022 §4.4 for the full freshness rules.

## Key management

License certificates are signed with **RS256** -- asymmetric, so the customer who validates can never forge.

### Production keys (one-time setup)

```bash
# Generate production keypair (ONCE, on a secure machine)
openssl genpkey -algorithm RSA -out license_signing_key.pem -pkeyopt rsa_keygen_bits:2048
openssl pkey -in license_signing_key.pem -pubout -out license_public_key.pem

# Store the PRIVATE key in 1Password Business under "BrickOS / License Signing Key (PROD)"
# - copy the PEM contents into a secure note
# - delete the local file: shred -u license_signing_key.pem

# Commit the PUBLIC key to this repo
mv license_public_key.pem crates/brickos-licensing/keys/license_public_key.pem
git add crates/brickos-licensing/keys/license_public_key.pem
git commit -m "chore(licensing): add production license public key"
```

The public key is then embedded in every binary via `include_str!` (or loaded at startup from disk for self-hosted instances).

### Dev keys (already committed)

For local development and unit tests, a dev keypair is included:

| File | Status |
|---|---|
| `keys/dev_public_key.pem` | committed |
| `keys/dev_signing_key.pem` | **gitignored** (regenerate locally if needed) |

To regenerate the dev keypair locally:

```bash
cd crates/brickos-licensing/keys
openssl genpkey -algorithm RSA -out dev_signing_key.pem -pkeyopt rsa_keygen_bits:2048
openssl pkey -in dev_signing_key.pem -pubout -out dev_public_key.pem
git add dev_public_key.pem
```

Unit tests in `src/jwt.rs` generate ephemeral keypairs on the fly using the `rsa` crate -- they don't need the on-disk keys, so a fresh `cargo test` works without any setup.

### Key rotation

Per design 022 §5.6: when rotating, generate the new keypair, ship the new public key in the next release, sign new licenses with the new private key, accept BOTH old and new public keys for a 6-month transition window, then remove the old public key.

## Feature namespace convention

All features are namespaced by app slug:

| Namespace | App | Examples |
|---|---|---|
| `shi.*` | Sovereign Health Intelligence | `shi.csv_export`, `shi.pdf_reports` |
| `crm.*` | Sovereign CRM | `crm.lead_capture`, `crm.audio_recording` |
| `link.*` | Sovereign Link | `link.api_access`, `link.custom_domains` |
| `signal.*` | Sovereign Signal | (TBD) |
| `voice.*` | Sovereign Voice | (TBD) |
| `branding.*` | Cross-app branding | `branding.custom_logo`, `branding.custom_domain` |
| `support.*` | Cross-app support tier | `support.email`, `support.priority`, `support.sla_24x7` |

A feature must be registered in `brickos.feature_registry` exactly once before any tier can include it. See design 022 §4.5.

## Public API

### Types

- `LicenseClaims` -- JWT claims (iss, sub, aud, iat, exp, nbf, jti, org_name, tier, features, max_owners/practitioners/members, billing_model)
- `LicenseInput` -- input struct for `generate_license`
- `EffectiveTier` -- result of resolving a user's tier in an org context
- `LicenseSource` -- where the effective tier came from (UserLicense, GracePeriod, AdminOverride, OrgLicense, SelfHosted, Default)
- `TierFeature` -- single tier_features row with limit + i18n labels
- `OrgContext` -- Individual or Org(uuid)
- `LicensingError` -- thiserror enum

### Functions

- `jwt::generate_license(input, private_key_pem) -> (token, jti)`
- `jwt::validate_license(token, public_key_pem, expected_audience) -> LicenseClaims`

### Constants

- `INDIVIDUAL_ORG_UUID` -- the fixed UUID of the platform-wide individual pseudo-org
- `VERSION` -- crate version

## Tests

```bash
cargo test -p brickos-licensing
```

The tests in `src/jwt.rs` cover the full validation chain:
- generate + validate roundtrip
- audience mismatch rejection
- audience match (one-of-many)
- empty audience skips check
- expired license rejected
- wrong public key rejected
- jti unique across calls
