# 017 -- Sovereign CRM: Contact Intelligence for BrickOS

**Status:** Draft v4
**Author:** Helmut / Claude
**Date:** 2026-04-08
**Related:** 001-sovereign-stack-vision, 014-brickos-platform-gui, 015-brickos-unified-app-routing, 007-sovereign-voice, 002-nostr-bitchat-integration
**Source:** sovereign-crm-spec.docx (Helmut Schindlwick, April 2026)

---

## 1. Concept Analysis

### What the Spec Describes

Sovereign CRM is a privacy-first, self-hosted contact relationship management system. The core innovation is a **frictionless email ingestion pipeline**: photograph an email on your phone, upload via PWA, and a local AI model extracts contacts, organisations, topics, and relationships -- without any PII leaving the infrastructure.

Key entities: **Contacts** (keyed by email), **Organisations** (keyed by domain), **Projects** (user-created groupings), **Interactions** (immutable email events). Data is exportable as vCard 4.0 and JSON.

### Core Innovation

The spec's unique value proposition is the **camera-to-CRM pipeline**: snap a photo of an email, and AI builds your relationship graph. No manual data entry, no cloud OCR, no third-party PII processing. This is genuinely novel -- no existing CRM (Salesforce, HubSpot, Monica, or Twenty) offers anything like it.

### Where the Spec Needs Adaptation for BrickOS

The spec was written as a **standalone** application. To integrate into BrickOS, we:

1. Replace standalone auth with BrickOS platform auth (`brickos-auth` crate: JWT, Argon2, TOTP MFA)
2. Replace SQLCipher with PostgreSQL + per-field AES-256-GCM (`brickos-crypto` Encryptor, "v1:{iv}:{ciphertext}" format)
3. Replace Caddy with existing nginx routing (`app.brickos.io/crm/*`)
4. Integrate with all shared crates (`brickos-db`, `brickos-email`, `brickos-billing`)
5. Add multi-tenant support (org-scoped contacts, not single-user)
6. Connect to platform admin GUI (design 014/016)
7. Leverage platform AI config (Anthropic/OpenAI/Ollama, AI-agnostic)
8. **Extend** beyond the spec: meeting transcription, quick capture, universal search, tagging, lead funnels

---

## 2. Pillar Placement: Data (`apps/data/sovereign-crm/`)

CRM is a data governance app. It answers the Data pillar's core question: "Can I govern and preserve information without centralized platforms?" Contacts, relationships, meeting recordings, and interaction history are personal data that today lives in Salesforce, HubSpot, or Google Contacts.

```
apps/
  data/
    sovereign-proposal-platform/     # existing -- governs document/decision data
    sovereign-crm/                   # new -- governs relationship/contact data
      api/                           # Rust/Axum API crate
        src/
          main.rs
          config.rs
          handlers/
          models/
          services/
          middleware/
        migrations/
        Cargo.toml
      frontend/                      # Next.js 16 PWA (same stack as SHI)
        src/
          app/
          components/
          lib/
        package.json
      ops/
        deploy.sh
        docker-compose.prod.yml
        docker-compose.staging.yml
```

---

## 3. Feature Overview

### 3.1 Core CRM (from original spec, adapted)

**Email Ingestion Pipeline**
- Camera capture on mobile via PWA (`<input capture="environment">`)
- Drag-and-drop upload on desktop (PNG, JPG, WEBP)
- Client-side AES-256-GCM encryption before upload (Web Crypto API)
- Server-side decrypt-in-memory, zeroize after processing (`brickos-crypto`)
- AI extraction (from/to/cc, date, subject, roles, orgs) -- provider-agnostic (section 12)
- Smart deduplication: enrich existing contacts, never duplicate
- Name enrichment: prefer longer, more complete names
- Processing status indicator in PWA

**Contact Management**
- Contact CRUD + manual entry form (no image required)
- Contact detail view: name, role, companies, email, first/last seen, topics, tags, interaction history
- Notes field (Markdown) per contact
- Contact-Company is many-to-many (consultants, job changes -- junction table with role history)
- Contact list (card grid, sortable by interaction count, last seen, name)

**Company Management**
- Auto-create from email domain on ingestion
- Company name inference from AI extraction
- Company detail view with member contacts
- Notes field (Markdown) per company

**Project Management**
- Create/edit/delete projects with name, description, colour
- Assign contacts to projects (many-to-many)
- Tag interactions to projects
- Notes field (Markdown) per project
- Colour-coded project indicators throughout UI

**Web Profile Enrichment**
- On contact creation, check public web profiles: LinkedIn, NOSTR (NIP-05), GitHub, company website
- Store discovered profile URLs on the contact record
- AI-generated brief summary of the person (1-3 sentences from public data)
- Server-side lookups only, cached 30 days, rate-limited 1 req/10s
- User can trigger "re-enrich" manually

**Data Export & Import**
- vCard 4.0 export (individual, company-level, all)
- JSON full-dataset export with schema version
- JSON import (restore/seed)
- vCard 3.0/4.0 import

### 3.2 Meeting Intelligence (NEW)

Record, transcribe, and summarize meetings -- all locally processed.

**Audio Recording & Transcription**
```
┌──────────────────────────────────────────────────────────────────┐
│  New Meeting                                          [Record]  │
│  ────────────────────────────────────────────────────────        │
│                                                                  │
│  Title: [Q1 Strategy Call with Pega________________]            │
│  Project: [Q1 Deal ▾]                                           │
│  Attendees: [+ Add from contacts or photo]                      │
│                                                                  │
│  ┌───────────────────────────────────────────────────┐          │
│  │  [REC] 00:14:32        ████████████░░░░░  -12dB   │          │
│  │                                                   │          │
│  │  [Pause]  [Stop & Transcribe]                     │          │
│  └───────────────────────────────────────────────────┘          │
│                                                                  │
│  Or: [Upload audio file]  (MP3, M4A, WAV, OGG, WebM)           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

- Record audio directly in the PWA (MediaRecorder API, WebM/Opus)
- Upload pre-recorded audio files (MP3, M4A, WAV, OGG)
- Client-side encryption before upload (same AES-256-GCM flow as images)
- Transcription via Whisper model (local Ollama or cloud provider)
- AI-generated meeting summary (key decisions, action items, follow-ups)
- Transcript is searchable, timestamped, and speaker-attributed where possible

**Meeting Notes**

After transcription, the system produces structured meeting intelligence:

```
┌──────────────────────────────────────────────────────────────────┐
│  Meeting: Q1 Strategy Call with Pega                             │
│  2026-04-08 14:00 -- 14:45 (45 min)                             │
│  Project: Q1 Deal    Tags: #strategy #pricing #timeline          │
│  ────────────────────────────────────────────────────────        │
│                                                                  │
│  Attendees                                                       │
│  [Markus M.] [Sandra K.] [Thomas W.] [You]                      │
│                                                                  │
│  [ Summary | Transcript | Action Items | Notes ]                 │
│  ────────────────────────────────────────────────────────        │
│                                                                  │
│  SUMMARY (AI-generated)                                          │
│  Pega agreed to the revised pricing model. Sandra will send      │
│  the updated contract by Friday. Timeline: pilot starts May 1.   │
│  Open question: data residency requirements for EU customers.    │
│                                                                  │
│  ACTION ITEMS                                                    │
│  [ ] Sandra: send updated contract (due 2026-04-11)              │
│  [ ] Markus: confirm EU data residency with legal                │
│  [ ] You: prepare pilot onboarding checklist                     │
│                                                                  │
│  KEY TOPICS                                                      │
│  #pricing  #contract  #pilot  #data-residency  #timeline         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

- Summary saved as structured record (encrypted at rest)
- Auto-tagged with key topics extracted from transcript
- Action items extracted with assignee (mapped to CRM contacts) and due dates
- Linked to attendees (contacts), project, and company
- Manual notes field for user's own additions
- Audio file optionally retained (encrypted) or deleted after transcription

**Attendee Capture**
- Photograph a meeting invite (calendar screenshot, email) and AI extracts attendee list
- Match attendees to existing CRM contacts by name/email
- Create new contacts for unknown attendees
- Same camera-to-CRM pipeline as email ingestion, reused for invites

### 3.3 Universal Tagging System (NEW)

Tags are first-class objects that span all entity types. They enable cross-cutting categorization independent of projects.

**What Can Be Tagged**
- Contacts (#vip, #partner, #lead, #speaker)
- Companies (#enterprise, #startup, #competitor)
- Projects (#active, #paused, #won, #lost)
- Interactions (#follow-up-needed, #contract, #proposal)
- Meetings (#strategy, #pricing, #technical)
- Captures (#conference, #lead, #business-card)

**Tag Features**
- Free-form text tags (lowercase, hyphenated: `#btc-prague`, `#q1-deal`)
- AI auto-suggests tags on ingestion/transcription (user confirms or dismisses)
- Tag cloud view: see all tags with usage count
- Filter any list by one or more tags (AND/OR)
- Tag-based smart lists: "All contacts tagged #vip who haven't been contacted in 30 days"
- Tags are org-scoped (each org has its own tag namespace)
- Tags in URL query params for deep linking: `/crm/contacts?tags=vip,partner`

**Data Model**
```sql
CREATE TABLE crm_tags (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES organizations(id),
    name        TEXT NOT NULL,                                -- lowercase, trimmed
    color       TEXT,                                         -- optional hex color
    usage_count INTEGER DEFAULT 0,                            -- denormalized for quick display
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, name)
);

CREATE TABLE crm_taggings (
    tag_id      UUID NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,                                -- 'contact', 'company', 'project', 'interaction', 'meeting', 'capture'
    entity_id   UUID NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tag_id, entity_type, entity_id)
);
CREATE INDEX idx_taggings_entity ON crm_taggings(entity_type, entity_id);
```

### 3.4 Universal Search (NEW -- SHI Pattern)

Full-text search across all CRM information objects, displayed as a Google-like results page. Same architecture as SHI search (PostgreSQL tsvector, `ts_rank_cd`, bilingual EN/DE).

**Search Index**

```sql
CREATE TABLE crm_search_index (
    entity_type     TEXT NOT NULL,                           -- 'contact', 'company', 'project', 'interaction', 'meeting', 'capture', 'note'
    entity_id       UUID NOT NULL,
    org_id          UUID NOT NULL REFERENCES organizations(id),
    locale          TEXT NOT NULL DEFAULT 'en',
    title           TEXT NOT NULL,                           -- primary display text
    subtitle        TEXT,                                    -- secondary context
    snippet         TEXT,                                    -- body/content preview (max 200 chars)
    url_path        TEXT NOT NULL,                           -- deep link within CRM
    category_weight REAL NOT NULL DEFAULT 1.0,               -- relevance boost per type
    tsv_document    tsvector NOT NULL,                       -- full-text search vector
    metadata        JSONB,                                   -- entity-specific data for result cards
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(entity_type, entity_id, org_id, locale)
);
CREATE INDEX idx_crm_search_tsv ON crm_search_index USING GIN(tsv_document);
CREATE INDEX idx_crm_search_org ON crm_search_index(org_id, entity_type);
```

**tsvector Weighting per Entity Type**

| Entity | Weight A (title) | Weight B (subtitle) | Weight C (body) | category_weight |
|--------|-----------------|--------------------|--------------------|-----------------|
| Contact | name, email | role, company | notes, topics, AI summary | 1.5 |
| Company | name, domain | - | notes, AI summary | 1.3 |
| Project | name | description | notes | 1.2 |
| Interaction | subject | from/to names | body_snippet | 1.0 |
| Meeting | title | attendee names | transcript, summary, action items | 1.4 |
| Capture | title | project name | text content, notes | 1.1 |
| Tag | tag name | - | - | 0.8 |

**Search Results Page**

```
┌──────────────────────────────────────────────────────────────────┐
│  [Q] pega contract                                               │
│  ────────────────────────────────────────────────────────        │
│                                                                  │
│  42 results for "pega contract"                                  │
│  [ All(42) | Contacts(8) | Meetings(5) | Interactions(22) |     │
│    Companies(1) | Projects(3) | Captures(3) ]                    │
│  ────────────────────────────────────────────────────────        │
│                                                                  │
│  ┌─ MEETING ──────────────────────────────────────────────┐     │
│  │  Q1 Strategy Call with Pega                             │     │
│  │  2026-04-08 -- Sandra K., Markus M., Thomas W.          │     │
│  │  "...agreed to revised pricing. Sandra will send         │     │
│  │   updated contract by Friday..."                         │     │
│  │  #strategy #pricing #contract                            │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌─ INTERACTION ──────────────────────────────────────────┐     │
│  │  Re: Pega Contract Terms v2                             │     │
│  │  From: Sandra K. (Pega) -- 2026-04-05                   │     │
│  │  "...attached the revised contract with updated          │     │
│  │   data residency clause per your request..."             │     │
│  │  Project: Q1 Deal                                        │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌─ CONTACT ──────────────────────────────────────────────┐     │
│  │  Sandra Kowalski -- Senior Account Manager               │     │
│  │  Pega -- 47 interactions -- last seen 2026-04-08         │     │
│  │  "Key contact for Q1 Deal. Handles contract              │     │
│  │   negotiations and pricing..."                           │     │
│  │  #vip #partner                                           │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**API Endpoints** (same pattern as SHI)
```
GET  /api/v1/crm/search?q=pega+contract&type=all&limit=20&offset=0
GET  /api/v1/crm/search/suggest?q=peg&limit=8
POST /api/v1/crm/search/reindex
```

**Features:**
- Ctrl+K overlay with suggestions (recent searches, prefix matching)
- Full results page at `/crm/search?q=...`
- Tab-based filtering by entity type with facet counts
- Result cards with entity-type badges, tags, timestamps, snippets
- Bilingual (EN/DE) via dual tsconfig query (same as SHI)
- Score = `ts_rank_cd(...) * category_weight`
- Reindex triggered on every insert/update/delete, or manual reindex endpoint

### 3.5 Quick Capture Mode (NEW)

A dedicated fast-entry mode for conferences, trade shows, and networking events. Optimized for speed: capture now, organize later.

**Use Case:** You're at BTC Prague. You meet 30 people in 2 days. You collect business cards, take photos, record short voice memos, and jot down notes. Quick Capture lets you dump everything into a project-scoped inbox that you process later.

```
┌──────────────────────────────────────────────────────────────────┐
│  QUICK CAPTURE                              [BTCPrague 2026 ▾]  │
│  ────────────────────────────────────────────────────────        │
│                                                                  │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐                │
│  │ [cam]  │  │ [mic]  │  │ [text] │  │ [file] │                │
│  │ Photo  │  │ Audio  │  │ Note   │  │ Upload │                │
│  └────────┘  └────────┘  └────────┘  └────────┘                │
│                                                                  │
│  Recent captures (12)                          [Process All]    │
│  ────────────────────────────────────────────────────────        │
│                                                                  │
│  ┌─ [photo] Business card -- Jan Muller ──── 14:32 ──────┐     │
│  │  Status: Extracted -- 1 contact created                │     │
│  │  Tags: #btc-prague #speaker                            │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌─ [audio] Voice memo -- "Met CTO of..." ── 14:28 ──────┐     │
│  │  Status: Pending transcription                          │     │
│  │  Tags: #btc-prague                                      │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌─ [text] "Lightning wallet company..." ──── 14:15 ──────┐    │
│  │  Status: Raw note                                        │    │
│  │  Tags: #btc-prague #lightning                             │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─ [photo] Email screenshot -- Panel inv. ── 13:50 ──────┐    │
│  │  Status: Extracted -- 3 contacts, 1 interaction          │    │
│  │  Tags: #btc-prague #panel                                │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Capture Types**
- **Photo:** business card, email screenshot, meeting invite, whiteboard, badge
- **Audio:** voice memo (30s-5min quick recording), full meeting recording
- **Text:** free-form note, quick observation, contact details typed manually
- **File:** uploaded document (PDF, image, vCard)

**Capture Flow**
1. User selects project context (e.g., "BTCPrague 2026") -- optional, can assign later
2. Tap capture type (photo/audio/text/file)
3. Content is encrypted client-side and uploaded immediately
4. System queues for AI processing (extract contacts, transcribe audio, tag)
5. User can add quick tags inline (`#speaker`, `#investor`, `#follow-up`)
6. "Process All" runs AI extraction on all pending captures

**From Captures to Leads**

Captures tagged with a project become the project's **lead pipeline**:

```
┌──────────────────────────────────────────────────────────────────┐
│  Project: BTCPrague 2026                                         │
│  [ Overview | Contacts(34) | Captures(47) | Leads | Notes ]      │
│  ────────────────────────────────────────────────────────        │
│                                                                  │
│  LEAD PIPELINE                                                   │
│                                                                  │
│  Raw (18)        Qualified (9)     Contacted (5)    Won (2)     │
│  ┌──────────┐   ┌──────────┐     ┌──────────┐    ┌──────────┐  │
│  │ Jan M.   │   │ Lisa R.  │     │ Marco T. │    │ Hetzner  │  │
│  │ Alex S.  │   │ Chris B. │     │ Eva K.   │    │ Start9   │  │
│  │ ...+16   │   │ ...+7    │     │ ...+3    │    │          │  │
│  └──────────┘   └──────────┘     └──────────┘    └──────────┘  │
│                                                                  │
│  [Export for Sovereign Voice campaign]                            │
│  [Export as CSV]  [Export as vCard]                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

- Contacts extracted from captures start as "Raw" leads
- User drags through pipeline stages (kanban): Raw -> Qualified -> Contacted -> Won/Lost
- Lead stages are configurable per project
- "Export for Sovereign Voice campaign" creates a NOSTR audience segment in Sovereign Voice for targeted publishing
- "Export as CSV" for external tools, "Export as vCard" for address books

### 3.6 Activity Timeline (NEW)

A unified chronological view across all interaction types -- not just emails.

```
┌──────────────────────────────────────────────────────────────────┐
│  Timeline -- Sandra Kowalski                                     │
│  [ All | Emails | Meetings | Captures | Notes ]                  │
│  ────────────────────────────────────────────────────────        │
│                                                                  │
│  APR 8   Meeting: Q1 Strategy Call (45 min)                      │
│          "Agreed to revised pricing. Pilot starts May 1."        │
│          #strategy #pricing                                      │
│                                                                  │
│  APR 5   Email: Re: Pega Contract Terms v2                       │
│          "...attached the revised contract..."                   │
│          Project: Q1 Deal                                        │
│                                                                  │
│  APR 3   Note: "Sandra mentioned they're evaluating              │
│          competitors. Need to accelerate pilot timeline."         │
│                                                                  │
│  MAR 28  Capture: [photo] Business card at BTCPrague             │
│          #btc-prague                                             │
│                                                                  │
│  MAR 15  Email: Pega Partnership Proposal                        │
│          From: You -> Sandra, Markus                              │
│          Project: Q1 Deal                                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

Every timeline entry is a distinct entity type but displayed uniformly. Filterable by type and tag.

### 3.7 Additional Features

**Smart Lists**
- Saved filter combinations: "VIP contacts not contacted in 30 days", "Open action items", "Leads from BTCPrague"
- Based on tags, date ranges, interaction counts, lead stages
- Each smart list has a URL: `/crm/lists/:id`

**Reminders & Follow-ups**
- "Remind me to follow up with Sandra in 7 days"
- Linked to contacts and/or projects
- Shows in dashboard and as browser notifications (via PushProvider, same as SHI)

**Duplicate Detection**
- On ingestion, flag potential duplicates (fuzzy name match + same company domain)
- Merge UI: side-by-side comparison, pick best fields from each record

**Interaction Logging (Manual)**
- Log non-email interactions: phone calls, in-person meetings, LinkedIn messages
- Quick form: type, contact(s), date, notes, tags
- Feeds into activity timeline and interaction count

---

## 4. Platform Synergies

### 4.1 Synergy Map

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     SOVEREIGN CRM -- PLATFORM SYNERGIES                  │
│                                                                          │
│  ┌──────────────┐        ┌──────────────┐        ┌──────────────┐       │
│  │  Sov. Health  │        │  Sov. CRM    │        │  Sov. Link   │       │
│  │  (SHI)        │<──────>│  Contact     │<──────>│  Short Links │       │
│  │               │ patient│  Intelligence│ share  │              │       │
│  │  Patient =    │ lookup │  Graph       │ links  │  Track who   │       │
│  │  Contact      │        │              │        │  clicked     │       │
│  └──────┬───────┘        └──────┬───────┘        └──────────────┘       │
│         │                       │                                        │
│  ┌──────┴───────┐        ┌──────┴───────┐        ┌──────────────┐       │
│  │  Newsletter   │        │  NOSTR       │        │  Sov. Voice  │       │
│  │  (Platform)   │<───────│  Relay       │<──────>│  (Attention)  │       │
│  │               │ contact│  (NIP-02)    │ publish│              │       │
│  │  CRM contacts │ export │              │ to     │  NOSTR       │       │
│  │  = subscribers│        │  Contact list│ contact│  publishing  │       │
│  └──────────────┘        │  as events   │ graph  │  + BitChat   │       │
│                          └──────────────┘        └──────────────┘       │
│                                                                          │
│  ┌──────────────┐        ┌──────────────┐        ┌──────────────┐       │
│  │  Sov.Identity │        │  Sov. Vote   │        │  Sov. Exch.  │       │
│  │               │<──────>│              │<──────>│              │       │
│  │  DID per      │ verify │  Voters =    │ pay    │  Lightning   │       │
│  │  contact      │        │  contacts    │        │  addr per    │       │
│  └──────────────┘        └──────────────┘        │  contact     │       │
│                                                   └──────────────┘       │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Concrete Integrations

**Sovereign Health (SHI) -- Patient = Contact**
- SHI patients are a subset of CRM contacts. Soft link via email (no cross-app FK).
- **Privacy boundary:** Health data stays in SHI (GDPR Art. 9). CRM only sees the contact shell.

**Sovereign Link -- Contact-Attributed Click Tracking**
- Tag Sovereign Links with CRM contacts/projects. "This contact clicked your proposal link 3x."

**Newsletter (Platform) -- CRM as Subscriber Source**
- Export CRM contacts as newsletter subscribers (with GDPR consent tracking).
- Unsubscribe events flow back to CRM contact record.

**Sovereign Voice (Attention Pillar) -- NOSTR Publishing + BitChat**
- Sovereign Voice (design 007) is the NOSTR content management tool + BitChat mesh comms.
- **CRM -> Voice:** Publish NOSTR notes tagging contacts by npub. Export lead lists as Voice audience segments for targeted campaigns.
- **Voice -> CRM:** NOSTR engagers become suggested CRM contacts (user explicitly imports, not auto-created).
- **BitChat:** Message CRM contacts directly from contact card, even offline.

**NOSTR Relay -- NIP-02 Contact List**
- Export CRM contacts with npubs as Nostr kind:3 contact list events.
- Sovereign social graph: your CRM IS your follow list.

**Sovereign Identity -- DID per Contact**
- Verifiable credentials: contact self-attests their data via Sovereign Link challenge.

**Sovereign Exchange -- Lightning Address per Contact**
- "Pay this contact" button. Invoice tracking per project.

**Sovereign Vote -- Voters from Contact Graph**
- Scope governance votes to a CRM project's contacts.

### 4.3 Shared Infrastructure (Reuse Existing BrickOS Crates)

| Component | BrickOS Integration | Crate / Component |
|-----------|---------------------|-------------------|
| Auth | JWT, Argon2 password, TOTP MFA | `brickos-auth` |
| Database | PostgreSQL + per-field AES-256-GCM ("v1:{iv}:{ciphertext}") | `brickos-db` + `brickos-crypto` Encryptor |
| Email | Mailgun (SaaS) or Log provider (OSS) | `brickos-email` EmailProvider trait |
| Billing | Stripe + Strike Bitcoin (if CRM gets paid tier) | `brickos-billing` |
| AI | Platform AI config (Anthropic/OpenAI/Ollama) | Platform settings + AI Usage tracking |
| Transcription | Whisper via Ollama or cloud provider | Same AI provider hierarchy |
| Reverse proxy | nginx at app.brickos.io/crm/* | design 015 |
| Backup | BrickOS backup gateway | `brickos-backup` |
| Deploy | BrickOS deploy.sh pipeline | Same pattern as SHI ops/ |
| Notifications | ntfy + Telegram dual-dispatch | SHI Notifier pattern |
| Start9 | Optional self-hosted mode | `brickos-startos` |

**Crate dependency:**
```toml
[dependencies]
brickos-auth    = { path = "../../../../crates/brickos-auth" }
brickos-crypto  = { path = "../../../../crates/brickos-crypto" }
brickos-db      = { path = "../../../../crates/brickos-db" }
brickos-email   = { path = "../../../../crates/brickos-email" }
axum            = "0.7"
sqlx            = { version = "0.8", features = ["runtime-tokio", "postgres", "uuid", "chrono"] }
tokio           = { version = "1", features = ["full"] }
jsonwebtoken    = "10"
```

**Frontend stack (identical to SHI):** Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, next-intl, js-cookie, sonner, Recharts + Cytoscape.js.

---

## 5. Lessons from Existing CRM Solutions

### Salesforce
**Learn:** Account/Contact/Activity object model; unified activity timeline; related lists on every detail page.
**Avoid:** 800+ objects; cloud dependency; per-seat pricing; declarative config that becomes unmaintainable.

### HubSpot
**Learn:** Frictionless onboarding (signup to first contact in 60s); kanban deal pipeline; email tracking.
**Avoid:** Cloud lock-in; tracking pixels (we use Sovereign Link instead).

### Monica CRM (Open Source)
**Learn:** Personal relationship focus (birthdays, "how did we meet"); manual activity logging; simplicity (~15 entities).
**Avoid:** PHP stack; zero AI; abandoned development.

### Twenty CRM (Open Source)
**Learn:** Record-based UI; kanban + table views; Cmd+K global search; modern component architecture.
**Avoid:** Over-engineering (full email sync, calendar sync, workflow engine).

### Synthesis: What Makes Sovereign CRM Different

| Feature | Salesforce | HubSpot | Monica | Twenty | **Sovereign CRM** |
|---------|-----------|---------|--------|--------|-------------------|
| AI extraction from photos | No | No | No | No | **Yes** |
| Meeting transcription | Einstein (paid) | No | No | No | **Yes (local Whisper)** |
| Quick capture mode | No | Mobile app | No | No | **Yes (conference mode)** |
| Lead pipeline from captures | No | Yes (cloud) | No | No | **Yes (sovereign)** |
| Universal tagging | Yes | Yes | No | Partial | **Yes** |
| Full-text search | Yes (paid) | Basic | No | Yes | **Yes (SHI pattern)** |
| Self-hosted | No | No | Yes | Yes | **Yes** |
| Zero PII to cloud | No | No | Partial | Partial | **Yes** |
| Client-side encryption | No | No | No | No | **Yes** |
| NOSTR + Lightning | No | No | No | No | **Yes** |
| Multi-app synergy | Own ecosystem | Own | Standalone | Standalone | **BrickOS platform** |
| Offline access | No | No | No | No | **Yes (PWA)** |

---

## 6. Innovative Features Leveraging the Sovereign Stack

### 6.1 Cross-App Contact Enrichment
```
Contact: Sandra Kowalski <sandra@pega.com>
  [CRM]       47 emails, 3 meetings, Project "Q1 Deal", tags: #vip #partner
  [CRM]       Meeting transcript: "agreed to revised pricing" (2026-04-08)
  [SHI]       Patient since 2025-03-01, 12 appointments
  [Link]      Clicked proposal link 3x (last: 2026-04-05)
  [Newsletter] Subscriber, opened 8/12 campaigns
  [Voice]     Top NOSTR engager (12 replies, 5 zaps)
  [Exchange]  Lightning: sandra@getalby.com, 3 payments received
```

### 6.2 Sovereign Contact Verification
- Contact receives Sovereign Link challenge -> self-attests name, role, org
- Sovereign Identity DID anchors the verification -> "Verified" badge on contact card

### 6.3 Conference-to-Campaign Pipeline
```
BTC Prague 2026:
  Quick Capture (47 items) -> AI Extract (34 contacts) -> Lead Pipeline
    -> Qualify (15 hot leads) -> Export to Sovereign Voice
      -> Targeted NOSTR campaign -> Track engagement via Sovereign Link
        -> Follow-up meetings -> Transcribe -> Close deal
```
This is a full sovereign sales funnel from first handshake to closed deal, with zero cloud CRM involvement.

### 6.4 AI-Powered Relationship Insights (Local)
Using local AI model, generate insights without cloud dependency:
- "You haven't contacted anyone at Pega in 45 days."
- "Sandra appears in 3 projects but you've never had a direct 1:1 meeting."
- "Your BTCPrague leads have a 40% qualification rate -- higher than average."
- "Action item overdue: Markus was supposed to confirm EU data residency 5 days ago."

### 6.5 NOSTR-Native Contact Discovery
NIP-05 lookup from email domain -> auto-populate Nostr profile picture, latest notes, mutual contacts via kind:3 follow list.

---

## 7. Relationship Graph -- Technology Deep-Dive

### 7.1 What the Graph Represents

The graph is a **flexible multi-path network**. A contact can belong to multiple companies, participate in multiple projects, and have direct contact-to-contact edges. Meetings add additional edge types.

```
  ┌──────────┐         ┌──────────┐         ┌──────────┐
  │ Company  │         │ Company  │         │ Company  │
  │ Pega     │         │ Sov.Brick│         │ Clinic XY│
  └──┬───┬───┘         └──┬───┬───┘         └────┬─────┘
     │   │                │   │                   │
  employs └──employs──┐   │   │ employs           │ employs
     │                │   │   │                   │
  ┌──┴────┐    ┌──────┴───┴───┴──┐          ┌────┴────┐
  │Contact│    │    Contact      │          │ Contact │
  │Markus │    │    Sandra       │          │ Thomas  │
  └──┬──┬─┘    └──┬──┬──┬───────┘          └──┬──┬───┘
     │  │         │  │  │                      │  │
     │  │  assigned│  │  │ assigned             │  │
     │  │    ┌─────┘  │  └─────┐               │  │
     │  │    │        │        │               │  │
  ┌──┴──┴────┴──┐  ┌──┴────────┴──┐       ┌───┴──┴────┐
  │  Project    │  │  Project     │       │  Project   │
  │  Q1 Deal   │  │  Platform    │       │  Clinic    │
  │             │  │  Launch      │       │  Partner   │
  └──────┬──────┘  └──────────────┘       └────────────┘
         │
    meeting edge
  ┌──────┴──────┐
  │ Meeting     │
  │ Q1 Strategy │
  │ 2026-04-08  │
  └─────────────┘
```

**Nodes:** Contacts, Companies, Projects, Meetings, Interactions, Topics
**Edges:** employs, assigned-to, attended, emailed, shares-topic
**Multi-membership:** A contact can have edges to multiple companies, projects, and topics simultaneously.

### 7.2 Technology

**Decision:** Cytoscape.js for client-side interactive layout. Server-side pre-computation via `petgraph` crate for graphs >5,000 nodes (stored in `crm_graph_cache`).

Why Cytoscape.js:
- Compound nodes (Company contains Contact children)
- Multiple layout algorithms: cose, dagre, circular, concentric, fcose
- Built-in clustering (collapse 50 contacts at Pega into "Pega (50)")
- Zoom/pan performance up to ~10,000 nodes
- Plugins: popper.js tooltips, edgehandles

### 7.3 Multi-Level Drill-Down

4 zoom levels, each a deep-linkable URL:

```
Level 0 -- Clusters (auto-detected via Louvain community detection)
  /crm/graph?level=clusters

Level 1 -- Companies (company nodes + inter-company edges)
  /crm/graph?level=companies
  Node size = total contacts, edge thickness = cross-company interactions

Level 2 -- Contacts (expand one company)
  /crm/graph?level=contacts&expand=:company_id
  Internal edges show who-emailed-who, who-attended-meeting-with-who

Level 3 -- Contact Detail (ego-centric: one contact in center, all connections)
  /crm/graph?focus=:contact_id
  Shows: companies, projects, meetings, topics, direct contacts
```

### 7.4 Graph Filtering

All filters in URL query params:
```
/crm/graph?level=contacts&project=uuid&tags=vip,partner&since=2026-01&min_interactions=3
```

- By project, company, tag, time range, interaction threshold, topic keyword

### 7.5 Graph API

```
GET /api/v1/crm/graph/clusters
GET /api/v1/crm/graph/companies
GET /api/v1/crm/graph/companies/:id
GET /api/v1/crm/graph/contacts/:id
GET /api/v1/crm/graph/projects/:id
GET /api/v1/crm/graph/search?q=pega
```

---

## 8. Data Model

PostgreSQL with UUIDs and per-field AES-256-GCM via `brickos-crypto` Encryptor.

### 8.1 Tables

```sql
-- Contacts (many-to-many with companies via junction table)
CREATE TABLE crm_contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    email           TEXT NOT NULL,                                -- encrypted
    name            TEXT NOT NULL,                                -- encrypted
    first_seen      TIMESTAMPTZ NOT NULL,
    last_seen       TIMESTAMPTZ NOT NULL,
    interaction_count INTEGER DEFAULT 0,
    topics          JSONB DEFAULT '[]',                           -- encrypted
    notes           TEXT,                                         -- encrypted, Markdown
    -- Web profile enrichment
    linkedin_url    TEXT,                                         -- encrypted
    nostr_npub      TEXT,                                         -- encrypted
    github_url      TEXT,                                         -- encrypted
    website_url     TEXT,                                         -- encrypted
    ai_summary      TEXT,                                         -- encrypted
    enriched_at     TIMESTAMPTZ,
    -- Sovereign integrations
    lightning_addr  TEXT,                                         -- encrypted
    did_uri         TEXT,                                         -- encrypted
    verified        BOOLEAN DEFAULT FALSE,
    verified_at     TIMESTAMPTZ,
    -- Lead pipeline
    lead_stage      TEXT,                                         -- NULL, 'raw', 'qualified', 'contacted', 'won', 'lost'
    lead_project_id UUID REFERENCES crm_projects(id),            -- which project's pipeline
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, email)
);

-- Contact-Company (many-to-many with role history)
CREATE TABLE crm_contact_companies (
    contact_id      UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
    company_id      UUID NOT NULL REFERENCES crm_companies(id) ON DELETE CASCADE,
    role            TEXT,                                         -- encrypted, role at THIS company
    is_primary      BOOLEAN DEFAULT FALSE,
    started_at      TIMESTAMPTZ,
    ended_at        TIMESTAMPTZ,                                 -- NULL = current
    notes           TEXT,                                         -- encrypted
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (contact_id, company_id)
);

-- Companies
CREATE TABLE crm_companies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    domain          TEXT NOT NULL,                                -- encrypted
    name            TEXT NOT NULL,                                -- encrypted
    website_url     TEXT,                                         -- encrypted
    linkedin_url    TEXT,                                         -- encrypted
    notes           TEXT,                                         -- encrypted, Markdown
    ai_summary      TEXT,                                         -- encrypted
    enriched_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, domain)
);

-- Projects
CREATE TABLE crm_projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    name            TEXT NOT NULL,
    description     TEXT,
    color           TEXT NOT NULL DEFAULT '#F97316',
    notes           TEXT,                                         -- Markdown
    -- Lead pipeline config
    lead_stages     JSONB DEFAULT '["raw","qualified","contacted","won","lost"]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contact-Project (many-to-many)
CREATE TABLE crm_contact_projects (
    contact_id      UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
    project_id      UUID NOT NULL REFERENCES crm_projects(id) ON DELETE CASCADE,
    notes           TEXT,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (contact_id, project_id)
);

-- Interactions (immutable email events)
CREATE TABLE crm_interactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    date            TIMESTAMPTZ NOT NULL,
    subject         TEXT NOT NULL,                                -- encrypted
    from_contact    UUID NOT NULL REFERENCES crm_contacts(id),
    to_contacts     UUID[] NOT NULL,
    cc_contacts     UUID[],
    project_id      UUID REFERENCES crm_projects(id),
    body_snippet    TEXT,                                         -- encrypted
    notes           TEXT,                                         -- encrypted
    source_type     TEXT NOT NULL DEFAULT 'email_screenshot',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Meetings
CREATE TABLE crm_meetings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    title           TEXT NOT NULL,                                -- encrypted
    date            TIMESTAMPTZ NOT NULL,
    duration_mins   INTEGER,
    project_id      UUID REFERENCES crm_projects(id),
    attendee_ids    UUID[] NOT NULL,                              -- contact UUIDs
    -- Transcription
    audio_blob_id   UUID,                                        -- ref to encrypted blob storage
    transcript      TEXT,                                         -- encrypted, timestamped text
    summary         TEXT,                                         -- encrypted, AI-generated
    action_items    JSONB DEFAULT '[]',                           -- [{assignee_id, text, due_date, done}]
    key_topics      TEXT[] DEFAULT '{}',                          -- extracted topic strings
    -- Metadata
    notes           TEXT,                                         -- encrypted, Markdown
    ai_provider     TEXT,                                         -- which model transcribed/summarized
    processing_ms   INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quick Captures
CREATE TABLE crm_captures (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    user_id         UUID NOT NULL,
    project_id      UUID REFERENCES crm_projects(id),
    capture_type    TEXT NOT NULL,                                -- 'photo', 'audio', 'text', 'file'
    title           TEXT,                                         -- encrypted, auto or user-set
    content_text    TEXT,                                         -- encrypted, for text captures
    blob_id         UUID,                                        -- ref to encrypted blob (photo/audio/file)
    mime_type       TEXT,
    -- Processing
    status          TEXT NOT NULL DEFAULT 'pending',              -- 'pending', 'processing', 'extracted', 'failed'
    extracted_contacts UUID[] DEFAULT '{}',                       -- contacts created/enriched from this capture
    extracted_interaction_id UUID REFERENCES crm_interactions(id),
    extracted_meeting_id UUID REFERENCES crm_meetings(id),
    notes           TEXT,                                         -- encrypted
    ai_provider     TEXT,
    processing_ms   INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tags
CREATE TABLE crm_tags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    name            TEXT NOT NULL,
    color           TEXT,
    usage_count     INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(org_id, name)
);

-- Polymorphic tagging
CREATE TABLE crm_taggings (
    tag_id          UUID NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,
    entity_type     TEXT NOT NULL,
    entity_id       UUID NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tag_id, entity_type, entity_id)
);
CREATE INDEX idx_taggings_entity ON crm_taggings(entity_type, entity_id);

-- Reminders
CREATE TABLE crm_reminders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    user_id         UUID NOT NULL,
    contact_id      UUID REFERENCES crm_contacts(id),
    project_id      UUID REFERENCES crm_projects(id),
    title           TEXT NOT NULL,
    due_at          TIMESTAMPTZ NOT NULL,
    done            BOOLEAN DEFAULT FALSE,
    done_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Smart Lists (saved filters)
CREATE TABLE crm_smart_lists (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    user_id         UUID NOT NULL,
    name            TEXT NOT NULL,
    filters         JSONB NOT NULL,                              -- {tags:[], min_interactions:N, lead_stage:..., last_contacted_before:...}
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Search index (SHI pattern)
CREATE TABLE crm_search_index (
    entity_type     TEXT NOT NULL,
    entity_id       UUID NOT NULL,
    org_id          UUID NOT NULL REFERENCES organizations(id),
    locale          TEXT NOT NULL DEFAULT 'en',
    title           TEXT NOT NULL,
    subtitle        TEXT,
    snippet         TEXT,
    url_path        TEXT NOT NULL,
    category_weight REAL NOT NULL DEFAULT 1.0,
    tsv_document    tsvector NOT NULL,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(entity_type, entity_id, org_id, locale)
);
CREATE INDEX idx_crm_search_tsv ON crm_search_index USING GIN(tsv_document);
CREATE INDEX idx_crm_search_org ON crm_search_index(org_id, entity_type);

-- Graph cache (pre-computed for >5,000 nodes)
CREATE TABLE crm_graph_cache (
    org_id          UUID NOT NULL REFERENCES organizations(id),
    level           TEXT NOT NULL,
    node_positions  JSONB NOT NULL,
    edge_data       JSONB NOT NULL,
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (org_id, level)
);

-- Ingestion log (append-only audit)
CREATE TABLE crm_ingestion_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    user_id         UUID NOT NULL,
    source_type     TEXT NOT NULL,                                -- 'email_screenshot', 'meeting_audio', 'capture', 'manual', 'import'
    contacts_created  INTEGER NOT NULL DEFAULT 0,
    contacts_enriched INTEGER NOT NULL DEFAULT 0,
    entity_type     TEXT,                                         -- what was created
    entity_id       UUID,
    ai_provider     TEXT NOT NULL DEFAULT 'ollama',
    processing_ms   INTEGER NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 8.2 Entity Count Summary

| Table | Purpose | Notes on |
|-------|---------|----------|
| crm_contacts | People | Markdown notes, web profiles, lead stage |
| crm_contact_companies | Contact<->Company (M:N) | Role per company, date range, notes |
| crm_companies | Organizations by domain | Markdown notes, AI summary |
| crm_projects | User-created groupings | Markdown notes, lead stage config |
| crm_contact_projects | Contact<->Project (M:N) | Assignment notes |
| crm_interactions | Email events (immutable) | Annotation notes |
| crm_meetings | Recorded/transcribed meetings | Transcript, summary, action items, notes |
| crm_captures | Quick capture inbox items | Photo/audio/text/file, processing status |
| crm_tags | Tag definitions | Org-scoped, usage count |
| crm_taggings | Polymorphic tag assignments | Any entity type |
| crm_reminders | Follow-up reminders | Contact/project scoped |
| crm_smart_lists | Saved filter combinations | JSONB filter spec |
| crm_search_index | Full-text search (SHI pattern) | tsvector, bilingual |
| crm_graph_cache | Pre-computed graph layouts | For large orgs |
| crm_ingestion_log | Audit trail | AI provider tracking |

**15 tables total.** Every entity with user-visible content has a `notes` field (encrypted Markdown).

---

## 9. URL Routing

Full standalone app with login, settings, and navigation -- same pattern as SHI.

```
AUTH
/crm/login                                -> Login (email/password + MFA)
/crm/register                             -> Registration
/crm/forgot-password                      -> Password reset

DASHBOARD
/crm/                                     -> redirect to /dashboard
/crm/dashboard                            -> Stats, recent activity, due reminders

INGESTION
/crm/ingest                               -> Camera/upload ingestion page
/crm/capture                              -> Quick Capture mode
/crm/capture?project=:id                  -> Quick Capture scoped to project

CONTACTS
/crm/contacts                             -> Contact list (grid/table)
/crm/contacts?tags=vip,partner            -> Filtered by tags
/crm/contacts/new                         -> Manual entry form
/crm/contacts/:id                         -> Contact detail (overview)
/crm/contacts/:id/timeline                -> Activity timeline
/crm/contacts/:id/projects                -> Project assignments
/crm/contacts/:id/web                     -> Web profiles
/crm/contacts/:id/notes                   -> Notes (Markdown)

COMPANIES
/crm/companies                            -> Company list
/crm/companies/:id                        -> Company detail
/crm/companies/:id/contacts               -> Company members
/crm/companies/:id/notes                  -> Company notes

PROJECTS
/crm/projects                             -> Project list
/crm/projects/:id                         -> Project detail (overview)
/crm/projects/:id/contacts                -> Project contacts
/crm/projects/:id/timeline                -> Project timeline
/crm/projects/:id/captures                -> Project captures
/crm/projects/:id/leads                   -> Lead pipeline (kanban)
/crm/projects/:id/notes                   -> Project notes

MEETINGS
/crm/meetings                             -> Meeting list
/crm/meetings/new                         -> New meeting (record or upload)
/crm/meetings/:id                         -> Meeting detail (summary)
/crm/meetings/:id/transcript              -> Full transcript
/crm/meetings/:id/actions                 -> Action items
/crm/meetings/:id/notes                   -> Meeting notes

VIEWS
/crm/timeline                             -> Global activity timeline
/crm/topics                               -> Topic cluster view
/crm/tags                                 -> Tag cloud / management
/crm/graph                                -> Relationship graph
/crm/graph?level=companies                -> Company-level graph
/crm/graph?focus=:id                      -> Ego-centric contact graph
/crm/lists                                -> Smart lists
/crm/lists/:id                            -> Smart list results

SEARCH
/crm/search?q=pega+contract               -> Full results page
/crm/search?q=pega&type=meetings          -> Filtered by type

DATA
/crm/export                               -> Export (vCard, JSON)
/crm/import                               -> Import (vCard, JSON)

USER SETTINGS
/crm/settings                             -> redirect to /settings/profile
/crm/settings/profile                     -> Name, avatar
/crm/settings/security                    -> MFA, password, sessions
/crm/settings/preferences                 -> Theme (dark/light), language (EN/DE), notifications
/crm/settings/enrichment                  -> Web enrichment on/off, AI provider display
```

---

## 10. AI Strategy -- Platform-Agnostic with Local Fallback

### 10.1 AI Provider Hierarchy

```
Priority 1: Platform-configured cloud provider (Anthropic/OpenAI)
  - Configured in /platform/system/settings/ai
  - Fastest: 2-5s per extraction

Priority 2: BrickOS-hosted Ollama (shared VPS instance)
  - llama3.2-vision:11b on brickos.io CAX41
  - Always-available sovereign fallback: 8-30s

Priority 3: Local standalone Ollama (user's hardware / Start9)
  - For air-gapped / fully self-hosted deployments

Priority 4: Tesseract OCR + text LLM
  - When all vision models unavailable: 5-15s, lower accuracy
```

### 10.2 AI Tasks

| Task | Model | Frequency | Sovereignty |
|------|-------|-----------|-------------|
| Email screenshot extraction | Vision (multimodal) | Per ingestion | Critical (PII) |
| Business card extraction | Vision (multimodal) | Per capture | Critical (PII) |
| Meeting invite extraction | Vision (multimodal) | Per capture | Critical (PII) |
| Audio transcription | Whisper (speech-to-text) | Per meeting/capture | Critical (PII) |
| Meeting summary + action items | Text LLM | Per transcription | High |
| Contact/company AI summary | Text LLM | On enrichment | Medium (public data) |
| Tag auto-suggestion | Text LLM | On any ingestion | Medium |
| Relationship insights | Text LLM | On-demand | High (full graph context) |
| Topic clustering | Embeddings or text LLM | Background job | Medium |

**Key principle:** PII tasks (screenshots, audio, meetings) prefer local AI. Public-data tasks (web enrichment) can use cloud AI with user consent.

### 10.3 AI Usage Tracking

All AI calls logged in `crm_ingestion_log` with `ai_provider` field. Reported to Platform AI Usage dashboard for cost tracking, latency monitoring, sovereignty audit.

---

## 11. Full App Shell (SHI Pattern)

The CRM is a complete standalone app, not just an admin panel.

**Login:** email/password + MFA (TOTP, recovery codes) via `brickos-auth`
**Navbar:** sticky header with logo, navigation, user avatar + dropdown (account settings, MFA, theme toggle dark/light, language EN/DE, logout)
**Root layout providers** (same as SHI):
```
NextIntlClientProvider > ThemeProvider > AuthProvider > InstallProvider >
  OfflineProvider > SyncProvider > PushProvider > ContentProvider
```
**Settings tabs:** Profile, Security (MFA), Preferences (theme, language, notifications), Enrichment (web lookup toggle)
**Search:** Ctrl+K overlay with suggestions + full results page
**Mobile:** responsive layout, hamburger menu, slide-in nav

---

## 12. Architecture Decisions (Resolved)

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Keep client-side image encryption** | Defense in depth. Server receives only ciphertext. Structured data uses server-side `brickos-crypto` per-field encryption. |
| D2 | **PostgreSQL everywhere** | Consistent with SHI. Per-field AES-256-GCM replaces SQLCipher whole-DB encryption. |
| D3 | **Client-side graph layout + server pre-computation >5,000 nodes** | Cytoscape.js interactive in browser. Louvain clustering via `petgraph` server-side for large orgs. |
| D4 | **Multi-user from day one** | BrickOS is multi-tenant. Every table has `org_id`. |
| D5 | **Contact-Company is many-to-many** | Consultants, job changes. Junction table with role history. |
| D6 | **SHI search pattern for universal search** | PostgreSQL tsvector, ts_rank_cd, bilingual, category_weight. Proven at scale in SHI. |
| D7 | **Whisper for transcription** | Runs via Ollama (local) or cloud. Same provider hierarchy as vision extraction. |
| D8 | **Tags are polymorphic** | Single `crm_taggings` table with `entity_type` + `entity_id`. Simpler than N join tables. |

---

## 13. Implementation Roadmap

### Phase 1 -- Foundation + App Shell (3 weeks)

- Rust API crate: `sovereign-crm-api` in `apps/data/sovereign-crm/api/`
- PostgreSQL migrations (contacts, companies, projects, interactions, tags, search_index)
- Integration with `brickos-auth`, `brickos-db`, `brickos-crypto`, `brickos-email`
- Full app shell: login, MFA, user settings, navbar, theme, i18n
- AI-agnostic ingestion endpoint (cloud -> Ollama -> Tesseract fallback)
- Basic CRUD for contacts, companies, projects (all with notes, tags)
- Manual contact entry form
- PWA scaffold with camera capture and drag-and-drop upload
- Client-side AES-256-GCM encryption
- Universal tagging system
- Deploy to staging

### Phase 2 -- CRM Core + Search (3 weeks)

- All views: contacts grid, companies list, projects list, timeline, topics, tag cloud
- Contact detail page with full relationship context + web profiles
- Web profile enrichment (LinkedIn, NOSTR, GitHub)
- AI-generated contact/company summaries
- Full-text search (SHI pattern): search index, suggest endpoint, results page, Ctrl+K overlay
- vCard 4.0 + JSON export/import
- Project assignment UI
- Search reindexing on every CRUD operation

### Phase 3 -- Meeting Intelligence (2-3 weeks)

- Audio recording in PWA (MediaRecorder API)
- Audio file upload (MP3, M4A, WAV, OGG)
- Whisper transcription (local Ollama or cloud)
- AI meeting summary + action item extraction
- Meeting detail page (summary, transcript, actions, notes tabs)
- Meeting invite photo extraction (attendee capture)
- Meeting entries in activity timeline
- Search index integration for transcripts and summaries

### Phase 4 -- Quick Capture + Lead Pipeline (2 weeks)

- Quick Capture UI (photo/audio/text/file, project-scoped)
- Capture processing queue (AI extraction in background)
- Lead stage tracking on contacts (raw -> qualified -> contacted -> won/lost)
- Kanban lead pipeline view per project
- "Export for Sovereign Voice campaign" integration
- Smart lists (saved filters)
- Reminders + follow-ups

### Phase 5 -- Relationship Graph (2 weeks)

- Cytoscape.js graph with 4 zoom levels
- Louvain community detection via `petgraph`
- Graph API endpoints
- Interactive drill-down, filtering, search within graph
- Pre-computed cache for large orgs

### Phase 6 -- Platform Integration + Sovereign Features (2 weeks)

- Platform admin: CRM in APPS sidebar group
- AI Usage tracking (provider breakdown)
- Audit log + health endpoint integration
- Newsletter subscriber sync
- Sovereign Link integration
- NOSTR NIP-02 export
- Lightning address + payment link
- Contact verification via Sovereign Link
- Sovereign Voice audience export
- Offline PWA with Service Worker + IndexedDB
- GDPR erasure endpoint with cascade

---

## 14. Open Questions

### Product

1. **Web enrichment consent.** Blanket "enable web enrichment" setting with per-contact opt-out? Or explicit consent per contact?

2. **Web enrichment rate limiting.** LinkedIn rate-limits scrapers. Cache 30 days, 1 req/10s, public URLs only?

3. **Notes field format.** Plain text, Markdown, or rich text editor? Recommend Markdown with live preview.

4. **Audio storage.** Retain encrypted audio after transcription (disk cost), or delete and keep only transcript? Recommend: user choice per meeting, default retain 90 days.

5. **Whisper model selection.** whisper-large-v3 (best accuracy, 3GB) vs whisper-medium (balanced, 1.5GB) vs whisper-small (fast, 500MB). Recommend: medium as default, configurable.

### Integration

6. **SHI patient overlap.** Soft link via email (no cross-app FK). CRM and SHI remain separate databases.

7. **Newsletter consent.** Explicit opt-in toggle per contact with GDPR Article 7 timestamp.

8. **Org-scoped PII.** Platform admins see aggregate stats only, never contact PII.

9. **Voice audience sync.** Queue as "suggested contact" from NOSTR engagement, user explicitly imports.

10. **Action item assignment.** When a meeting action item is assigned to a CRM contact, should they receive a notification (via email or NOSTR DM)? Or is it internal-only tracking?
