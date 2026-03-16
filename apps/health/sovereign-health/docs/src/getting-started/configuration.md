# Configuration

Sovereign Health is configured through environment variables. Both the backend and frontend read from `.env` files.

## Backend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | (none) | PostgreSQL connection string, e.g. `postgres://sovereign:pass@localhost:5432/sovereign_health` |
| `JWT_SECRET` | Yes | (none) | Secret key for signing JWT tokens. Must be at least 32 hex characters. |
| `ENCRYPTION_KEY` | No | (none) | AES-256-GCM key for encrypting health data at rest. 64 hex characters. If omitted, data is stored unencrypted. |
| `SHI_MODE` | No | (none) | Set to `oss` for self-hosted mode. Unlocks all features and removes tier limits. |
| `RUST_LOG` | No | `info` | Log verbosity. Options: `debug`, `info`, `warn`, `error`. |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Comma-separated list of allowed CORS origins. |
| `FRONTEND_URL` | No | `http://localhost:3000` | Frontend URL used for generating links in emails or responses. |
| `REGISTRATION_ENABLED` | No | `true` (oss) | Whether new user signups are allowed. |
| `OPENAI_API_KEY` | No | (none) | API key for the Dr. Alex AI assistant. Supports any OpenAI-compatible provider. |
| `DB_PASSWORD` | No | `changeme` | Database password used in Docker Compose. |

## Frontend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:8080` | Backend API URL. Must be accessible from the user's browser. |
| `NEXT_PUBLIC_APP_NAME` | No | `Sovereign Health` | Application name displayed in the UI. |

## OSS Mode vs. SaaS Mode

Setting `SHI_MODE=oss` activates self-hosted mode:

- All features are unlocked regardless of license tier
- Measurement quotas are removed
- Dr. Alex AI uses your own API key (no built-in quota)
- No license validation against an external server
- Registration is enabled by default

When `SHI_MODE` is not set (or set to any value other than `oss`), the application runs in SaaS mode. Features and quotas are governed by the user's license tier stored in the database.

## SaaS License Tiers

In SaaS mode, these tiers control feature access:

| Tier | Price | Markers | Measurements/Month | Dr. Alex Chats/Month |
|------|-------|---------|---------------------|----------------------|
| Glimpse (free) | $0 | 10 | 50 | 5 |
| Focus | $9/mo | 30 | 200 | 25 |
| Insight | $19/mo | All | Unlimited | 100 |
| Clarity | $29/mo | All | Unlimited | 500 |
| Horizon | $49/mo | All | Unlimited | Unlimited |

In OSS mode, all users effectively have Horizon-level access.

## Generating Secrets

Use `openssl` to generate cryptographically secure values:

```bash
# JWT secret
openssl rand -hex 32

# Encryption key (must be exactly 64 hex chars for AES-256)
openssl rand -hex 32

# Database password
openssl rand -hex 16
```

## Docker Compose Override

For local development, you can create a `docker-compose.override.yml` to adjust ports, volumes, or environment variables without modifying the main file:

```yaml
services:
  backend:
    environment:
      RUST_LOG: debug
  frontend:
    ports:
      - "3001:3000"
```
