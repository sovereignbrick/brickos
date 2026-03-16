# Quick Start

Get Sovereign Health running in under 5 minutes with Docker Compose.

## Prerequisites

- Docker Engine 24+ and Docker Compose v2
- 1 GB of RAM (minimum)
- Git

## 1. Clone the Repository

```bash
git clone https://gitlab.com/sovereign-health/core-backend.git
cd core-backend
```

## 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and generate the required secrets:

```bash
# Generate a JWT secret (required)
JWT_SECRET=$(openssl rand -hex 32)

# Generate a database password
DB_PASSWORD=$(openssl rand -hex 16)

# Generate an encryption key for health data at rest
ENCRYPTION_KEY=$(openssl rand -hex 32)
```

Paste the generated values into your `.env` file.

## 3. Start the Services

```bash
docker compose up -d
```

This starts three containers:

| Container | Port | Description |
|-----------|------|-------------|
| `db` | 5432 | PostgreSQL 16 database |
| `backend` | 8080 | Rust/Actix-web API server |
| `frontend` | 3000 | Next.js web application |

On first startup, the backend automatically runs all database migrations and seeds marker data, reference ranges, zones, and the medication catalog.

## 4. Register Your Account

Open [http://localhost:3000](http://localhost:3000) in your browser and create your first account.

That is it. You are ready to start logging measurements.

## 5. Enable Dr. Alex (Optional)

The AI assistant requires an OpenAI-compatible API key. Add to your `.env`:

```bash
OPENAI_API_KEY=sk-your-key-here
```

Then restart the backend:

```bash
docker compose restart backend
```

Without an API key, Doctor Chat is hidden from the navigation automatically.

## Verify the Installation

Check the API health endpoint:

```bash
curl http://localhost:8080/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "sovereign-health-backend",
  "version": "0.14.0"
}
```

## Next Steps

- [Self-Hosting Guide](./self-hosting.md) for production deployment with HTTPS
- [Configuration](./configuration.md) for all environment variables
- [Health Zones](../features/health-zones.md) to understand the marker system
