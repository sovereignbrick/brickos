# Design: Sovereign Health Search

**Issue:** [#308](https://github.com/sovereignbrick/brickos/issues/308)
**Status:** Draft
**Date:** 2026-04-05

---

## Problem

Users have no way to quickly find information across the app. Markers, foods, supplements, medications, health zones, calculated marker relationships, Dr. Alex chat history, scientific references, and LOINC data are all siloed in separate views. Users must navigate multiple screens to locate a specific marker, understand which food optimizes it, or find a past Dr. Alex conversation.

The app already holds a rich internal knowledge graph -- marker relations, protocol effects, zone mappings, calculated marker formulas, and curated scientific references. This data should be discoverable through a single search interface that keeps users inside the Sovereign Health ecosystem rather than sending them to external sources.

**Why now:** The platform has 80+ markers, 8 calculated markers, 8 health zones, 100+ foods, 50+ supplements, medication catalogs, and growing Dr. Alex chat histories. Without search, users rely on manual navigation or re-asking Dr. Alex questions that have already been answered.

---

## Design Principles

1. **Sovereign-first** -- Search indexes only data we own or curate inside the app. No external web crawling or third-party search APIs. The user's health data stays within our boundary.
2. **Complement, don't compete with Dr. Alex** -- Search is for fast factual lookups (find a marker, check a food, locate a past conversation). Dr. Alex is for personalized analysis and multi-turn consultations. Search results should offer a "Ask Dr. Alex about this" CTA to bridge the two.
3. **Expose blind spots** -- Search results should surface missing data: markers the user hasn't measured, calculated markers missing base inputs, inconsistencies between manual entries and calculated values. Blind spot detection does NOT consider the user's tier -- instead, use blind spots as CTA to upgrade when the feature is tier-gated.
4. **Bilingual** -- All search works in EN and DE simultaneously. A German query finds English content and vice versa.
5. **Zero hardcoded strings** -- All search UI text comes from `ui_string_translations` and `marker_translations`. No hardcoded text anywhere in the search feature.
6. **Public + Authenticated** -- Generic knowledge search (Tier 1) is accessible without login. User-specific results (Tier 2) and Dr. Alex assistance require authentication.
7. **Mobile + PWA ready** -- Search page must be fully responsive and work in the PWA shell.

---

## Search Scope -- What Gets Indexed

### Tier 1: Core Health Knowledge (static, shared across all users, public access)

| Source Table | Indexed Fields | Result Type |
|---|---|---|
| `marker_translations` | name, description, tooltip, why_it_matters, when_to_worry | Marker |
| `zone_translations` | name, description, short_description | Zone |
| `calculated_markers` | marker_name, formula_description | Calculated Marker |
| `marker_content` | title, body_text -- ALL content_types: `what_is`, `did_you_know`, `health_facts`, `food_for_thought`, `fun_facts`, `how_to_stay_in_range`, `fasting_explanation` | Knowledge Article |
| `marker_foods` | food_name, food_name_de, food_category | Food |
| `marker_supplements` | supplement_name, supplement_name_de, typical_dose, notes | Supplement |
| `marker_tests` | test_name, test_name_de, panel_name, notes | Lab Test |
| `marker_references` | title, source, year | Scientific Reference |
| `marker_relations` | description, direction, clinical_significance (both directions) | Marker Relationship |
| `marker_aliases` | alias (if exists) | Alias -> Marker redirect |
| `protocol_effects` | protocol_name, protocol_description, detail, effect | Protocol Effect |
| `medication_catalog` | name, generic_name, category | Medication |
| `medication_interactions` | description, severity | Medication Interaction |
| `markers` (LOINC) | loinc_code, loinc_system, loinc_class | LOINC Code |
| `reference_ranges` | protocol_context, green_min/max, orange_min/max (system defaults) | Reference Range |
| `diet_protocol_translations` | name, short_description, long_description, category_label | Diet Protocol |
| `eating_pattern_translations` | name, description | Eating Pattern |
| `food_category_translations` | name | Food Category |
| `ui_string_translations` | value (searchable UI strings with context) | UI Content |
| `web_content_translations` | value (all sections, all pages) | Website Content |

**Note on marker detail tiles:** Each marker has up to 7 content tiles (visible in the screenshot: "Did You Know" carousel, "How to Keep [Marker] in Range" checklist, "What Foods Keep [Marker] in Range" with protocol-filtered food list). All `marker_content` content_types are indexed individually so each tile is a separate search result, linking back to the specific tile section on the marker detail page.

### Tier 2: User-Specific Data (per-user, requires auth)

| Source Table | Indexed Fields | Result Type |
|---|---|---|
| `doctor_chat_messages` | content (user + assistant) | Dr. Alex Chat |
| `doctor_chat_conversations` | title | Dr. Alex Conversation |
| `user_medications` | name, generic_name, reason, notes, category | My Medication |
| `devices` | device_name, device_nickname, device_type | My Device |
| `labs` | name, city, country | My Lab |
| `measurement_templates` | template_name, marker associations | My Template |

**Dr. Alex chat retention:** Chat messages are indexed for search up to 360 days (current system default, configurable via `app_settings.chat_retention_days`). Messages older than 360 days are de-indexed from search but remain accessible in the chat history.

### Tier 3: Derived Relationships (computed at query time)

| Relationship | Example |
|---|---|
| Calculated marker -> base markers | GKI -> glucose, ketones |
| Base marker -> calculated markers | glucose -> GKI, HOMA-IR, TyG, Dr. Boz |
| Marker -> zone | glucose -> Energy & Metabolic |
| Marker -> marker_relations | glucose <-> insulin (correlated), glucose <-> ketones (inverse) |
| Food -> markers it supports | salmon -> omega_3_index, epa, dha, vitamin_d |
| Supplement -> markers it supports | magnesium -> magnesium marker |
| Medication -> affected markers | metformin -> glucose, insulin, hba1c |
| Medication -> interactions | metformin <-> alcohol (moderate severity) |

### Tier 4: Blind Spot Detection (user-context-aware, requires auth)

When a search result is a marker, enrich it with:
- **Missing data badge**: "You haven't measured this marker yet"
- **Stale data badge**: "Last measured 90+ days ago"
- **Calculated marker gap**: "GKI needs ketones -- you have glucose but not ketones"
- **Inconsistency flag**: "Manual HbA1c = 5.2% but calculated HOMA-IR suggests higher insulin resistance" (future -- requires clinical rules engine)
- **Protocol mismatch**: "You're on keto but haven't measured ketones in 30 days"

Blind spot detection does NOT consider the user's tier. If a marker is tier-gated, the blind spot message becomes a CTA: "Upgrade to [tier] to track [marker]".

---

## Authentication Model

| Endpoint | Auth Required | Scope |
|---|---|---|
| `GET /api/v1/search` (type=all, no user context) | No | Tier 1 only (public knowledge) |
| `GET /api/v1/search` (with auth token) | Yes | Tier 1 + Tier 2 + Tier 4 blind spots |
| `GET /api/v1/search/suggest` | No | Tier 1 suggestions only |
| `GET /api/v1/search/suggest` (with auth) | Yes | Tier 1 + Tier 2 suggestions |
| `POST /api/v1/search/reindex` | Yes (admin) | Full reindex |
| Dr. Alex CTA actions | Yes | Redirects to login if unauthenticated |

Unauthenticated search returns `user_context: null` and `blind_spots: []`. The response includes a `login_cta` field when user-specific results would be available.

---

## Ranking & Scoring Algorithm

### Approach: Weighted BM25 + Category Boost + User Context

We use PostgreSQL full-text search (`tsvector`/`tsquery`) with a custom ranking formula. No external search engine needed -- keeps the sovereign architecture simple.

#### Score Formula

```
final_score = bm25_relevance
            * category_weight
            * freshness_boost
            * user_context_boost
            * exact_match_boost
```

#### Category Weights (configurable via `app_settings`)

| Category | Weight | Rationale |
|---|---|---|
| Marker (standard + calculated) | 1.5 | Core entity, most likely search target |
| Zone | 1.3 | High-level navigation |
| Food / Supplement | 1.2 | Actionable health optimization |
| Dr. Alex Chat (user's own) | 1.1 | Personal relevance |
| Marker Relationship | 1.0 | Knowledge graph discovery |
| Knowledge Article (content tiles) | 1.0 | Educational content (did_you_know, how_to_stay_in_range, etc.) |
| Lab Test | 0.9 | Reference for lab ordering |
| Measurement Template | 0.9 | Quick-entry convenience |
| Medication | 0.9 | Reference, not primary navigation |
| Scientific Reference | 0.8 | Supporting evidence |
| Diet Protocol / Eating Pattern | 0.8 | Protocol context |
| LOINC Code | 0.7 | Technical, most users won't search this |
| Protocol Effect | 0.7 | Contextual information |
| Website Content | 0.5 | Marketing, lowest priority in-app |

**Admin configuration**: Category weights are stored in `app_settings` with key `search_category_weights` (JSONB). The admin settings menu includes a "Search" section to adjust these weights without code changes.

#### BM25 Relevance (PostgreSQL `ts_rank_cd`)

PostgreSQL's `ts_rank_cd` implements a variant of BM25 that accounts for:
- Term frequency (how often the query appears in the document)
- Inverse document frequency (rare terms score higher)
- Document length normalization (short, precise matches rank higher)

We use weighted tsvector columns: `A` (title/name, weight 1.0), `B` (description/tooltip, weight 0.4), `C` (body_text/notes, weight 0.2), `D` (aliases/codes, weight 0.1).

#### Exact Match Boost (x3)

If the query exactly matches a marker_slug, marker_name, LOINC code, or food_name, apply a 3x multiplier. This ensures "glucose" returns the glucose marker first, not an article mentioning glucose.

#### Freshness Boost (Tier 2 only, for user content)

For Dr. Alex chats, user medications, and measurement templates:
```
freshness = 1.0 + (0.5 * max(0, 1 - days_old / 180))
```
Recent conversations rank higher. Static knowledge (Tier 1) has no freshness decay.

#### User Context Boost (authenticated users only)

- If the user has measured a marker: +20% boost (familiar context)
- If the user's diet protocol matches a protocol_effect: +15% boost
- If the marker is in a zone the user has populated: +10% boost

#### Why This Fits Sovereign Health

1. **No external dependencies** -- PostgreSQL tsvector is built-in, no Elasticsearch/Meilisearch needed
2. **Privacy-preserving** -- User-specific boosting happens in SQL, no data leaves the DB
3. **Deterministic** -- Same query, same data = same results (no ML black box)
4. **Configurable** -- Category weights in `app_settings` table, adjustable via admin UI without code changes
5. **Bilingual** -- PostgreSQL supports `english` and `german` text search configurations natively

---

## Data Model

### New Table: `search_index`

Materialized search index for fast full-text queries. Rebuilt on content changes via trigger or cron.

```sql
CREATE TABLE search_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(30) NOT NULL,  -- marker, calculated_marker, zone, food, supplement,
                                        -- reference, relation, content, medication_catalog,
                                        -- protocol_effect, loinc, web_content, lab_test,
                                        -- diet_protocol, eating_pattern, food_category,
                                        -- medication_interaction, reference_range
    entity_id VARCHAR(100) NOT NULL,    -- slug or UUID depending on source
    locale VARCHAR(5) NOT NULL,         -- en, de
    title TEXT NOT NULL,                -- Primary display text
    subtitle TEXT,                      -- Secondary context (e.g., zone name, marker name)
    snippet TEXT,                       -- Preview text for results
    url_path TEXT,                      -- In-app route (e.g., /markers/glucose)
    external_url TEXT,                  -- For website content: deep link to sovereignhealth.io page
    category_weight NUMERIC(3,1) NOT NULL DEFAULT 1.0,
    tsv_document tsvector NOT NULL,     -- Full-text search vector
    metadata JSONB,                     -- Extra data: loinc_code, zone_color, source_type,
                                        -- content_type (for marker_content tiles), etc.
    parent_marker_slug VARCHAR(50),     -- For foods/supplements/refs/content: which marker they belong to
    requires_auth BOOLEAN NOT NULL DEFAULT false,  -- True for Tier 2 content
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(entity_type, entity_id, locale)
);

CREATE INDEX idx_search_tsv ON search_index USING GIN(tsv_document);
CREATE INDEX idx_search_entity ON search_index(entity_type);
CREATE INDEX idx_search_locale ON search_index(locale);
CREATE INDEX idx_search_parent ON search_index(parent_marker_slug);
CREATE INDEX idx_search_auth ON search_index(requires_auth);
```

### New Table: `user_search_index` (Tier 2 -- per-user content)

```sql
CREATE TABLE user_search_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(30) NOT NULL,  -- chat_message, chat_conversation, medication,
                                        -- device, lab, measurement_template
    entity_id UUID NOT NULL,
    title TEXT NOT NULL,
    snippet TEXT,
    url_path TEXT,
    tsv_document tsvector NOT NULL,
    source_created_at TIMESTAMPTZ,     -- Original entity timestamp (for freshness)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, entity_type, entity_id)
);

CREATE INDEX idx_user_search_tsv ON user_search_index USING GIN(tsv_document);
CREATE INDEX idx_user_search_user ON user_search_index(user_id);
CREATE INDEX idx_user_search_type ON user_search_index(entity_type, user_id);
```

### Index Rebuild Strategy

- **Static index (`search_index`)**: Rebuilt via migration seed + on-demand admin trigger. Content changes are rare (new markers/foods added in migrations).
- **User index (`user_search_index`)**: Updated incrementally:
  - On chat message creation: insert into user_search_index
  - On medication add/update: upsert into user_search_index
  - On template save/update: upsert into user_search_index
  - On entity deletion: delete from user_search_index
  - Cron job (daily): full rebuild for consistency + prune entries older than 360 days
  - Cap: max 1000 entries per user (FIFO eviction of oldest)

### App Settings for Search

```sql
INSERT INTO app_settings (key, value, description) VALUES
('search_category_weights', '{
  "marker": 1.5, "zone": 1.3, "food": 1.2, "supplement": 1.2,
  "chat": 1.1, "relation": 1.0, "content": 1.0, "lab_test": 0.9,
  "template": 0.9, "medication": 0.9, "reference": 0.8,
  "diet_protocol": 0.8, "eating_pattern": 0.8,
  "loinc": 0.7, "protocol_effect": 0.7, "web_content": 0.5
}', 'Search result category weights for ranking'),
('search_chat_retention_days', '360', 'Max age for Dr. Alex chat indexing in search'),
('search_max_user_index_entries', '1000', 'Max search index entries per user'),
('search_rate_limit_per_second', '10', 'Max search requests per user per second');
```

### Modifications to Existing Tables

None. The search index is a denormalized read-only projection. Source tables remain unchanged.

---

## API Changes

### New Endpoints

#### `GET /api/v1/search`

Primary search endpoint. Returns ranked results across all indexed content.

**Public (unauthenticated):** Returns Tier 1 results only, no user_context or blind_spots.
**Authenticated:** Returns Tier 1 + Tier 2 results with user_context and blind_spots.

```
GET /api/v1/search?q=glucose&type=all&locale=en&limit=20&offset=0
```

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `q` | string | required | Search query (min 2 chars) |
| `type` | string | `all` | Filter: `all`, `markers`, `food`, `supplements`, `zones`, `chat`, `medications`, `references`, `website`, `templates` |
| `locale` | string | user's locale or `en` | `en` or `de` |
| `limit` | int | 20 | Max results (max 50) |
| `offset` | int | 0 | Pagination offset |

**Response (authenticated):**

```json
{
  "query": "glucose",
  "total": 42,
  "authenticated": true,
  "results": [
    {
      "entity_type": "marker",
      "entity_id": "glucose",
      "title": "Glucose",
      "subtitle": "Energy & Metabolic",
      "snippet": "Blood sugar level -- primary energy source...",
      "url_path": "/markers/glucose",
      "score": 4.82,
      "metadata": {
        "zone_color": "#3B82F6",
        "source_type": "home",
        "loinc_code": "2345-7",
        "unit_canonical": "mmol/L",
        "content_tiles": ["what_is", "did_you_know", "health_facts", "how_to_stay_in_range", "food_for_thought"]
      },
      "user_context": {
        "has_measurements": true,
        "last_measured": "2026-04-01T08:30:00Z",
        "latest_value": "5.2",
        "latest_unit": "mmol/L",
        "latest_status": "green"
      },
      "related_calculated": ["gki", "homa_ir", "tyg_index", "dr_boz_ratio"]
    },
    {
      "entity_type": "content",
      "entity_id": "glucose-how_to_stay_in_range",
      "title": "How to Keep Glucose in Range",
      "subtitle": "Glucose -- Tips",
      "snippet": "Eat low-glycaemic-index carbohydrates and pair carbs with protein or fat...",
      "url_path": "/markers/glucose#how-to-stay-in-range",
      "score": 3.41,
      "metadata": {
        "content_type": "how_to_stay_in_range",
        "parent_marker": "glucose",
        "zone_color": "#3B82F6"
      }
    },
    {
      "entity_type": "content",
      "entity_id": "glucose-did_you_know",
      "title": "Did You Know -- Glucose",
      "subtitle": "Glucose -- Facts",
      "snippet": "Your brain consumes roughly 120 g of glucose per day, about 60% of your total...",
      "url_path": "/markers/glucose#did-you-know",
      "score": 2.87,
      "metadata": {
        "content_type": "did_you_know",
        "parent_marker": "glucose"
      }
    },
    {
      "entity_type": "food",
      "entity_id": "sweet-potato",
      "title": "Sweet Potato",
      "subtitle": "Food for Glucose",
      "snippet": "Complex carb with lower glycemic impact...",
      "url_path": "/markers/glucose#foods",
      "score": 2.15,
      "metadata": {
        "food_category": "vegetable",
        "parent_marker": "glucose"
      }
    },
    {
      "entity_type": "chat_conversation",
      "entity_id": "abc123-...",
      "title": "Why is my glucose high in the morning?",
      "snippet": "...dawn phenomenon is common in fasting protocols...",
      "url_path": "/doctor-chat/abc123-...",
      "score": 1.89
    },
    {
      "entity_type": "web_content",
      "entity_id": "features-zones-metabolic",
      "title": "Metabolic Health Tracking -- Sovereign Health",
      "subtitle": "Website -- Features",
      "snippet": "Track glucose, ketones, and metabolic markers...",
      "url_path": null,
      "external_url": "https://sovereignhealth.io/features#metabolic",
      "score": 0.72,
      "metadata": {
        "is_external": true,
        "page_slug": "features"
      }
    }
  ],
  "facets": {
    "markers": 5,
    "food": 12,
    "supplements": 3,
    "zones": 1,
    "content": 8,
    "chat": 4,
    "references": 8,
    "medications": 2,
    "templates": 1,
    "website": 7
  },
  "blind_spots": [
    {
      "type": "missing_base_marker",
      "message": "GKI requires ketones -- you haven't measured ketones yet",
      "action_url": "/markers/ketones",
      "upgrade_cta": null
    },
    {
      "type": "stale_measurement",
      "message": "Your last glucose reading was 45 days ago",
      "action_url": "/measurements/new",
      "upgrade_cta": null
    }
  ],
  "dr_alex_cta": {
    "prompt": "Want personalized advice about glucose?",
    "url": "/doctor-chat?context=glucose",
    "requires_auth": true
  }
}
```

**Response (unauthenticated):**

Same structure but `authenticated: false`, `user_context: null` on all results, `blind_spots: []`, and Tier 2 results (chat, medications, templates, devices, labs) are excluded. Includes:
```json
{
  "login_cta": {
    "message": "Log in to search your personal health data and Dr. Alex conversations",
    "url": "/login?redirect=/search?q=glucose"
  }
}
```

#### `GET /api/v1/search/suggest`

Autocomplete endpoint for the search input (debounced, lightweight).
Public: Tier 1 suggestions only. Authenticated: Tier 1 + Tier 2.

```
GET /api/v1/search/suggest?q=glu&locale=en&limit=8
```

**Response:**

```json
{
  "suggestions": [
    { "text": "Glucose", "type": "marker", "url": "/markers/glucose" },
    { "text": "Glucose-Ketone Index (GKI)", "type": "calculated_marker", "url": "/markers/gki" },
    { "text": "How to Keep Glucose in Range", "type": "content", "url": "/markers/glucose#how-to-stay-in-range" },
    { "text": "Glutathione", "type": "supplement", "url": "/markers/detox#supplements" },
    { "text": "GKI", "type": "alias", "url": "/markers/gki" }
  ]
}
```

Uses prefix matching on `search_index.title` with `tsv_document @@ to_tsquery('glu:*')`.

#### `POST /api/v1/search/reindex` (admin only)

Triggers a full rebuild of `search_index` and all `user_search_index` entries.

```
POST /api/v1/search/reindex
Authorization: Bearer <admin_token>
```

### Modifications to Existing Endpoints

#### `GET /knowledge/search` (deprecate)

The existing `/knowledge/search` endpoint uses basic `LIKE` matching on `marker_content` and `marker_relations` only. It will be replaced by `/api/v1/search`. Keep the old endpoint for one release cycle with a deprecation header, then remove.

---

## UI Changes

### 1. Search Trigger (Navbar)

- Search icon in the top navigation bar (magnifying glass)
- Keyboard shortcut: `Ctrl+K` / `Cmd+K` opens search modal (desktop)
- Mobile: search icon in top bar, tap to expand search input
- PWA: same behavior as mobile, respects safe area insets

### 2. Search Overlay (Modal)

- Full-width modal with search input at top
- Debounced input (300ms) calls `/search/suggest`
- Shows recent searches from localStorage (max 5)
- Type-ahead suggestions appear below input as user types
- Mobile: full-screen overlay with back button

### 3. Search Results Page (`/search?q=...`)

Google-style layout, responsive for mobile:

```
[Search Input Bar]                              [Ctrl+K]
─────────────────────────────────────────────────────────
  All | Markers | Food | Supplements | Zones | Dr. Alex | More...
─────────────────────────────────────────────────────────
  (mobile: horizontal scroll on tab bar)

  [Blind Spot Alert Banner]
  "GKI requires ketones -- you haven't measured ketones yet"
  [Add Ketones Measurement ->]

  Glucose                         5.2 mmol/L [green dot]
  Energy & Metabolic -- Blood sugar level...
  LOINC: 2345-7 | Last measured: Apr 1
  Related: GKI, HOMA-IR, TyG Index, Dr. Boz Ratio
  [View Marker] [Ask Dr. Alex]

  Did You Know -- Glucose                    [Knowledge]
  Your brain consumes roughly 120g of glucose per day...
  [Read More ->]

  How to Keep Glucose in Range               [Tips]
  Eat low-glycaemic-index carbohydrates and pair carbs...
  [View Tips ->]

  Sweet Potato                               [Food]
  Food for Glucose -- Complex carb with lower glycemic impact...
  [View in Marker Detail ->]

  "Why is my glucose high in the morning?"   [Dr. Alex Chat]
  Apr 3 -- ...dawn phenomenon is common in fasting protocols...
  [Open Conversation] [Continue Chat]

  Dr. Boz Ratio                              [Calculated]
  Formula: Glucose (mg/dL) / Ketones (mmol/L)
  Base markers: glucose, ketones
  [View Marker ->]

  Metabolic Health Tracking                  [Website]
  sovereignhealth.io/features -- Track glucose, ketones...
  [Visit Website (opens new tab) ->]

─────────────────────────────────────────────────────────
  Dr. Alex CTA:
  "Want personalized advice about glucose?"
  [Start Consultation ->]
```

### 4. Result Card Design

Each result card shows:
- **Title** with highlighted query match
- **Type badge** (color-coded: Marker=blue, Food=green, Supplement=purple, Zone=teal, Chat=amber, Reference=gray, Knowledge=indigo, Website=slate)
- **Snippet** with highlighted match (max 200 chars)
- **Zone color accent** (left border) for marker-related results
- **User context badges**: green/orange/red status dot with latest value + unit, "Not measured" badge, "Stale" badge
- **Action links**: All results deep-link back to the relevant app page (marker detail, marker section anchor, chat conversation, settings page, etc.)
- **Website results**: marked with external link icon, "Opens sovereignhealth.io" hint, opens in new tab

### 5. Result Backlinks (Deep Links)

Every search result links to a specific location in the app:

| Result Type | Deep Link |
|---|---|
| Marker | `/markers/{slug}` |
| Calculated Marker | `/markers/{slug}` |
| Zone | `/dashboard#{zone_slug}` |
| Content tile (did_you_know) | `/markers/{parent_slug}#did-you-know` |
| Content tile (how_to_stay_in_range) | `/markers/{parent_slug}#how-to-stay-in-range` |
| Content tile (food_for_thought) | `/markers/{parent_slug}#food-for-thought` |
| Food | `/markers/{parent_slug}#foods` |
| Supplement | `/markers/{parent_slug}#supplements` |
| Lab Test | `/markers/{parent_slug}#tests` |
| Scientific Reference | `/markers/{parent_slug}#references` |
| Dr. Alex Chat | `/doctor-chat/{conversation_id}` |
| Medication | `/medications/{id}` |
| Measurement Template | `/measurements/new?template={id}` |
| Device | `/settings#devices` |
| Lab | `/settings#labs` |
| Diet Protocol | `/settings#lifestyle` |
| Website Content | `https://sovereignhealth.io/{page_slug}#{section_key}` (external, new tab) |

### 6. Empty State

- "No results for '[query]'" with suggestions:
  - "Try a different spelling"
  - "Browse all markers"
  - "Ask Dr. Alex about [query]" (CTA to chat with pre-filled context)

### 7. i18n

All UI strings through the existing `ui_string_translations` system:
- `search.placeholder` -- "Search markers, food, supplements..."
- `search.tab_all`, `search.tab_markers`, `search.tab_food`, `search.tab_supplements`, `search.tab_zones`, `search.tab_chat`, `search.tab_more`
- `search.no_results`, `search.no_results_suggestion`, `search.try_different_spelling`
- `search.browse_all_markers`, `search.ask_dr_alex`
- `search.blind_spot_missing`, `search.blind_spot_stale`, `search.blind_spot_gap`, `search.blind_spot_protocol`
- `search.recent_searches`, `search.clear_recent`
- `search.login_required`, `search.login_cta`
- `search.website_external_hint` -- "Opens sovereignhealth.io"
- `search.upgrade_cta` -- "Upgrade to track this marker"
- `search.latest_value` -- "Last: {value} {unit}"

---

## Dr. Alex Integration

Search and Dr. Alex serve complementary roles:

| Aspect | Search | Dr. Alex |
|---|---|---|
| Purpose | Fast factual lookup | Personalized analysis |
| Response time | <200ms | 3-10s (LLM) |
| Data scope | All indexed content | User's health context |
| Interaction | Single query, browse results | Multi-turn conversation |
| AI cost | Zero (SQL only) | 1+ AI credits per query |
| Auth required | No (Tier 1) / Yes (Tier 2) | Yes |

### Bridge Points

1. **Search -> Dr. Alex**: Every marker result includes "Ask Dr. Alex about [marker]" CTA. Clicking pre-fills the chat with context: `"Tell me about my {marker} levels and what I can do to optimize them."` Requires login -- unauthenticated users see a login CTA instead.
2. **Dr. Alex -> Search**: When Dr. Alex references a marker, food, or supplement in a response, those terms are hyperlinked to the relevant app pages (marker detail, food section, etc.).
3. **Chat History in Search**: Past Dr. Alex conversations are indexed and searchable (up to 360 days). This prevents users from re-asking the same question, reducing AI credit spend.
4. **No AI in Search**: Search never calls the LLM. It's pure SQL full-text search. This keeps it fast, free, and predictable.

---

## Logging, Monitoring & Observability

### Structured Logging

All search service actions logged via `tracing`:

| Event | Level | Fields |
|---|---|---|
| Search query executed | INFO | query_length, locale, type_filter, result_count, duration_ms, authenticated |
| Suggest query executed | DEBUG | prefix_length, suggestion_count, duration_ms |
| Reindex triggered | INFO | triggered_by (admin user_id), static_count, user_count, duration_ms |
| User index entry created | DEBUG | user_id, entity_type, entity_id |
| User index pruned (360d) | INFO | user_id, entries_removed |
| Search query timeout | WARN | query, duration_ms, statement_timeout |
| Search rate limited | WARN | user_id_or_ip, requests_in_window |

**Privacy**: Search query text is NOT logged. Only metadata (length, locale, result count, timing) is recorded. Sovereign principle: we don't track what users search for.

### Monitoring Metrics

Expose via `GET /api/v1/health/metrics`:

| Metric | Type | Description |
|---|---|---|
| `search_queries_total` | counter | Total search queries (by type, auth status) |
| `search_latency_ms` | histogram | Query response time distribution |
| `search_suggest_latency_ms` | histogram | Suggest response time distribution |
| `search_index_size` | gauge | Row count in search_index |
| `user_search_index_size` | gauge | Total rows in user_search_index |
| `search_reindex_duration_ms` | gauge | Last reindex duration |
| `search_rate_limited_total` | counter | Rate-limited requests |

### ntfy Alerts

| Condition | Channel | Priority |
|---|---|---|
| Search p95 latency > 500ms (5min window) | sh-ops | high |
| Reindex failed | sh-ops | urgent |
| Search index empty after reindex | sh-ops | urgent |

### RC Testing Protocol

Before each release, the RC checklist includes:

1. **Search index integrity**: Run `POST /search/reindex`, verify row counts match expected (markers * 2 locales + foods + supplements + content tiles + ...)
2. **Bilingual search**: Query "Glukose" (DE) and "Glucose" (EN), verify both return the glucose marker as top result
3. **Tier 1 public access**: Search without auth token, verify results returned, no user_context, no Tier 2 content
4. **Tier 2 authenticated**: Search with auth, verify Dr. Alex chats and medications appear
5. **Blind spot detection**: Search for a marker the test user hasn't measured, verify "Not measured" badge
6. **Calculated marker relationships**: Search "GKI", verify base markers (glucose, ketones) listed in response
7. **Content tile indexing**: Search "how to keep glucose in range", verify the how_to_stay_in_range tile appears with deep link
8. **Website results**: Search "pricing", verify sovereignhealth.io result with external_url and "opens new tab" hint
9. **Suggest autocomplete**: Type "glu", verify suggestions include Glucose, GKI, and related content
10. **Mobile responsive**: Run search on mobile viewport, verify tab bar scrolls horizontally, cards stack vertically
11. **Rate limiting**: Send 15 requests/second, verify 429 after threshold
12. **Performance**: Search p95 < 200ms on staging with full index

---

## Risk Assessment

### Performance Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Full-text search on large `search_index` slows down | Slow results (>500ms) | GIN index + `LIMIT` clause. Index is small (~5K rows for static + N*50 for user content). PostgreSQL FTS handles millions of docs. |
| User search index grows large (heavy Dr. Alex users) | Memory pressure | Cap user_search_index at 1000 entries per user (FIFO). Chat messages older than 360 days are de-indexed. |
| Concurrent search queries spike DB load | Connection pool exhaustion | Dedicated read replica (future). For now, search queries are read-only and fast. Add `statement_timeout = 2000` to search queries. |
| Suggest endpoint called on every keystroke | High QPS | 300ms debounce on frontend. Suggest query uses prefix index, returns in <50ms. Add rate limiter (10 req/s per user). |
| Reindex blocks DB during rebuild | Write latency spike | Run reindex in background transaction with low priority. Notify admin on completion via ntfy. |

### Application Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Search cannibalizes Dr. Alex usage | Reduced AI credit revenue | Search is deliberately factual/static. Personalized questions ("Why is MY glucose high?") have no good search answer -- Dr. Alex CTA is always visible. |
| Users expect web-search quality | Disappointment | Clear scope: "Search your health data" -- not "Search the internet". Empty state redirects to Dr. Alex. |
| Stale search index | Wrong/missing results | Incremental updates on entity changes + daily cron rebuild. Admin reindex trigger for emergencies. |
| Blind spot detection false positives | User alarm | Only show blind spots for markers the user has engaged with (measured at least once, or viewed the marker page). Don't flag markers the user has never interacted with. |
| LOINC codes confuse non-technical users | Bad UX | LOINC data included in index but displayed only as a secondary badge, never as primary result. LOINC-specific searches (by code) are for professionals who know what they're looking for. |
| Chat message indexing exposes sensitive data | Privacy concern | `user_search_index` is strictly per-user (WHERE user_id = $1). No cross-user search. Chat content is decrypted only for the owning user's search. Admin search does NOT include user chat. |
| Website content clutters health results | Noise | Website content has lowest category_weight (0.5). Results marked with external link icon and "Opens sovereignhealth.io" hint. In-app health data always ranks higher. |
| Public search exposes health knowledge structure | Competitive intelligence | Acceptable risk -- marker names and educational content are not secret. No user data exposed. This is the same content visible on the public website. |

### Security Risks

| Risk | Mitigation |
|---|---|
| SQL injection via search query | Parameterized `plainto_tsquery($1)` -- never string interpolation |
| Cross-user data leakage | `user_search_index` always filtered by authenticated user_id. Unauthenticated requests return Tier 1 only. |
| Search query logging exposes health interests | Search queries are NOT logged (text content). Only metadata is tracked. Sovereign principle: we don't track user behavior. |
| Rate limiting bypass | Per-user rate limit (authenticated) + per-IP rate limit (unauthenticated) on search + suggest endpoints |
| Unauthenticated abuse (scraping) | Rate limit per IP (5 req/s unauthenticated). No pagination beyond 100 results for public queries. |

---

## Existing Code to Replace/Extend

| Current | Action |
|---|---|
| `GET /knowledge/search` (knowledge.rs) | Deprecate, replace with `/api/v1/search` |
| `marker_content` LIKE search | Replaced by tsvector-based search_index |
| `marker_relations` LIKE search | Included in search_index with entity_type='relation' |

---

## Implementation Phases

### Phase 1: Backend Index + API (Day 1 morning)
1. Migration: create `search_index` and `user_search_index` tables
2. Migration: seed `search_index` from ALL Tier 1 source tables (markers, zones, all 7 content_types, foods, supplements, tests, references, relations, aliases, protocols, medications, LOINC, website content, i18n strings)
3. Add `search_category_weights` and related keys to `app_settings`
4. Implement `GET /api/v1/search` with tsvector ranking (public + authenticated modes)
5. Implement `GET /api/v1/search/suggest` for autocomplete
6. Implement `POST /api/v1/search/reindex` (admin)
7. Add structured logging and metrics

### Phase 2: Frontend Search UI (Day 1 afternoon)
1. Search icon in navbar + Ctrl+K shortcut
2. Search overlay with suggest dropdown
3. Results page at `/search?q=...` with tab bar (horizontal scroll on mobile)
4. Result cards with type badges, zone colors, deep-link action buttons
5. Measurement value display on marker results (latest value + unit + status dot)
6. Website result cards with external link indicator
7. Mobile + PWA responsive layout

### Phase 3: User Content Indexing (Day 2 morning)
1. Index Dr. Alex chat messages on creation (360-day window)
2. Index user medications on add/update
3. Index measurement templates on save/update
4. Blind spot detection logic (missing markers, stale data, calculated marker gaps)
5. Dr. Alex CTA integration (login-gated for unauthenticated users)

### Phase 4: Polish + i18n + Ops (Day 2 afternoon)
1. German text search configuration
2. All UI strings through i18n (zero hardcoded strings)
3. Recent searches in localStorage
4. Empty state with suggestions
5. Admin settings menu: search category weights
6. Deprecation header on old `/knowledge/search`
7. ntfy alerts for search latency/reindex failures
8. RC testing protocol execution

---

## Resolved Design Decisions

- [x] **Include measurement values in results**: Yes. Show latest value + unit + status dot on marker results for authenticated users. Provides useful context. Privacy trade-off accepted (user is already logged in).
- [x] **Index measurement_templates**: Yes. Templates are searchable for quick-entry convenience.
- [x] **Dr. Alex chat retention for search**: 360 days (current system default via `app_settings.search_chat_retention_days`). Configurable.
- [x] **Blind spot detection and tier**: No tier gating on blind spots. Use blind spots as upgrade CTA when the marker/feature is tier-gated (e.g., "Upgrade to [tier] to track [marker]").
- [x] **Website content indexing**: Yes, index all `web_content_translations`. Results marked as external with deep link to `sovereignhealth.io/{page}#{section}`. User sees "Opens sovereignhealth.io" hint and result opens in new tab.

---

## References

- PostgreSQL Full-Text Search: https://www.postgresql.org/docs/current/textsearch.html
- BM25/ts_rank_cd: https://www.postgresql.org/docs/current/textsearch-controls.html
- Existing search handler: `api/src/handlers/knowledge.rs`
- Marker translations (SSOT): `migrations/20260311000044_content_translations.sql`
- Marker detail tables: `migrations/20260309000017_marker_detail_tables.sql`
- Marker content types: `what_is`, `did_you_know`, `health_facts`, `food_for_thought`, `fun_facts`, `how_to_stay_in_range`, `fasting_explanation`
- Marker relations: `migrations/20260310000034_batch15_knowledge_medications.sql`
- Organizations: `migrations/20260316000076_organizations.sql`
- Web content: `migrations/20260311000046_web_content.sql`
