# Sprint 037 - Sovereign CRM: Full Feature Build (Phases 2-6)

**Started:** 2026-04-10
**Goal:** Build out the complete Sovereign CRM from Phase 1 foundation to full product: brickos-ai crate, camera-to-CRM pipeline, meeting intelligence, quick capture, full-text search, relationship graph, lead pipeline, PWA, and platform integration.
**Version target:** v0.44.0 - v0.48.0 (incremental releases per phase)
**Previous:** Sprint 036 (Phase 1 foundation: 32 API endpoints, auth, CRUD, tags, scaffold v2)
**Design:** [017-sovereign-crm.md](../../design/017-sovereign-crm.md)

---

## Sprint 036 Retrospective (carried into 037)

### Issues found during deployment (all fixed, prevent recurrence)
- Schema drift: auth handlers assumed wrong column names (5 fixes)
- Frontend: `next/image` breaks hydration, use `unoptimized` prop
- Frontend: plain `<img>` fails ("Image constructor: new required")
- Missing `postcss.config.mjs` -- zero Tailwind CSS rendered
- API envelope `{data: {...}}` not unwrapped in frontend
- No redirect after login
- Port 8080 hardcoded (SHI) instead of app-specific port

### Prevention measures in scaffold v2
- `api-config.ts.tmpl` with `${PROD_PORT}` (single source for API URL)
- `postcss.config.mjs` included in scaffold
- `next/image` with `unoptimized` prop
- Login uses `window.location.href` (no `useRouter`)
- No `dangerouslySetInnerHTML` scripts
- E2E page test after every change

---

## Dependency Graph (Full Sprint)

```
Phase 2A (infrastructure -- unblocks everything):
  #413 brickos-ai crate (Anthropic + Ollama + fallback)
  #416 Shared dev PostgreSQL + dev portal
  #417 PWA: service worker, manifest, offline shell
  #418 Staging nginx for CRM subdomain
       |
       v
Phase 2B (camera-to-CRM pipeline -- core innovation):
  #419 Camera capture page + E2E encryption
  #420 AI email/photo extraction via brickos-ai
  #421 Interactions table + timeline
  #422 Smart deduplication (merge existing contacts)
       |
       v
Phase 2C (search + import/export):
  #423 Full-text search (Ctrl+K, tsvector, search page)
  #424 vCard import/export (4.0 export, 3.0/4.0 import)
  #425 Smart lists (saved filters with JSONB)
  #426 Web profile enrichment (LinkedIn, GitHub, NOSTR)
       |
       v
Phase 3 (meeting intelligence):
  #427 Audio recording (MediaRecorder, WebM/Opus)
  #428 Whisper transcription via brickos-ai
  #429 AI meeting summary + action items
  #430 Meeting detail page (summary, transcript, actions)
       |
       v
Phase 4 (quick capture + lead pipeline):
  #431 Quick capture inbox (photo/audio/text/file)
  #432 Background AI processing queue
  #433 Lead pipeline Kanban view
  #434 Conference mode (rapid scanning)
       |
       v
Phase 5 (relationship graph):
  #435 Cytoscape.js interactive graph
  #436 Louvain community detection (petgraph)
  #437 4 zoom levels (clusters -> contacts)
       |
       v
Phase 6 (platform integration):
  #438 CRM in BrickOS platform admin sidebar
  #439 NOSTR NIP-02 contact list export
  #440 Lightning address per contact
  #441 Sovereign Link integration (short URLs)
```

---

## Phase 2A -- Infrastructure (Days 1-3)

### #413 brickos-ai crate (5 pts)

Create `crates/brickos-ai/` with:
- `AiProvider` trait: `chat()`, `vision()`, `supports_vision()`, `cost_per_1k_tokens()`
- `AnthropicProvider`: Claude API (chat + vision)
- `OllamaProvider`: local Ollama (`/v1/chat/completions`, health check via `/api/tags`)
- `AiProviderManager`: fallback chain (3 failures in 5min -> skip), recovery check every 5min
- Config from `brickos.app_settings` table
- Usage logging to `brickos.ai_usage_log`
- Default chain: Anthropic -> OpenAI -> Ollama

### #416 Shared dev PostgreSQL + staging nginx (3 pts)

- `ops/dev-stack/docker-compose.yml`: single PostgreSQL with brickos + per-app databases
- `init-platform.sql`: platform schema + tables
- `init-apps.sql`: CREATE DATABASE shi, scr, sli, svo
- Platform API `/dev` health page (Phase 2 of Design 020)
- nginx config for `crm-api-demo.brickos.io` -> :8085 on VPS

### #417 PWA foundation (3 pts)

- Service worker (Serwist/next-pwa)
- `manifest.json` with CRM icons, theme color, display: standalone
- Offline shell (cached app shell, "offline" message for data)
- `<input type="file" accept="image/*" capture="environment">` for mobile camera
- Install prompt on mobile

### #418 Migrations: interactions, captures, meetings tables (3 pts)

```sql
-- 003_interactions.sql
CREATE TABLE crm_interactions (
    id UUID PRIMARY KEY, org_id UUID NOT NULL,
    contact_id UUID REFERENCES crm_contacts(id),
    interaction_type TEXT NOT NULL,  -- 'email', 'meeting', 'note', 'capture'
    subject TEXT, body TEXT,         -- encrypted
    source_type TEXT,                -- 'photo', 'upload', 'manual'
    source_image_encrypted TEXT,     -- E2E encrypted image blob
    ai_provider TEXT, ai_model TEXT,
    processing_ms INTEGER,
    project_id UUID REFERENCES crm_projects(id),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE crm_captures (
    id UUID PRIMARY KEY, org_id UUID NOT NULL,
    user_id UUID NOT NULL,
    capture_type TEXT NOT NULL,      -- 'photo', 'audio', 'text', 'file'
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, processing, extracted, failed
    image_encrypted TEXT,
    extracted_text TEXT,
    project_id UUID REFERENCES crm_projects(id),
    processing_metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE crm_meetings (
    id UUID PRIMARY KEY, org_id UUID NOT NULL,
    title TEXT NOT NULL,
    project_id UUID REFERENCES crm_projects(id),
    summary TEXT,                    -- encrypted, AI-generated
    transcript TEXT,                 -- encrypted
    audio_blob_id TEXT,              -- reference to encrypted audio
    duration_secs INTEGER,
    recorded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE crm_meeting_attendees (
    meeting_id UUID REFERENCES crm_meetings(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
    PRIMARY KEY (meeting_id, contact_id)
);

CREATE TABLE crm_action_items (
    id UUID PRIMARY KEY, meeting_id UUID REFERENCES crm_meetings(id),
    assignee_contact_id UUID REFERENCES crm_contacts(id),
    description TEXT NOT NULL,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Points:** 14

---

## Phase 2B -- Camera-to-CRM Pipeline (Days 4-7)

### #419 Camera capture page + E2E encryption (5 pts)

- `/crm/capture` page with camera button
- Mobile: `<input capture="environment">` opens camera directly
- Desktop: drag-and-drop or file picker (PNG, JPG, WEBP)
- **Client-side AES-256-GCM encryption** before upload (Web Crypto API)
- Key derived from user session (HKDF from JWT)
- Project scope modal: select existing project or create new
- Upload to `POST /api/v1/captures` with encrypted payload
- Processing status indicator (pending -> processing -> done)

### #420 AI email/photo extraction (8 pts)

- `POST /api/v1/captures/:id/process` triggers AI extraction
- Server-side: decrypt image in memory -> send to brickos-ai vision
- AI extracts: from/to/cc emails, names, roles, company, domain, subject, date, topics
- Smart deduplication: match existing contacts by email, enrich with longer names
- Auto-create companies from email domains
- Create `crm_interaction` record linking contacts to extracted data
- Auto-tag with AI-suggested topics
- Zeroize plaintext image after processing
- Processing metadata logged (provider, model, tokens, latency)

### #421 Interaction timeline (3 pts)

- `GET /api/v1/interactions` -- list (paginated, filterable by contact, project, type)
- `GET /api/v1/contacts/:id/timeline` -- all interactions for a contact
- Frontend: timeline view on contact detail page
- Each interaction shows: type badge, subject, snippet, date, linked project

### #422 Smart deduplication (3 pts)

- On extraction: check if email already exists in org's contacts
- If match: update name (prefer longer), add company link, increment interaction_count
- If no match: create new contact + company
- Merge endpoint: `POST /api/v1/contacts/:id/merge` with `{ merge_with: uuid }`

**Points:** 19

---

## Phase 2C -- Search + Import/Export (Days 8-10)

### #423 Full-text search (5 pts)

- `GET /api/v1/search?q=...&type=all&limit=20`
- `GET /api/v1/search/suggest?q=...&limit=8` (prefix matching)
- Ctrl+K overlay component with recent searches + suggestions
- Full results page at `/crm/search?q=...`
- Tab filtering by entity type with facet counts
- Score: `ts_rank_cd * category_weight`
- Update `crm_search_index` on every entity mutation
- Bilingual (EN/DE) via dual tsvector config

### #424 vCard import/export (3 pts)

- `GET /api/v1/contacts/export?format=vcf` -- export all as vCard 4.0
- `GET /api/v1/contacts/:id/export?format=vcf` -- export single
- `POST /api/v1/contacts/import` -- import vCard 3.0/4.0 (.vcf)
- `POST /api/v1/contacts/import` -- import JSON (full dataset restore)
- Parse vCard fields: FN, EMAIL, TEL, ORG, TITLE, NOTE

### #425 Smart lists (3 pts)

- `crm_smart_lists` table: name, org_id, filter_spec (JSONB)
- Filter spec: `{ tags: ["vip"], min_interactions: 5, last_contacted_before: "30d" }`
- `GET /api/v1/smart-lists` -- list saved filters
- `POST /api/v1/smart-lists` -- create
- `GET /api/v1/smart-lists/:id/contacts` -- execute filter, return matching contacts

### #426 Web profile enrichment (3 pts)

- On contact creation/enrichment: check LinkedIn, GitHub, NOSTR (NIP-05)
- `crm_enrichment_cache` table: entity_id, linkedin_url, github_url, nostr_nip05, summary
- Server-side lookups, cached 30 days, rate-limited 1 req/10s
- AI-generated 1-3 sentence summary from public data
- Manual "re-enrich" button on contact detail

**Points:** 14

---

## Phase 3 -- Meeting Intelligence (Days 11-14)

### #427 Audio recording (3 pts)

- MediaRecorder API in PWA (WebM/Opus format)
- Record button with live waveform + duration display
- Upload pre-recorded files (MP3, M4A, WAV, OGG)
- Client-side AES-256-GCM encryption before upload
- Link to project + attendees (from CRM contacts)

### #428 Whisper transcription (5 pts)

- `POST /api/v1/meetings/:id/transcribe` triggers transcription
- brickos-ai vision/audio: Whisper model via Ollama or cloud
- Decrypt audio in memory -> transcribe -> encrypt transcript -> store
- Timestamped segments, speaker attribution where possible
- Processing status: pending -> transcribing -> summarizing -> done

### #429 AI meeting summary + action items (5 pts)

- After transcription: AI generates structured summary
- Extract: key decisions, action items (with assignee + due date), key topics
- Action items mapped to CRM contacts by name/email
- Auto-tag meeting with extracted topics
- Store as encrypted structured JSON

### #430 Meeting detail page (3 pts)

- `/crm/meetings/:id` with tabs: Summary, Transcript, Action Items, Notes
- Attendee avatars linked to contact detail pages
- Action items with checkbox (mark complete), assignee, due date
- Project + tag badges
- Audio player (decrypt + play in browser)

**Points:** 16

---

## Phase 4 -- Quick Capture + Lead Pipeline (Days 15-17)

### #431 Quick capture inbox (5 pts)

- `/crm/capture` page with 4 capture modes: Photo, Audio, Text, File
- Photo: camera or file picker
- Audio: record voice memo (reuse MediaRecorder from meetings)
- Text: quick note textarea
- File: upload any document (PDF, image, etc.)
- All captured items go to `crm_captures` table with status=pending
- Project scope selector on each capture

### #432 Background AI processing queue (5 pts)

- Tokio background task processes captures sequentially
- Photo: vision AI -> extract contacts, companies, topics
- Audio: Whisper -> transcribe -> AI summary
- Text: AI categorize + extract entities
- File: detect type, extract text (PDF -> text), AI process
- Status updates via polling or WebSocket
- Retry on failure (max 3 attempts)

### #433 Lead pipeline Kanban (5 pts)

- `/crm/pipeline` page with Kanban board
- Columns: New -> Lead -> Qualified -> Proposal -> Negotiation -> Won/Lost
- Drag-and-drop contacts between stages
- `PUT /api/v1/contacts/:id` updates `lead_stage`
- Filter by project, tags
- Card shows: name, company, last interaction, tags

### #434 Conference mode (3 pts)

- `/crm/capture/conference` -- optimized rapid capture
- Auto-assigns to selected project
- Camera opens immediately, snap + next
- Counter: "12 captures today"
- Process all button at end of event
- Export: "Conference {date} -- {count} contacts captured"

**Points:** 18

---

## Phase 5 -- Relationship Graph (Days 18-20)

### #435 Cytoscape.js interactive graph (8 pts)

- `/crm/graph` page with full-screen canvas
- Nodes: contacts (circles), companies (squares), projects (diamonds)
- Edges: contact-company links, contact-project assignments, interactions
- Node size by interaction count
- Color by: company (auto-assigned palette), project color, lead stage
- Pan, zoom, hover tooltips, click to open detail
- Performance: max 500 nodes, pagination for larger datasets

### #436 Louvain community detection (3 pts)

- `petgraph` crate for graph algorithms
- Louvain modularity optimization for community clustering
- `POST /api/v1/graph/compute` -- compute clusters, cache result
- `crm_graph_cache` table: org_id, level, layout JSON
- Cluster labels from most common company or tag

### #437 Four zoom levels (3 pts)

- Level 1: Community clusters (circles with member count)
- Level 2: Companies within cluster
- Level 3: Contacts within company
- Level 4: Ego-centric (single contact + all connections)
- Smooth transitions between levels
- Breadcrumb: Cluster > Company > Contact

**Points:** 14

---

## Phase 6 -- Platform Integration (Days 21-23)

### #438 CRM in platform admin sidebar (3 pts)

- Add "CRM" section to BrickOS platform admin GUI
- Show: contact count, company count, active projects, capture queue size
- Quick stats dashboard in platform admin
- Org-scoped: each org admin sees their CRM stats

### #439 NOSTR NIP-02 contact list export (3 pts)

- `GET /api/v1/contacts/export?format=nostr-nip02`
- Export contacts with `nostr_pubkey` as NIP-02 contact list JSON
- Only contacts with known pubkeys
- Include petname from CRM contact name

### #440 Lightning address per contact (2 pts)

- Add `lightning_address` field to `crm_contacts`
- Display on contact detail page
- "Pay" button generates Lightning invoice via brickos-billing (Strike)
- Track payments per contact/project

### #441 Sovereign Link integration (2 pts)

- "Create short link" button on contact/project detail
- Calls Sovereign Link API via service account
- Track link clicks per contact/project
- QR code generation for contact sharing

**Points:** 10

---

## RC + Deploy (Days 24-25)

### Release checklist
- Full E2E Playwright suite on staging
- All 50+ API endpoints tested
- PWA install tested on mobile
- Camera capture tested on Android + iOS
- Meeting recording tested
- Graph performance tested with 100+ contacts
- Search tested with bilingual content
- Production database creation + migration
- Production deploy + 24h monitoring
- Sprint artifacts: retro, release notes

---

## Summary

| Phase | Description | Days | Issues | Points |
|-------|-------------|------|--------|--------|
| 2A | Infrastructure (AI crate, PWA, dev stack) | 1-3 | #413, #416, #417, #418 | 14 |
| 2B | Camera-to-CRM pipeline | 4-7 | #419, #420, #421, #422 | 19 |
| 2C | Search + import/export | 8-10 | #423, #424, #425, #426 | 14 |
| 3 | Meeting intelligence | 11-14 | #427, #428, #429, #430 | 16 |
| 4 | Quick capture + lead pipeline | 15-17 | #431, #432, #433, #434 | 18 |
| 5 | Relationship graph | 18-20 | #435, #436, #437 | 14 |
| 6 | Platform integration | 21-23 | #438, #439, #440, #441 | 10 |
| RC | Testing + deploy | 24-25 | -- | 0 |
| **Total** | | **25 days** | **29 issues** | **105 pts** |

---

## Critical Path

```
Day 1-3:   brickos-ai crate + PWA + migrations + dev stack
  -> Day 4-7:   Camera capture + AI extraction + interactions timeline
    -> Day 8-10:  Search + vCard + smart lists + enrichment
      -> Day 11-14: Meeting recording + Whisper + summary
        -> Day 15-17: Quick capture queue + Kanban pipeline
          -> Day 18-20: Relationship graph + community detection
            -> Day 21-23: Platform integration
              -> Day 24-25: RC + production deploy
```

**Parallel tracks:**
- #416 (dev stack) is independent, can run anytime
- #424 (vCard import/export) independent of AI pipeline
- #433 (Kanban) independent of meeting intelligence
- #435-437 (graph) independent of quick capture

---

## Definition of Done

- [ ] brickos-ai crate: Anthropic + Ollama with fallback chain
- [ ] PWA installable on mobile, camera capture works
- [ ] Photo -> AI extraction -> contacts + companies created automatically
- [ ] Full-text search across all entities (Ctrl+K)
- [ ] vCard 4.0 export/import working
- [ ] Meeting recording + Whisper transcription + AI summary
- [ ] Action items extracted with assignee and due dates
- [ ] Quick capture inbox with background processing
- [ ] Lead pipeline Kanban with drag-and-drop
- [ ] Relationship graph with community clustering
- [ ] CRM visible in BrickOS platform admin
- [ ] NOSTR + Lightning integration
- [ ] All endpoints E2E tested
- [ ] Staging + production deployed
