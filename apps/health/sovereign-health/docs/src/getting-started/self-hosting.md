# Self-Hosting Guide

This guide covers deploying Sovereign Health on your own server with HTTPS, backups, and production-ready configuration.

## Prerequisites

- A Linux server (Ubuntu 22.04+, Debian 12+, or similar)
- Docker Engine 24+ and Docker Compose v2
- A domain name pointing to your server (for HTTPS)
- 1 GB RAM minimum (2 GB recommended)

## Initial Setup

Clone the repository and configure your environment:

```bash
git clone https://gitlab.com/sovereign-health/core-backend.git
cd core-backend
cp .env.example .env
```

Generate secrets and add them to `.env`:

```bash
JWT_SECRET=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -hex 16)
ENCRYPTION_KEY=$(openssl rand -hex 32)
```

Set the mode to OSS for self-hosted deployments:

```bash
SHI_MODE=oss
```

## Reverse Proxy with Caddy

Caddy provides automatic HTTPS via Let's Encrypt. Install Caddy, then create `/etc/caddy/Caddyfile`:

```
app.yourdomain.com {
    reverse_proxy localhost:3000
}

api.yourdomain.com {
    reverse_proxy localhost:8080
}
```

Update your `.env` to match:

```bash
CORS_ORIGINS=https://app.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
```

Update `docker-compose.yml` frontend environment:

```yaml
NEXT_PUBLIC_API_URL: https://api.yourdomain.com
```

Start everything:

```bash
docker compose up -d
sudo systemctl reload caddy
```

### nginx Alternative

If you prefer nginx, configure two server blocks with SSL certificates from Let's Encrypt (certbot):

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

## Backup and Restore

Create a database backup:

```bash
docker compose exec db pg_dump -U sovereign sovereign_health > backup.sql
```

Restore from a backup:

```bash
cat backup.sql | docker compose exec -T db psql -U sovereign sovereign_health
```

Automate with a daily cron job:

```bash
0 3 * * * cd /path/to/core-backend && docker compose exec -T db pg_dump -U sovereign sovereign_health | gzip > /backups/sh-$(date +\%Y\%m\%d).sql.gz
```

## Updating

Pull the latest changes and restart:

```bash
git pull
docker compose pull
docker compose up -d
```

Migrations run automatically on backend startup. Always back up your database before updating.

## Hardware Recommendations

| Use Case | RAM | CPU | Storage |
|----------|-----|-----|---------|
| 1 user | 1 GB | 1 core | 5 GB |
| Family (2-5 users) | 2 GB | 2 cores | 10 GB |
| Small clinic (10-50 users) | 4 GB | 4 cores | 50 GB |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Connection refused on :3000 | Check frontend logs: `docker compose logs frontend` |
| Connection refused on :8080 | Check backend logs: `docker compose logs backend` |
| Database connection failed | Verify `DB_PASSWORD` matches in `.env`, check `docker compose logs db` |
| Migration error on startup | Restore from backup or recreate: `docker compose down -v && docker compose up -d` |
| Doctor Chat not available | Set `OPENAI_API_KEY` in `.env` and restart backend |
| CORS errors in browser | Set `CORS_ORIGINS` to match your frontend URL exactly |
| Signup returns 403 | Set `REGISTRATION_ENABLED=true` in `.env` |
