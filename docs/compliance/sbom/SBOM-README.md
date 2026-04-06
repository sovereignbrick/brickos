# Software Bill of Materials (SBOM)

## What is an SBOM?

A Software Bill of Materials is a formal, machine-readable inventory of all
software components and dependencies used in a product. It lists each
component's name, version, supplier, and relationship to other components.

## Why it matters -- EU Cyber Resilience Act (CRA)

The EU Cyber Resilience Act (Regulation 2024/2847) requires manufacturers and
distributors of products with digital elements to:

- Identify and document all components in their software supply chain
- Provide an SBOM to downstream users upon request
- Monitor known vulnerabilities in listed components
- Deliver security updates for the product's expected lifetime

The CRA enters full application in December 2027. Preparing SBOMs now ensures
Sovereign Health is ready well ahead of enforcement.

## Current format

These SBOMs are plain-text dependency listings at depth 0 (direct dependencies
only). This is sufficient for internal tracking and early compliance work.

**Future target formats:**
- CycloneDX 1.6 (JSON) -- recommended for vulnerability correlation
- SPDX 2.3 -- recommended for license compliance

Tools like `cargo-sbom`, `syft`, or `cdxgen` can generate these formats once
the pipeline matures.

## Files in this directory

| File | Contents |
|------|----------|
| `rust-dependencies.txt` | Direct Rust/Cargo dependencies for sovereign-health-backend |
| `npm-dependencies.txt` | Direct npm/pnpm dependencies for sovereign-health-frontend |
| `SBOM-README.md` | This file |

## How to regenerate

### Rust dependencies

```bash
cargo tree -p sovereign-health-backend --depth 1
```

For full CycloneDX output (requires cargo-sbom):
```bash
cargo install cargo-sbom
cargo sbom -p sovereign-health-backend --output-format cyclonedx_json_1_6
```

### Frontend dependencies

```bash
cd apps/health/sovereign-health/frontend
pnpm list --depth 0
```

For full CycloneDX output (requires cdxgen):
```bash
npx @cyclonedx/cdxgen -o sbom-frontend.json
```

## When to regenerate

- **Every release** -- include updated SBOMs in release artifacts
- **After dependency updates** -- Dependabot PRs, manual upgrades
- **Before security audits** -- provide current inventory to auditors
- **Quarterly at minimum** -- even without changes, re-validate

## Scope

These SBOMs cover direct (depth 0) dependencies only. Full transitive
dependency trees can be generated with `--depth 999` (Cargo) or
`--depth Infinity` (pnpm) but are typically only needed for vulnerability
scanning pipelines.

Workspace crates (brickos-auth, brickos-billing, brickos-crypto, brickos-db,
brickos-email, sovereign-link) are first-party code and listed for
completeness. Their own transitive dependencies are included in a full tree.
