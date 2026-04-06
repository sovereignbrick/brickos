# Self-Hosting Sovereign Link

## Docker Compose (recommended)

Create a `docker-compose.yml`:

```yaml
services:
  sovereign-link:
    image: sovereignbrick/sovereign-link:latest
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - link-data:/data
    environment:
      SOVEREIGN_LINK_BASE_URL: https://link.yourdomain.com
      SOVEREIGN_LINK_ADMIN_EMAIL: admin@yourdomain.com
      SOVEREIGN_LINK_ADMIN_PASSWORD: your-secure-password
      SOVEREIGN_LINK_JWT_SECRET: your-random-64-char-hex-string
      SOVEREIGN_LINK_ALLOW_REGISTRATION: "true"
      SOVEREIGN_LINK_NOSTR_ENABLED: "true"

volumes:
  link-data:
```

Start it:

```bash
docker compose up -d
```

Your instance is now available at `http://localhost:8080`.

## Single Binary

Download the binary for your platform from GitHub releases:

```bash
# Linux x86_64
curl -L https://github.com/sovereignbrick/brickos/releases/latest/download/sovereign-link-linux-amd64 -o sovereign-link
chmod +x sovereign-link

# Run with environment variables
export SOVEREIGN_LINK_BASE_URL=https://link.yourdomain.com
export SOVEREIGN_LINK_ADMIN_EMAIL=admin@yourdomain.com
export SOVEREIGN_LINK_ADMIN_PASSWORD=your-secure-password
export SOVEREIGN_LINK_JWT_SECRET=$(openssl rand -hex 32)
./sovereign-link
```

### Systemd Service

Create `/etc/systemd/system/sovereign-link.service`:

```ini
[Unit]
Description=Sovereign Link URL Shortener
After=network.target

[Service]
Type=simple
User=sovereign-link
Group=sovereign-link
WorkingDirectory=/opt/sovereign-link
ExecStart=/opt/sovereign-link/sovereign-link
Restart=always
RestartSec=5
EnvironmentFile=/opt/sovereign-link/.env

[Install]
WantedBy=multi-user.target
```

Create `/opt/sovereign-link/.env`:

```
SOVEREIGN_LINK_BASE_URL=https://link.yourdomain.com
SOVEREIGN_LINK_DB_PATH=/opt/sovereign-link/data.db
SOVEREIGN_LINK_ADMIN_EMAIL=admin@yourdomain.com
SOVEREIGN_LINK_ADMIN_PASSWORD=your-secure-password
SOVEREIGN_LINK_JWT_SECRET=your-random-64-char-hex-string
```

Enable and start:

```bash
sudo systemctl enable --now sovereign-link
```

## Reverse Proxy

### Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name link.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/link.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/link.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name link.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### Caddy

```
link.yourdomain.com {
    reverse_proxy localhost:8080
}
```

Caddy handles TLS automatically via Let's Encrypt.

### Traefik (Docker labels)

```yaml
services:
  sovereign-link:
    image: sovereignbrick/sovereign-link:latest
    labels:
      - traefik.enable=true
      - traefik.http.routers.link.rule=Host(`link.yourdomain.com`)
      - traefik.http.routers.link.tls.certresolver=letsencrypt
      - traefik.http.services.link.loadbalancer.server.port=8080
```

## Tor Hidden Service

To expose Sovereign Link as a Tor hidden service, add to your `torrc`:

```
HiddenServiceDir /var/lib/tor/sovereign-link/
HiddenServicePort 80 127.0.0.1:8080
```

Restart Tor and find your `.onion` address:

```bash
sudo systemctl restart tor
cat /var/lib/tor/sovereign-link/hostname
```

Set `SOVEREIGN_LINK_BASE_URL` to your `.onion` address for correct link generation.

## Start9

See `startos/README.md` for building and sideloading the Start9 package.

## Backups

The entire state is in a single SQLite file (default: `./data.db`). Back it up with:

```bash
# Safe copy while running (SQLite WAL mode)
sqlite3 /path/to/data.db ".backup /path/to/backup.db"

# Or just copy the file when the service is stopped
cp /path/to/data.db /path/to/backup.db
```

## Security Checklist

- [ ] Set a strong `SOVEREIGN_LINK_JWT_SECRET` (at least 32 random hex bytes)
- [ ] Set a strong admin password
- [ ] Use HTTPS in production (reverse proxy with TLS)
- [ ] Set `SOVEREIGN_LINK_BASE_URL` to your public HTTPS URL
- [ ] Consider disabling registration after creating your account: `SOVEREIGN_LINK_ALLOW_REGISTRATION=false`
- [ ] Keep the SQLite database file permissions restricted (`chmod 600`)
- [ ] Run as a non-root user
