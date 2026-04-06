# Sovereign Link

Self-hosted URL shortener with NOSTR login. Privacy-first, open source.

## Features

- URL shortening with custom codes
- QR code generation
- Click analytics (privacy-preserving)
- Triple auth: NOSTR NIP-98, email/password, API key
- Server-rendered dark theme UI (works without JavaScript)
- SQLite database (zero external dependencies)

## Quick Start

### Docker (recommended)

```bash
docker run -d -p 8080:8080 -v link-data:/data \
  -e SOVEREIGN_LINK_ADMIN_EMAIL=you@example.com \
  -e SOVEREIGN_LINK_ADMIN_PASSWORD=changeme \
  sovereignbrick/sovereign-link:latest
```

### Binary

```bash
curl -L https://github.com/sovereignbrick/brickos/releases/latest/download/sovereign-link -o sovereign-link
chmod +x sovereign-link
SOVEREIGN_LINK_ADMIN_EMAIL=you@example.com SOVEREIGN_LINK_ADMIN_PASSWORD=changeme ./sovereign-link
```

### Start9

Install from the Start9 marketplace (search "Sovereign Link") or sideload the `.s9pk` file.

## Configuration

See `config.example.toml` or set environment variables with `SOVEREIGN_LINK_` prefix.

| Variable | Default | Description |
|---|---|---|
| `SOVEREIGN_LINK_HOST` | `0.0.0.0` | Bind address |
| `SOVEREIGN_LINK_PORT` | `8080` | Bind port |
| `SOVEREIGN_LINK_BASE_URL` | `http://0.0.0.0:8080` | Public URL for generated links |
| `SOVEREIGN_LINK_DB_PATH` | `./data.db` | SQLite database path |
| `SOVEREIGN_LINK_JWT_SECRET` | (auto-generated) | JWT signing secret |
| `SOVEREIGN_LINK_JWT_EXPIRY_SECS` | `86400` | Token lifetime (24h) |
| `SOVEREIGN_LINK_ALLOW_REGISTRATION` | `true` | Allow new user signups |
| `SOVEREIGN_LINK_ADMIN_EMAIL` | (none) | Seed admin email |
| `SOVEREIGN_LINK_ADMIN_PASSWORD` | (none) | Seed admin password |
| `SOVEREIGN_LINK_NOSTR_ENABLED` | `true` | Enable NOSTR NIP-98 login |
| `SOVEREIGN_LINK_NOSTR_NIP89_PUBLISH` | `false` | Log NIP-89 app listing on startup |
| `SOVEREIGN_LINK_CODE_LENGTH` | `6` | Auto-generated code length |
| `SOVEREIGN_LINK_RATE_LIMIT_CREATES` | `50` | Max link creates per user per day |

## API

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/{code}` | None | Redirect to target URL |
| GET | `/{code}.qr` | None | QR code (SVG) |
| POST | `/auth/register` | None | Create account (JSON) |
| POST | `/auth/login` | None | Email login (JSON) |
| POST | `/auth/nostr` | None | NOSTR NIP-98 login |
| POST | `/auth/refresh` | JWT | Refresh token |
| POST | `/auth/login/form` | None | Form login (cookie) |
| POST | `/auth/register/form` | None | Form register (cookie) |
| GET | `/api/v1/links` | JWT/Key | List user's links |
| POST | `/api/v1/links` | JWT/Key | Create short link |
| PUT | `/api/v1/links/{id}` | JWT/Key | Update link |
| DELETE | `/api/v1/links/{id}` | JWT/Key | Deactivate link |
| GET | `/api/v1/links/{id}/stats` | JWT/Key | Click analytics |
| POST | `/api/v1/me/api-key` | JWT | Generate API key |
| GET | `/health` | None | Health check |

Full API docs: [docs/api-reference.md](docs/api-reference.md)

## Deployment Modes

**Standalone** -- Single binary with SQLite. For personal/small team use.

**Platform** -- Integrates into BrickOS platform with PostgreSQL. For multi-tenant SaaS.

## License

AGPL-3.0 -- https://github.com/sovereignbrick/brickos
