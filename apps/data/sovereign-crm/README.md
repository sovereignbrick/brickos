```
// ============================================================================
//                           SOVEREIGN CRM
//
//                     SCAN . LINK . ENCRYPT
//
//   A conference badge. A business card.
//   A QR code on a sticker at a meetup.
//
//   Snap. Recognize. Record.
//
//   Sovereign CRM reads the card, extracts the fields,
//   and drops the contact into an encrypted record --
//   linked to the event, the moment, the context you met.
//
//   No cloud vendor learns who you meet.
//   No enrichment service resells your relationship graph.
//
//   Per-field E2E encryption. Zero third-party sharing.
//   A camera, a key, and a graph of people you trust.
//
//   Your network. Your notes. Your encryption key.
//
//   https://brickos.io/
// ============================================================================
```

# Sovereign CRM

Privacy-first CRM with an AI-powered camera-to-CRM pipeline. Snap a photo of a business card or conference badge, and Sovereign CRM extracts the contact, creates the record, and links it to the event -- all with per-field E2E encryption and zero third-party data sharing.

Part of the **BrickOS** platform under the **Data** pillar.

---

## Architecture

```
Browser / PWA
    |
Next.js 16 frontend (Tailwind v4, Cytoscape.js)
    |
Actix-web Rust API
    |               |
 [scr DB]     [brickos DB]        (two-pool architecture)
                    |
            brickos-platform-api
```

- **API:** Rust, Actix-web 4, SQLx (Postgres)
- **Frontend:** Next.js 16, React 19, Tailwind CSS v4, Cytoscape.js (relationship graph)
- **AI:** `brickos-ai` crate -- Anthropic Claude Vision (cloud) + Ollama qwen2.5:1.5b / moondream (on-prem), with automatic failover
- **Database:** Two-pool -- `scr` (app data) + `brickos` (platform auth/billing)
- **Encryption:** Per-field AES-256-GCM via `brickos-encryption`, Web Crypto API on the client

## Features (77 endpoints across 18 handler files)

| Group | Capabilities |
|-------|-------------|
| **Auth** | Signup, login, MFA (TOTP), password reset, email verify, token refresh |
| **Contacts** | CRUD, per-field encryption, vCard 4.0 import/export, merge |
| **Companies** | CRUD, link to contacts, industry/size metadata |
| **Projects** | CRUD, status tracking, team assignment |
| **Tags** | Universal tagging across contacts, companies, projects |
| **Captures** | Camera-to-CRM pipeline, photo upload, AI extraction |
| **AI Extraction** | Anthropic Claude Vision (6s/photo), Ollama fallback, ON CONFLICT dedup |
| **Meetings** | CRUD, transcription, AI summarization, action items |
| **Pipeline** | Lead pipeline with 7 Kanban stages |
| **Graph** | Relationship graph API (nodes, edges, clusters) -- Cytoscape.js frontend |
| **Search** | Full-text search (tsvector), reindex, suggest, Ctrl+K overlay |
| **Smart Lists** | Saved JSONB filters with live preview |
| **Export** | vCard 4.0, CSV, NOSTR NIP-02 contact list |
| **Enrichment** | Lightning address lookup, Sovereign Link stub |
| **Queue** | Background capture processing worker |
| **Interactions** | Activity log per contact/company |
| **Platform** | Stats, health, version |

## Tech Stack

### Backend
- Rust (edition 2024)
- Actix-web 4
- SQLx 0.8 (Postgres, compile-time checked queries)
- `brickos-auth`, `brickos-encryption`, `brickos-platform-api`, `brickos-ai`

### Frontend
- Next.js 16 (App Router)
- React 19
- Tailwind CSS v4
- Cytoscape.js (relationship graph)
- Web Crypto API (client-side E2E encryption)
- PWA (camera capture page)

### AI
- **Cloud:** Anthropic Claude Vision (claude-sonnet-4) -- 6s per business card photo
- **On-prem:** Ollama with qwen2.5:1.5b (text) + moondream (vision)
- Automatic failover via `AiProviderManager`

## URLs

| Environment | API | Frontend |
|-------------|-----|----------|
| Staging | https://crm-api.brickos.io | https://crm-demo.brickos.io |
| Local dev | http://localhost:8085 | http://localhost:3004 |

## Port Allocation

| Service | Production | Staging | Dev |
|---------|-----------|---------|-----|
| API | 8084 | 8085 | 8085 |
| Frontend | -- | -- | 3004 |

## Database

| Database | Purpose |
|----------|---------|
| `scr` | App data (contacts, companies, projects, captures, meetings, pipeline) |
| `brickos` | Platform data (auth, users, billing) |

13 tables, 244 lines of migrations. All migrations use `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`.

## Local Development

```bash
# Start databases
docker compose -f docker-compose.dev.yml up -d

# Run API
cd apps/data/sovereign-crm/api
cp .env.example .env   # configure DB URLs, AI keys
cargo run

# Run frontend
cd apps/data/sovereign-crm/frontend
npm install
npm run dev
```

## Testing

```bash
# Unit + integration tests (48 tests)
cargo test -p sovereign-crm-api

# E2E tests against running API
E2E_BASE_URL=http://localhost:8084 cargo test -p sovereign-crm-api --test e2e
```

## Deployment

```bash
# Deploy to staging
bash apps/data/sovereign-crm/ops/deploy.sh staging

# Deploy to production
bash apps/data/sovereign-crm/ops/deploy.sh production --confirm
```

## License

AGPL-3.0
