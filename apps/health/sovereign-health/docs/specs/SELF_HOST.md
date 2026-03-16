# Self-Hosting Sovereign Health

Run your own Sovereign Health instance with Docker Compose in under 5 minutes.

## Quick Start

### 1. Clone the repository

```bash
git clone https://gitlab.com/sovereign-health/core-backend.git
cd core-backend
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set:

```bash
# Generate a JWT secret (required)
JWT_SECRET=$(openssl rand -hex 32)

# Generate a database password
DB_PASSWORD=$(openssl rand -hex 16)

# Generate an encryption key for health data at rest (recommended)
ENCRYPTION_KEY=$(openssl rand -hex 32)
```

### 3. Start

```bash
docker compose up -d
```

### 4. Open

Navigate to `http://localhost:3000` and register your first account.

All database tables, seed data (markers, zones, reference ranges, medication catalog), and license tiers are created automatically on first startup.

## Enabling Dr. Alex AI Assistant

Dr. Alex requires an OpenAI-compatible API key. Add to your `.env`:

```bash
OPENAI_API_KEY=sk-your-key-here
```

Then restart the backend:

```bash
docker compose restart backend
```

Without an API key, Doctor Chat is hidden from the navigation.

## OSS Mode: SMTP Setup

If self-hosting, configure any SMTP provider instead of Mailgun:

```bash
SMTP_HOST=smtp.fastmail.com
SMTP_PORT=587
SMTP_USER=you@yourdomain.com
SMTP_PASS=your-app-password
SMTP_FROM=Sovereign Health <noreply@yourdomain.com>
```

Works with Gmail, Fastmail, Proton Bridge, Mailcow, or any SMTP server.
Email verification and password reset work over SMTP.
Mailing list features (newsletter, segments) are SaaS-only.

## Updating

```bash
git pull
docker compose pull
docker compose up -d
```

## Backup

### Create a backup

```bash
docker compose exec db pg_dump -U sovereign sovereign_health > backup.sql
```

### Restore from backup

```bash
cat backup.sql | docker compose exec -T db psql -U sovereign sovereign_health
```

Store backups off-server. Consider a daily cron job:

```bash
0 3 * * * cd /path/to/core-backend && docker compose exec -T db pg_dump -U sovereign sovereign_health | gzip > /backups/sh-$(date +\%Y\%m\%d).sql.gz
```

## Running Behind a Reverse Proxy

### Caddy (recommended -- automatic HTTPS)

Install Caddy and create `/etc/caddy/Caddyfile`:

```
app.yourdomain.com {
    reverse_proxy localhost:3000
}

api.yourdomain.com {
    reverse_proxy localhost:8080
}
```

Update your `.env`:

```bash
CORS_ORIGINS=https://app.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
```

Update `docker-compose.yml` frontend environment:

```yaml
NEXT_PUBLIC_API_URL: https://api.yourdomain.com
```

Restart:

```bash
docker compose up -d
sudo systemctl reload caddy
```

### nginx

```nginx
server {
    listen 443 ssl;
    server_name app.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Connection refused on :3000 | Frontend not running | `docker compose logs frontend` to check |
| Connection refused on :8080 | Backend not running | `docker compose logs backend` to check |
| Database connection failed | DB not ready or wrong password | Check `DB_PASSWORD` matches in `.env`, run `docker compose logs db` |
| Migration error on startup | Corrupted DB state | Restore from backup or recreate: `docker compose down -v && docker compose up -d` |
| Doctor Chat not working | Missing API key | Set `OPENAI_API_KEY` in `.env` and restart backend |
| Encryption not working | Missing or invalid key | Set `ENCRYPTION_KEY` (64-char hex) in `.env` and restart backend |
| CORS errors in browser | Wrong CORS_ORIGINS | Set `CORS_ORIGINS` to match your frontend URL |
| Signup returns 403 | Registration disabled | Set `REGISTRATION_ENABLED=true` in `.env` |

## Hardware Recommendations

| Use Case | RAM | CPU | Storage |
|----------|-----|-----|---------|
| 1 user | 1 GB | 1 core | 5 GB |
| Family (2-5 users) | 2 GB | 2 cores | 10 GB |
| Small clinic (10-50 users) | 4 GB | 4 cores | 50 GB |

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `JWT_SECRET` | Yes | - | Secret for JWT signing (32+ hex chars) |
| `DB_PASSWORD` | No | `changeme` | Database password (used in docker-compose) |
| `ENCRYPTION_KEY` | No | - | AES-256 key for data at rest (64 hex chars) |
| `RUST_LOG` | No | `info` | Log level (debug, info, warn, error) |
| `SHI_MODE` | No | - | Set to `oss` for self-hosted mode |
| `REGISTRATION_ENABLED` | No | `true` (oss) | Allow new signups |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Allowed CORS origins |
| `OPENAI_API_KEY` | No | - | Enables Dr. Alex AI chat |
| `FRONTEND_URL` | No | `http://localhost:3000` | Frontend URL for links |
| `SMTP_HOST` | No | - | SMTP server hostname |
| `SMTP_PORT` | No | `587` | SMTP server port |
| `SMTP_USER` | No | - | SMTP username |
| `SMTP_PASS` | No | - | SMTP password |
| `SMTP_FROM` | No | - | From address for emails |
