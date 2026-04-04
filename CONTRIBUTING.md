# Contributing to BrickOS

Thank you for your interest in contributing to BrickOS! This guide will help you get started.

## Development Setup

### Prerequisites

- **Rust** 1.80+ (with `rustls` -- no OpenSSL/libssl-dev required)
- **Node.js** 22+ with **pnpm**
- **Docker** + Docker Compose
- **PostgreSQL** 16 (via Docker -- includes pgAudit extension)

### Clone and Build

```bash
git clone https://github.com/sovereignbrick/brickos.git
cd brickos

# Backend
cargo build
cargo test --test smoke

# Frontend
cd apps/health/sovereign-health/frontend
pnpm install
pnpm build

# Full stack (Docker)
cd ../ops
docker compose -f docker-compose.dev.yml up -d
```

## Workflow

1. **Fork** the repository
2. **Branch** from `develop` (never from `main`)
3. **Make changes** following the conventions below
4. **Test** locally: `cargo fmt && cargo clippy -- -D warnings && cargo test`
5. **Build frontend**: `pnpm build` (catches TypeScript errors)
6. **Submit a Pull Request** against `develop`

## Code Conventions

### Rust

- Format: `cargo fmt`
- Lint: `cargo clippy -- -D warnings` (zero warnings policy)
- Migrations: use `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`
- Never modify already-applied migrations -- create new ones
- Use `runtime-tokio-rustls` for SQLx (no native-tls/OpenSSL)

### TypeScript / React

- Lint: `pnpm lint`
- All UI text must go through i18n (`useTranslations()`) -- **no hardcoded strings**
- Minimum two languages: English + German
- Dark theme is default -- never add white backgrounds to form elements
- Use `cn()` from `lib/utils.ts` for conditional Tailwind classes

### Commit Messages

Use [conventional commits](https://www.conventionalcommits.org/):

```
feat: add biomarker trend comparison
fix: marker matcher false positive on short aliases
docs: update deployment guide
refactor: extract unit conversion to shared utility
test: add integration tests for import rollback
style: cargo fmt
chore: bump dependencies
```

### Pre-Push Checklist

```bash
cargo fmt
cargo clippy --all-targets -- -D warnings
cargo test -p sovereign-health-backend
cd apps/health/sovereign-health/frontend && pnpm build
```

## Architecture

- `crates/` -- Shared Rust libraries used by all apps
- `packages/` -- Shared React/Node packages
- `apps/{domain}/{product}/` -- Individual applications
- `docs/tracker/issues/` -- Local-first issue tracker

Each app has its own `CLAUDE.md` with detailed development context.

## What to Contribute

- **Bug fixes** -- check `docs/tracker/issues/open/` for known issues
- **Translations** -- add or improve i18n translations (DE priority)
- **Documentation** -- improve READMEs, add code comments where logic is non-obvious
- **Tests** -- increase coverage, especially integration and E2E tests
- **Security** -- see [SECURITY.md](SECURITY.md) for responsible disclosure

## License

By contributing, you agree that your contributions will be licensed under [AGPL-3.0](LICENSE).
