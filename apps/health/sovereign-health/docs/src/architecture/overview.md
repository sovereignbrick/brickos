# Architecture Overview

Sovereign Health is a three-tier web application: a Rust backend API, a Next.js frontend, and a PostgreSQL database.

## System Components

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Next.js 16    │────>│  Rust/Actix-web   │────>│  PostgreSQL 16   │
│   Frontend      │<────│  Backend API      │<────│  Database        │
│   Port 3000     │     │  Port 8080        │     │  Port 5432       │
└─────────────────┘     └──────────────────┘     └──────────────────┘
                              │
                              v
                        ┌──────────────┐
                        │  OpenAI API  │
                        │  (optional)  │
                        └──────────────┘
```

## Backend (Rust/Actix-web)

The backend is a REST API built with Actix-web 4. It handles:

- Authentication (JWT token issuance and validation, Argon2 password hashing)
- CRUD operations for measurements, markers, medications, and settings
- Reference range lookups with protocol-aware threshold adjustment
- Calculated marker derivation (GKI, BMI, HOMA-IR, WHtR, TG/HDL)
- Encryption and decryption of health data at rest
- Knowledge engine queries (marker relationships, food/supplement data)
- Dr. Alex AI conversation management and context assembly

Key crates: `actix-web`, `sqlx`, `serde`, `jsonwebtoken`, `argon2`, `aes-gcm`, `tracing`.

The backend uses SQLx for compile-time checked SQL queries with the `runtime-tokio-rustls` feature (no OpenSSL dependency). Migrations are applied automatically on startup.

## Frontend (Next.js 16)

The frontend is a Next.js 16 application using the App Router, Tailwind CSS, and shadcn/ui components. It provides:

- Dashboard with zone cards and marker summaries
- Marker detail pages with trend charts (Recharts)
- Measurement entry forms (react-hook-form + zod validation)
- Dr. Alex AI chat interface
- Medication and supplement management
- Settings and preference configuration

Authentication tokens are stored in HTTP-only secure cookies (not localStorage). API calls are centralized in `lib/api.ts` with automatic auth header injection.

The frontend is dark-themed by default.

## Database (PostgreSQL 16)

PostgreSQL stores all application data. Key conventions:

- UUID primary keys on all tables
- `created_at` and `updated_at` timestamps
- Soft delete via `is_deleted` boolean
- Text columns for enums (not Postgres ENUM types)
- JSONB for flexible fields (user preferences, feature flags)

See [Database Schema](./database.md) for table details.

## Communication Flow

1. The user interacts with the Next.js frontend in their browser
2. The frontend makes HTTP requests to the backend API with a JWT Bearer token
3. The backend validates the token, processes the request, and queries PostgreSQL
4. Health measurement values are decrypted from the database before being returned
5. The frontend renders the response

For Dr. Alex conversations, the backend assembles anonymized health context from the user's data and forwards it (along with the user's message) to the configured OpenAI-compatible API. The AI response is stored in the database and returned to the frontend.

## Deployment

All three components run as Docker containers orchestrated by Docker Compose. A reverse proxy (Caddy or nginx) sits in front for HTTPS termination in production.
