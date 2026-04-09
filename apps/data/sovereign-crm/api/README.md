# Sovereign CRM API

Rust API for Sovereign CRM. 77 endpoints across 18 handler files.

## Endpoint Groups

| Handler file | Endpoints | Description |
|-------------|-----------|-------------|
| `auth.rs` | signup, login, mfa, password-reset, email-verify, token-refresh | Authentication stack |
| `contacts.rs` | CRUD, merge, list with filters | Contact management |
| `companies.rs` | CRUD, link contacts | Company management |
| `projects.rs` | CRUD, status, team | Project tracking |
| `tags.rs` | create, attach, detach, list | Universal tagging |
| `captures.rs` | upload photo, process, list, detail | Camera-to-CRM pipeline |
| `enrichment.rs` | AI extract, Lightning lookup | Contact enrichment |
| `meetings.rs` | CRUD, transcribe, summarize, action items | Meeting intelligence |
| `pipeline.rs` | stages, move, list by stage | Lead pipeline (7 stages) |
| `graph.rs` | nodes, edges, clusters | Relationship graph |
| `search.rs` | full-text, suggest, reindex | Search (tsvector) |
| `smart_lists.rs` | CRUD, preview | Saved JSONB filters |
| `export.rs` | vCard, CSV, NIP-02 | Data export |
| `interactions.rs` | log, list | Activity tracking |
| `queue.rs` | enqueue, process, status | Background capture worker |
| `platform.rs` | stats | Platform statistics |
| `health.rs` | health, version | Health checks |

## Running

```bash
cd apps/data/sovereign-crm/api
cp .env.example .env
cargo run
```

Requires `.env` with `DATABASE_URL`, `PLATFORM_DATABASE_URL`, `ANTHROPIC_API_KEY` (optional), `OLLAMA_BASE_URL` (optional).

## Testing

```bash
# Unit + integration (48 tests)
cargo test -p sovereign-crm-api

# E2E against running API
E2E_BASE_URL=http://localhost:8084 cargo test -p sovereign-crm-api --test e2e
```
