# Contributing to Sovereign Health

## How to Contribute

### Reporting Bugs

Open a GitLab issue with steps to reproduce, browser, OS, and Docker version.

### Code Contributions

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Run checks:
   - Backend: `cargo fmt && cargo clippy && cargo test`
   - Frontend: `npm run lint && npm run build`
4. Commit with a descriptive message
5. Open a merge request

### Code Style

- Rust: rustfmt defaults
- TypeScript/React: ESLint config
- SQL: descriptive migration filenames, never modify existing migrations
- No em dashes in user-facing text

### Knowledge Base Contributions

Marker descriptions, food recommendations, supplement info, and protocol effects welcome. Medical accuracy required. Do not invent references.

## Development Setup

### Backend

```bash
cd core-backend && cp .env.example .env && cargo run
```

### Frontend

```bash
cd core-frontend && cp .env.example .env.local && npm install && npm run dev
```

### Database

```bash
docker run -d --name sh-postgres \
  -e POSTGRES_USER=sovereign \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=sovereign_health \
  -p 5432:5432 postgres:16-alpine
```

Migrations run automatically on backend startup.

## License

By contributing, you agree your contributions are licensed under AGPL-3.0.
