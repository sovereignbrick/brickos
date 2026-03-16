# Contributing to BrickOS

Thank you for your interest in contributing to BrickOS!

## Quick Start

1. Fork and clone the repository
2. Create a feature branch from `develop`
3. Make your changes
4. Run tests: `cargo test` and `pnpm test`
5. Submit a Pull Request

## Code Style

- Rust: `cargo fmt` + `cargo clippy -- -D warnings`
- TypeScript: ESLint + Prettier (via pnpm lint)
- All UI text must use i18n (EN + DE)

## Commit Messages

Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `ci:`

## License

By contributing, you agree that your contributions will be licensed under AGPL-3.0.
