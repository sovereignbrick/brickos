---
number: 462
github_number: 403
title: "feat: brickos-licensing crate skeleton + RS256 keypair"
milestone: "SHI Licensing Foundation -- Sprint 040"
labels: [licensing, sprint-040, phase-a, feature]
created: 2026-04-10
priority: P0
sprint: 040
phase: A
design: 022
estimate: 0.75d
---

Bootstrap the new shared `crates/brickos-licensing/` crate that all BrickOS apps will depend on.

## Scope

- [ ] `crates/brickos-licensing/Cargo.toml` with rustls (no native-tls per project rules)
- [ ] `src/lib.rs` with public traits: `LicensingProvider`, `EffectiveTier`, `LicenseClaims`
- [ ] `src/embedded.rs` (stub) -- direct DB reads against brickos schema
- [ ] `src/client.rs` (stub) -- HTTP client + local cache
- [ ] `src/jwt.rs` -- generate/validate with RS256 (jsonwebtoken crate)
- [ ] Generate RS256 keypair (`license_signing_key.pem` private, `license_public_key.pem` public)
- [ ] Store private key in 1Password Business (manual step, document in README)
- [ ] Embed public key in build artifact via `include_str!` (placeholder until real key set)
- [ ] Unit tests: keygen roundtrip, signature verification
- [ ] Add to workspace `Cargo.toml`
- [ ] Add `crates/brickos-licensing/` COPY lines to all relevant Dockerfiles per `feedback_dockerfile_new_crates.md`

## Verification

- [ ] `cargo build -p brickos-licensing` succeeds
- [ ] `cargo test -p brickos-licensing` green
- [ ] `cargo clippy -p brickos-licensing -- -D warnings` clean
- [ ] Public key in artifact matches private key (signature roundtrip)

## References

- design 022 §4.3, §5.6
- Memory: `feedback_dockerfile_new_crates.md` -- every new crate needs Dockerfile COPY lines
- Memory: `feedback_jsonwebtoken_v10_crypto.md` -- jsonwebtoken v10 needs CryptoProvider::install_default()
