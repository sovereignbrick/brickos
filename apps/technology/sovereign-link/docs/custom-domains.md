# Custom Domains for Sovereign Link (Standalone Mode)

Sovereign Link supports custom domains out of the box. Set your domain as the `base_url` and all generated links, QR codes, and redirects will use it.

## Quick Setup

### 1. Point your DNS

Add an A record for your domain pointing to your server:

```
ln.yourdomain.com   A   your-server-ip
```

### 2. Configure Sovereign Link

In `config.toml`:
```toml
[server]
host = "0.0.0.0"
port = 8080
base_url = "https://ln.yourdomain.com"
```

Or via environment variables:
```bash
SOVEREIGN_LINK_BASE_URL=https://ln.yourdomain.com
```

### 3. Set up a reverse proxy with SSL

#### Option A: Caddy (recommended, auto-SSL)

```
ln.yourdomain.com {
    reverse_proxy localhost:8080
}
```

Caddy handles Let's Encrypt automatically. No configuration needed.

#### Option B: nginx + certbot

```nginx
server {
    listen 80;
    server_name ln.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name ln.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/ln.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ln.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Get the certificate:
```bash
certbot certonly --nginx -d ln.yourdomain.com
```

#### Option C: Docker with Traefik

```yaml
services:
  sovereign-link:
    image: brickos/sovereign-link:latest
    environment:
      - SOVEREIGN_LINK_BASE_URL=https://ln.yourdomain.com
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.sl.rule=Host(`ln.yourdomain.com`)"
      - "traefik.http.routers.sl.tls.certresolver=letsencrypt"
    volumes:
      - sl-data:/data

  traefik:
    image: traefik:v3
    command:
      - "--providers.docker"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=you@email.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - letsencrypt:/letsencrypt

volumes:
  sl-data:
  letsencrypt:
```

### 4. Verify

```bash
# Health check
curl https://ln.yourdomain.com/health

# Create a link and verify the short URL uses your domain
curl -X POST https://ln.yourdomain.com/api/v1/links \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target_url": "https://example.com"}'
# Response will show: code using ln.yourdomain.com
```

## Multiple Domains

You can run one Sovereign Link instance behind multiple domains by configuring your reverse proxy to route all domains to the same port. The `base_url` determines which domain appears in generated links and QR codes.

For multi-domain setups where different domains serve different organizations, use platform mode with per-org custom domain mapping.
