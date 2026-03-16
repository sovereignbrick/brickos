# Contributing to Sovereign Health

We welcome contributions to Sovereign Health. Whether it is bug reports, code improvements, or knowledge base additions, your help makes the project better.

## How to Contribute

### Reporting Bugs

Open a GitLab issue with:

- Steps to reproduce the problem
- Expected behavior vs. actual behavior
- Browser and OS version
- Docker version (if applicable)
- Relevant log output

### Code Contributions

1. Fork the repository on GitLab
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run the checks:
   - Backend: `cargo fmt && cargo clippy && cargo test`
   - Frontend: `npm run lint && npm run build`
5. Commit with a descriptive message following conventional commit format: `feat(zones): add new marker`, `fix(auth): handle expired token`
6. Open a merge request against `main`

### Code Style

- **Rust:** rustfmt defaults, no `unwrap()` in production code
- **TypeScript/React:** ESLint configuration in the project
- **SQL:** descriptive migration filenames, never modify existing migrations, always create new ones
- **Text:** no em dashes in user-facing text

### Knowledge Base Contributions

Contributions to marker descriptions, food recommendations, supplement information, and protocol effects are especially welcome. Requirements:

- Medical accuracy is required. Do not invent claims.
- Include published references where possible.
- Use plain language accessible to non-medical readers.
- Follow the existing format in seed migration files.

## Development Setup

### Backend

```bash
cd core-backend
cp .env.example .env
cargo run
```

### Frontend

```bash
cd core-frontend
cp .env.example .env.local
npm install
npm run dev
```

### Database

Start a local PostgreSQL instance:

```bash
docker run -d --name sh-postgres \
  -e POSTGRES_USER=sovereign \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=sovereign_health \
  -p 5432:5432 postgres:16-alpine
```

Migrations run automatically when the backend starts.

### Running Tests

Backend tests:

```bash
cd core-backend
make test          # smoke + integration + property tests
make test-smoke    # fast smoke tests only
make lint          # fmt check + clippy
```

Frontend tests:

```bash
cd core-frontend
npm run lint
npm run build
```

## Pull Request Guidelines

- Keep PRs focused on a single change
- Include tests for new functionality
- Update snapshot files if response shapes change (`make snapshot-review`)
- Do not include unrelated formatting changes
- Ensure CI passes before requesting review

## Security Issues

If you discover a security vulnerability, do not open a public issue. Email security@sovereignhealth.io with details. We will respond within 48 hours.

## License

By contributing, you agree that your contributions are licensed under the AGPL-3.0 license, the same license as the project.
