# CLAUDE.md -- BrickOS Platform

## Organization
- **Organization:** Sovereign Brick
- **Platform brand:** BrickOS
- **GitHub org:** github.com/sovereignbrick
- **Primary domain:** brickos.io

## Monorepo Structure
This is a Cargo workspace (Rust) + pnpm workspace (Node) monorepo.
- `platform/` -- Core services (auth, billing, backup gateway)
- `crates/` -- Shared Rust crates (imported by all app APIs)
- `packages/` -- Shared React packages (imported by all frontends)
- `apps/{pillar}/{product}/` -- Individual applications organized by pillar
- `ops/` -- Platform-wide deploy scripts
- `docs/` -- Platform-wide documentation
- `docs/design/` -- Numbered design documents (001-004+)

## 7 Pillars of Sovereign Life
Apps are organized into pillars: Finance, Health, Data, Attention, Energy + foundation layers Technology & Privacy, Family & Community.
- `apps/finance/` -- Exchange, BTC Tracker, Vote, Cashu Mint
- `apps/health/` -- Sovereign Health (SHI)
- `apps/data/` -- Sovereign Proposal Platform (SPP)
- `apps/attention/` -- Sovereign Signal
- `apps/energy/` -- Sovereign Almanac
- `apps/infrastructure/` -- Sovereign Link, Identity, NOSTR Relay
- `apps/governance/` -- Sovereign Vote
- `apps/distribution/` -- Zapstore relay

## Key Commands
```bash
# Rust
cargo build                              # Build all crates
cargo test -p sovereign-health-api       # Test one app
cargo fmt && cargo clippy -- -D warnings # Lint

# Node
pnpm install                             # Install all deps
pnpm --filter sovereign-health-frontend build  # Build one app

# Deploy
bash apps/health/sovereign-health/ops/deploy.sh staging
bash apps/health/sovereign-health/ops/deploy.sh production --confirm
```

## Conventions
- All text through i18n (EN + DE minimum)
- No hardcoded strings
- Docker-only development (never run directly)
- Migrations: IF NOT EXISTS / ON CONFLICT DO NOTHING
- Pre-push: cargo fmt + clippy + tests
- Commit messages: conventional commits (feat:, fix:, docs:, etc.)
