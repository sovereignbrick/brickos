# 024 -- Sovereign Voice v1.0: GUI + Content Pipeline + Multi-Channel + Discovery

**Status:** Draft v0.1
**Author:** Helmut / Claude
**Date:** 2026-04-18
**Related:** 007-sovereign-voice (v0.1 spec + long-term roadmap), 014-brickos-platform-gui, 015-brickos-unified-app-routing, 017-sovereign-crm (AI-agnostic pattern), 019-scaffold-generator-architecture, 022-licensing-model, 023-sovereign-oracle (cross-app rationale publishing)
**Source:** Feature set specified by Helmut, 2026-04-18

---

## 1. Goal and Scope

Sovereign Voice today (v0.2) is a headless TypeScript scheduler: JSON schedule + NOSTR publish + retry + state file. v1.0 elevates it into a **content studio**: a BrickOS-native GUI-plus-API app that turns raw source material (PDF, URL, text, book chapter) into scheduled, channel-appropriate posts with matching visuals, and surfaces repost/comment opportunities discovered across the networks you care about.

The five jobs v1.0 must do well:

1. **Generate**: ingest source material -> produce human-sounding posts with relevant hashtags and a matching image (or image prompt).
2. **Compose**: preview, edit, and approve posts in a calendar and table view across all channels.
3. **Schedule**: pick per-channel publish times; existing v0.2 scheduler becomes the execution layer.
4. **Publish**: NOSTR today; X/Twitter next; TikTok short-video pipeline as a specialised sub-app.
5. **Listen (Resonance)**: watch configured relays and feeds for posts matching your core topics; suggest repost/comment drafts for human review.

v0.2's CLI remains available as a headless runner -- it now reads from the same database the GUI writes to. No split-brain configs.

---

## 2. Why Now

Three forces converge:

- **v0.2 shipped** the image-rendering fix and NIP-92 `imeta` support (2026-04-18). Scheduled posts now render correctly. The remaining pain is **getting the post made in the first place**: writing it, picking visuals, matching tone, choosing hashtags.
- **Cross-app integration** with Sovereign Oracle (design 023) and SHI: both want to publish rationale/proof content on a schedule. That pressure is best absorbed by a real content pipeline, not by bolting more JSON fields onto the scheduler.
- **Distribution is the bottleneck** for BrickOS's commercial track (design 022 licensing). A studio that can turn the "Brick by Brick" book into weeks of daily content across NOSTR + X + TikTok multiplies reach without multiplying Helmut's hours.

---

## 3. Architecture Transition: CLI -> API + GUI

### 3.1 Today (v0.2)

```
apps/attention/sovereign-voice/
  src/{config,publisher,scheduler,shortener,index}.ts  # TypeScript, ~1k LoC
  schedule.json                                         # single user, static
  .publish-state.json                                   # file-based idempotency
```

### 3.2 v1.0 target

```
apps/attention/sovereign-voice/
  api/                              # Rust (Axum), scaffolded (see section 4)
    src/
      main.rs                       # Two-pool init (PlatformPool + AppPool)
      handlers/
        posts.rs                    # CRUD + preview + schedule
        sources.rs                  # PDF upload, URL import, raw text ingest
        generations.rs              # text + image generation jobs
        channels.rs                 # NOSTR / X / TikTok accounts
        resonance.rs                # listening + suggestions
      services/
        ingest/                     # pdf.rs, url.rs, text.rs, topic.rs
        generate/                   # text.rs, image.rs, hashtags.rs, tone.rs
        publish/                    # nostr.rs, twitter.rs, tiktok.rs
        resonance/                  # relays.rs, matchers.rs, drafts.rs
      models/
      migrations/
  frontend/                         # Next.js, scaffolded
    src/app/
      dashboard/                    # overview: upcoming, pending review, KPIs
      posts/
        new/                        # generation wizard
        [id]/                       # preview + edit + history
        calendar/                   # full calendar view
        table/                      # full table view with filters
      channels/                     # account management per network
      sources/                      # imported material library (PDFs, URLs)
      resonance/                    # discovered posts + draft responses
      settings/
  runner/                           # the existing TypeScript scheduler,
    src/                            # now reads from the API DB instead of JSON
      index.ts                      # "headless mode" CLI kept for systemd
      db-adapter.ts                 # pg client -> same schema as Rust API
      publisher.ts                  # unchanged (v0.2 code)
      shortener.ts                  # unchanged
  ops/
    deploy.sh                       # deploys api + frontend + runner together
```

**Shared nothing across language boundary except the DB.** The Rust API and TypeScript runner both read/write the same `svo` schema. The runner is the execution layer (already battle-tested); the API is the composition layer.

### 3.3 Migration path

- Existing `schedule.json` stays valid in v1.0 via a one-shot importer: `voice import schedule.json` -> inserts rows into `svo.posts`. Users can then edit in the GUI and throw the JSON away.
- `.publish-state.json` is replaced by `svo.posts.status` and `svo.publish_events`; the runner migrates on first start.
- No breaking change for users who only want headless CLI operation -- the runner still reads a subset of the schema and publishes on schedule.

---

## 4. Scaffolding: Use + Gaps

### 4.1 Scaffold invocation

The existing `sovereign-voice/` directory is already on disk with the v0.2 TypeScript code. The scaffold generator assumes a greenfield app. Two options:

**Option A (safer):** scaffold to a temporary directory, then selectively merge the generated `api/` and `frontend/` trees into the existing app folder, preserving the existing `src/` as `runner/src/`.

**Option B (cleaner):** the scaffold grows a `--into-existing` flag that merges into an existing app, only writing files that don't already exist, and placing existing TS source into `runner/`.

Recommendation: Option A for the v1.0 branch; capture the manual merge steps in an ADR and have the scaffold team pick up Option B as a follow-up.

### 4.2 New scaffold gaps surfaced by Voice v1.0

Layered on top of the gaps the Sovereign Oracle design already flagged (023 §6.2):

| Gap | Impact | Proposed fix |
|---|---|---|
| **No media-upload pattern.** Voice needs PDFs up to ~50 MB. Scaffold only assumes small field-level encrypted payloads. | Every app invents its own upload/storage pattern. | `brickos-blob` crate: S3-compatible (MinIO self-hosted by default), handles upload, de-dup via SHA-256, lifecycle rules. CRM's future attachment feature (017) benefits too. |
| **No job queue.** AI generation is async (seconds for text, tens of seconds for images, minutes for video). Scaffold has no background-job abstraction. | Each app rolls a hand-written Tokio task pool. | `brickos-jobs` crate: Postgres-backed queue (schema: `brickos.jobs`), worker pool, retry/backoff, dead-letter. Oracle wants this too. |
| **No webhook inbound.** Resonance needs to listen for X Activity webhooks (when they exist) + TikTok post callbacks. Scaffold has no inbound-webhook pattern. | Copy-paste webhook handlers across apps. | `brickos-webhooks` crate: signature verification, replay protection, typed handlers per provider. |
| **No cross-app publish contract.** SHI, Oracle, and CRM all want to publish through Voice. Each would hand-roll a client. | N different auth patterns into Voice. | `brickos-voice-client` Rust crate: auth via platform service-account keys, one function `schedule_post(channel, body, image?, publish_at)`. |
| **Next.js scaffold has no drag-and-drop dropzone.** Required for post-image-upload and PDF-source-import. | Each app builds its own. | `@brickos/ui` frontend package gains a `<Dropzone>` component; wired in scaffold defaults. |

**Priority for v1.0**: `brickos-jobs` is the blocker. Everything else can be built once inside Voice and extracted when a second consumer appears.

---

## 5. Data Model (svo schema)

Condensed; invariants in §5.2.

```sql
-- schema: svo (owned by AppPool; references brickos.users)

CREATE TABLE sources (                              -- ingested raw material
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,                      -- brickos.users
  kind          TEXT NOT NULL,                      -- pdf|url|text|book_chapter|transcript
  title         TEXT,
  blob_id       UUID,                               -- brickos-blob, when kind=pdf
  url           TEXT,                               -- when kind=url
  raw_text      TEXT,                               -- when kind=text (encrypted via brickos-crypto)
  extracted_md  TEXT,                               -- canonical markdown after extraction
  meta          JSONB NOT NULL DEFAULT '{}',        -- page count, author, domain, etc.
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE topics (                               -- AI-suggested or user-curated topics
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id     UUID REFERENCES sources(id),
  user_id       UUID NOT NULL,
  title         TEXT NOT NULL,
  angle         TEXT,                               -- "counterintuitive hook" | "data-driven" | ...
  key_points    TEXT[] NOT NULL,
  confidence    NUMERIC(4,3),                       -- AI's self-reported confidence
  status        TEXT NOT NULL DEFAULT 'proposed',   -- proposed|approved|rejected|drafted
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE channels (                             -- configured social accounts
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  platform      TEXT NOT NULL,                      -- nostr|x|tiktok|linkedin|stacker_news
  handle        TEXT,                               -- @user, npub, etc.
  display_name  TEXT,
  credentials   BYTEA,                              -- encrypted via brickos-crypto
  status        TEXT NOT NULL DEFAULT 'connected',  -- connected|needs_reauth|disabled
  defaults      JSONB NOT NULL DEFAULT '{}',        -- per-platform: tone, length cap, hashtag seed
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE posts (                                -- a single post, per channel
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  source_id     UUID REFERENCES sources(id),
  topic_id      UUID REFERENCES topics(id),
  channel_id    UUID NOT NULL REFERENCES channels(id),
  body          TEXT NOT NULL,                      -- platform-adapted content
  hashtags      TEXT[] NOT NULL DEFAULT '{}',
  image_id      UUID REFERENCES images(id),
  video_id      UUID REFERENCES videos(id),
  publish_at    TIMESTAMPTZ,                        -- null = unscheduled draft
  published_at  TIMESTAMPTZ,
  external_id   TEXT,                               -- nostr event id, x tweet id, tiktok id
  status        TEXT NOT NULL DEFAULT 'draft',      -- draft|pending_review|scheduled|publishing|published|failed
  kind          TEXT NOT NULL DEFAULT 'short',      -- short|long|thread|video
  thread_parent UUID REFERENCES posts(id),          -- for X threads
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by   UUID                                -- user who clicked approve
);

CREATE TABLE images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  prompt        TEXT NOT NULL,                      -- prompt used to generate
  provider      TEXT,                               -- dalle3|flux|stable_diffusion|manual
  blob_id       UUID,                               -- final image bytes
  dim           TEXT,                               -- "1200x630"
  sha256        TEXT,
  alt           TEXT,
  meta          JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE videos (                               -- tiktok + short-form
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  source_id     UUID REFERENCES sources(id),
  script        TEXT NOT NULL,
  voiceover_blob_id UUID,
  rendered_blob_id  UUID,
  duration_sec  NUMERIC(6,2),
  status        TEXT NOT NULL DEFAULT 'drafted',    -- drafted|rendering|ready|failed
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE publish_events (                       -- audit log, one row per publish attempt
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID NOT NULL REFERENCES posts(id),
  attempted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  outcome       TEXT NOT NULL,                      -- success|failure
  external_id   TEXT,
  error         TEXT,
  relay_results JSONB                               -- for NOSTR: per-relay OK/fail
);

CREATE TABLE resonance_rules (                      -- what to listen for
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  name          TEXT NOT NULL,
  platforms     TEXT[] NOT NULL,                    -- nostr, x, linkedin
  topics        TEXT[] NOT NULL,                    -- "proof of blood", "bitcoin health", ...
  keywords      TEXT[] NOT NULL DEFAULT '{}',
  min_followers INT,
  exclude_npubs TEXT[],
  enabled       BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE resonance_matches (                    -- discovered candidates
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id       UUID NOT NULL REFERENCES resonance_rules(id),
  platform      TEXT NOT NULL,
  external_id   TEXT NOT NULL,                      -- nevent/tweet id
  author_handle TEXT,
  body_excerpt  TEXT,
  url           TEXT,
  matched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  score         NUMERIC(4,3),                       -- relevance score
  status        TEXT NOT NULL DEFAULT 'proposed',   -- proposed|drafted|reposted|commented|dismissed
  suggested_action TEXT,                            -- repost|comment
  draft_body    TEXT                                -- AI-drafted comment/repost text
);

CREATE TABLE jobs (                                 -- if brickos-jobs ships, this moves to brickos schema
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          TEXT NOT NULL,                      -- generate_text|generate_image|render_video|ingest_pdf|scan_resonance
  payload       JSONB NOT NULL,
  status        TEXT NOT NULL DEFAULT 'queued',     -- queued|running|succeeded|failed|retrying
  attempts      INT NOT NULL DEFAULT 0,
  result        JSONB,
  error         TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at    TIMESTAMPTZ,
  finished_at   TIMESTAMPTZ
);
```

### 5.2 Invariants

- `posts.status = 'scheduled'` implies `publish_at IS NOT NULL` and `channel_id` references a `channels.status = 'connected'` row.
- `posts.status = 'published'` implies `published_at IS NOT NULL` and at least one successful `publish_events` row.
- `images.provider = 'manual'` implies no AI generation happened; `prompt` is still set (user-authored description), `blob_id` is required.
- A `post` with `video_id` must have `channel.platform IN ('tiktok', 'x')` -- NOSTR short-form treats video as URL-in-content, not native.
- Every remote LLM / image / video call writes a row to `consents` (shared with Oracle's consent table pattern, see 023 §4) before the call.

---

## 6. Content Generation Pipeline

Six stages. Each stage is a job; users can jump in at any stage with a manual override.

```
  +---------+     +--------+     +--------+     +---------+     +---------+     +------+
  | INGEST  | --> | EXTRACT| --> | TOPICS | --> |  DRAFT  | --> |  VISUAL | --> |SCHEDULE
  +---------+     +--------+     +--------+     +---------+     +---------+     +------+
    PDF/URL/       normalise      AI proposes    per-channel     image prompt    per-channel
    text/book      to markdown    N topics,      body,           + generated     publish_at
                                  you approve    hashtags,       image, OR       per-channel
                                                 tone-checked    prompt-only     defaults
```

### 6.1 Ingest (svo.sources)

- **PDF upload**: drag-drop via `<Dropzone>`. Max 50 MB. Server-side: `pdf-extract` or equivalent -> markdown with page markers.
- **URL import**: user pastes URL. Server fetches, Readability-extracts main content, stores as markdown.
- **Raw text paste**: textarea. Use when the source is ephemeral (a thought, a conversation note).
- **Book chapter**: special "Brick by Brick" importer. Reads a chapter from a user-configured path on disk and splits into scene/argument units. Reused by TikTok video pipeline (§8).
- **Transcript**: future input type for podcasts/YouTube/voice notes (see §13).

### 6.2 Extract

Ingested content is canonicalised to markdown with per-paragraph IDs. Citations (URLs, footnotes) are preserved.

### 6.3 Topics (svo.topics)

AI proposes N topics (default 5) per source, each with:

- `title` (the hook)
- `angle` (counterintuitive / data-driven / story / meta)
- `key_points` (3-5 bullets)
- `confidence` (AI self-report)

User approves/rejects per topic. Rejected topics feed a "reject list" that the AI sees on the next run, so repeated rejections train the prompt.

### 6.4 Draft (svo.posts body)

For each approved topic x each target channel, generate a platform-adapted draft:

- **NOSTR kind 1**: short, ideally under 280 chars, URL at end if present.
- **NOSTR kind 30023**: long-form, full markdown, title + summary + content.
- **X thread**: split body into 3-5 tweets under 280 chars each; populate `thread_parent` chain.
- **LinkedIn**: 800-1200 char medium-form, professional register.
- **TikTok caption**: <150 chars, emoji-friendly, CTA at end.

All drafts pass through the **tone check** (§11) before leaving the API.

### 6.5 Visual (svo.images + svo.videos)

Three user-selectable modes:

1. **Prompt-only**: generate a detailed image prompt (Midjourney / DALL-E / SDXL style) with composition, lighting, aspect ratio. User copies the prompt and produces the image manually. Stored as `images.provider = 'manual'` once the user uploads the result.
2. **Auto-generate**: call the configured image provider (DALL-E 3, Flux via Replicate, or local ComfyUI). Store prompt + generated image.
3. **Reuse**: select from existing `images` library; users often reuse banners.

Every image gets a NIP-92-compatible metadata record (url, alt, dim, sha256) written to `images` and linked to the post. The v0.2 `NoteImage` payload path (`publisher.ts`) is unchanged -- it reads from the DB now.

### 6.6 Schedule

Per-channel defaults (e.g. "NOSTR: 09:00 CET daily"; "X: 10:00, 14:00, 17:00 CET") plus manual overrides. The runner (v0.2 scheduler code) reads `svo.posts WHERE status = 'scheduled' AND publish_at <= now()` and fires them.

---

## 7. Multi-Channel Publishing

### 7.1 NOSTR (day-1)

Existing v0.2 code moves into `runner/`. The Rust API writes a `posts` row with `channel.platform = 'nostr'`; runner picks it up. No new code for NOSTR publishing -- just the DB instead of JSON source.

### 7.2 X / Twitter (day-30)

- Use the official X API v2 (paid tier required for posting in 2026; track pricing). `brickos-twitter` crate wraps OAuth2 + tweet creation.
- Support threads: `posts.thread_parent` chains into `in_reply_to_tweet_id`.
- Media upload: images + short videos via the media endpoints.
- Rate limits respected in the runner's queue.

### 7.3 TikTok (day-60, see §8)

Separate pipeline because videos are a different beast. TikTok Content Posting API is available but has strict approval; manual upload is the v1 fallback for non-approved accounts.

### 7.4 LinkedIn, Stacker News (future)

- **LinkedIn**: no great public posting API; official Marketing API requires an approved app. Alternative: semi-automated (generate copy-paste-ready post + image + hashtags in an "Export" tab).
- **Stacker News**: API exists; low priority until commercially justified.

### 7.5 Policy: channel eligibility

A post is eligible for auto-publish when:

- `channels.status = 'connected'`
- Platform-specific quality gates pass (X: within length limits, no banned phrases; TikTok: video ready + duration within 15-180 s).
- Tone check passed.
- Not inside a kill-switch window (user can freeze all channels via a single toggle during e.g. a PR incident).

---

## 8. TikTok Short-Video Pipeline ("Voice Reels")

Dedicated sub-app, separate daemon. Input: any `sources` row of kind `book_chapter` or `transcript`. Output: series of 30-60s vertical videos ready for TikTok.

### 8.1 Pipeline

```
  +--------+     +--------+     +---------+     +---------+     +--------+     +---------+
  |CHAPTER | --> | SEGMENT| --> | SCRIPT  | --> |VOICE    | --> |VISUAL  | --> |RENDER   |
  +--------+     +--------+     +---------+     +---------+     +--------+     +---------+
    Brick-by-    split into     AI rewrites     TTS            b-roll +       ffmpeg
    Brick MD     60-180 s       as punchy       (Eleven /      captions       vertical
                 argument       first-person    Whisper                       1080x1920
                 units          monologue       voice clone)
```

### 8.2 Design decisions

- **Voice**: default to a TTS service (ElevenLabs / Cartesia / open-source XTTS) with a user-trained voice clone. Fallback: bundled neutral voice. User's clone voice files are stored encrypted in `brickos-blob`.
- **Visuals**: three levels.
  - L1 (ship-first): static background + captioned text + user-uploaded logo + waveform animation. Zero AI.
  - L2: stock footage library (Pexels API) matched to keywords in script.
  - L3: AI-generated b-roll (Runway / Pika) prompted from the segment's key ideas. Expensive, slow, save for hero content.
- **Captions**: auto-generated with word-level timing from the Whisper transcript of the TTS output. Burned into the video -- TikTok's algorithm favours on-screen text.
- **Hooks**: first 2 seconds are critical. AI generates three candidate hooks per segment; user picks before render.
- **Rendering**: `ffmpeg` via the `brickos-jobs` worker. Target < 2 min render per 60 s video on a mid-size VPS.

### 8.3 Publishing

TikTok's Content Posting API requires the app to be in their approved program. Two modes:

- **Approved mode**: direct publish to TikTok via API when the scheduled time hits.
- **Draft mode** (fallback + default): render the MP4, drop it into a `drafts/ready-to-upload/` folder on the user's desktop via rclone/Syncthing, notify user that N videos are ready. Manual upload retains full control.

### 8.4 Risks

- TTS voice ethics: user owns the voice clone, but impersonation is a real risk. Clones are per-user, never shared, audit-logged.
- TikTok ToS: automated posting risks suspension. Default draft mode sidesteps this.
- Render cost: on a VPS, 20 videos/day with AI b-roll could saturate the worker. Queue back-pressure + daily caps required.

---

## 9. Discovery / Listening ("Resonance")

Watches configured networks for posts matching the user's core topics and suggests repost/comment responses with a draft body.

### 9.1 Inputs

- `resonance_rules` rows: `topics[]`, `keywords[]`, `platforms[]`, optional `min_followers`, optional `exclude_npubs[]`.

### 9.2 Sources per platform

| Platform | Mechanism | Reliability |
|---|---|---|
| NOSTR | Relay subscription (kind 1, 30023) filtered by tags + text match | High -- native protocol |
| X | Paid API search or web-scrape via a managed service | Medium -- ToS + paid |
| LinkedIn | No usable public search; user-supplied RSS feeds (if any) | Low -- best-effort |
| RSS/Atom | Direct polling of blog feeds user configures | High -- open standard |
| Stacker News | Public API | High |

For v1, ship NOSTR + RSS. Add X when the commercial case is clear. LinkedIn stays manual.

### 9.3 Matching

A two-stage match:

- **Cheap prefilter**: keyword/hashtag regex on post body. Keeps cost near zero.
- **AI classification**: remaining candidates go through the LLM with the user's `topics[]` to score relevance (0.000-1.000). Only results above the configured threshold become `resonance_matches` rows.

### 9.4 Suggestion

For each match, the AI proposes one of:

- **Repost**: suitable for a strong, aligned thesis with a known author; propose a 1-2 sentence quote-repost introduction.
- **Comment**: suitable for adjacent ideas where Helmut has a specific angle; propose a 50-150 word comment that adds value, not noise.
- **Dismiss** (with reason): suitable for low-quality, off-topic, or adversarial matches.

The user reviews suggestions in the `resonance/` frontend route. One click: approve -> scheduled post. Another click: dismiss. Dismissed matches feed the negative training set.

### 9.5 Safeguards

- **Anti-engagement-farming**: never auto-reply without user approval. The rule is: Resonance surfaces, human decides.
- **Author rate limit**: no more than 2 responses per author per week, regardless of matches. Avoids looking like a bot.
- **Exclude list**: `resonance_rules.exclude_npubs[]` lets the user quietly filter out people they don't want to engage with.

---

## 10. Composition GUI (Calendar + Table + Preview)

### 10.1 Calendar view (`/posts/calendar`)

- Month/week/day views. Each cell shows post thumbnails (image + first 60 chars), colour-coded by channel.
- Drag-and-drop to reschedule (updates `publish_at`).
- Filter chips: by channel, status, source, topic.
- "Empty slot" hinting: cells without scheduled posts show "+ add" prompts during user's configured publishing windows.

### 10.2 Table view (`/posts/table`)

- Columns: Date | Channel | Status | Title | Hashtags | Image | Actions.
- Sortable, filterable, paginated. Default sort: `publish_at ASC`.
- Bulk actions: reschedule N posts by offset, change channel, delete draft, mark approved.

### 10.3 Post preview (`/posts/[id]`)

- Tabs: `Preview` (rendered as the target platform would show it), `Edit` (markdown/editor with live char count), `Image` (preview + regenerate), `History` (every publish attempt + error trace), `Related` (source + topic + linked thread siblings).
- "Approve + Schedule" button. Above the button: tone-check result, hashtag suggestions, char-count for the target platform.

### 10.4 Dashboard (`/dashboard`)

- Top row: "Next 24 hours" (count of scheduled posts per channel), "Pending review" (count of drafts awaiting approval), "Resonance inbox" (count of new matches).
- Mid: recent publish events (successes + failures).
- Bottom: KPIs -- follower growth (per channel), reaction trends, top-performing post this week.

---

## 11. Tone + Hashtag Policy

### 11.1 Tone check

Every draft body passes through a tone-check step before it can be scheduled. Checks:

- **Anti-AI-slop heuristics**: reject or flag drafts that contain banned phrases ("dive into", "delve into", "in today's fast-paced world", gratuitous "In conclusion", ChatGPT's favourite em-dash). The user's memory preferences say **no em-dashes** -- enforce it programmatically here.
- **Length per channel**: hard-reject drafts exceeding platform limits.
- **Voice match**: optional -- train a simple style classifier on the user's last 100 published posts; score new drafts against it. Low scores get a warning, not a block.
- **Profanity / brand-safety**: configurable word lists per channel.

Failed checks return reasons; the user can override ("publish anyway") with a logged ack.

### 11.2 Hashtag policy

Two-layer hashtag assembly:

- **Seed tags per channel** (`channels.defaults.hashtag_seed`): e.g. NOSTR gets `#sovereignty #bitcoin #health`, X gets `#Bitcoin #ProofOfBlood`.
- **Topic tags**: AI extracts 2-3 tags from the post body. De-duplicated against seed.

Final hashtag set is limited per channel: NOSTR `t` tags <= 6, X inline tags <= 4, LinkedIn <= 3. On overrun, lower-confidence topic tags are dropped first.

---

## 12. Tech Stack Mapping

| Capability | BrickOS primitive |
|---|---|
| Rust API | Axum + sqlx (standard scaffold output) |
| Two-pool DB | `brickos-db` (`PlatformPool` + `AppPool` for `svo` schema) |
| Auth | `brickos-auth` (JWT/Argon2/TOTP) |
| Encrypted credentials for X/TikTok tokens, NOSTR nsec | `brickos-crypto` per-field AES-256-GCM |
| LLM (drafts, tone check, resonance scoring, topic proposal) | `brickos-ai` (Anthropic / OpenAI / Ollama, AI-agnostic) |
| Image generation | New `brickos-ai` image module: OpenAI Images / Replicate Flux / local ComfyUI |
| TTS, video render | Direct service adapters (ElevenLabs / Cartesia / XTTS); ffmpeg invocation |
| Job queue | New `brickos-jobs` crate (§4.2) |
| Blob storage | New `brickos-blob` crate (§4.2) |
| NOSTR client | Existing v0.2 `publisher.ts` (via runner). Future: `brickos-nostr` shared crate (see Oracle 023 §5.1). |
| URL shortening | `brickos-link` service (Sovereign Link); already integrated in v0.2. |
| Email notifications | `brickos-email` (publish failures, weekly digest) |
| Push / mobile alerts | `brickos-notify` (ntfy.sh / Telegram / webhook) |
| Frontend | Next.js (scaffold default) + `@brickos/ui` packages |
| Observability | Prometheus + Grafana (design 011) |
| Release | `.github/workflows/release.yml` + `docs/releases/sovereign-voice/` (already wired) |

---

## 13. Additional Features Worth Considering

Ranked by estimated reach-per-effort.

### 13.1 High value, low cost

- **Voice-to-post**: record a 30-second voice memo in the PWA, Whisper transcribes, pipeline produces a NOSTR kind 1 + LinkedIn draft. The fastest path from thought to post.
- **Daily digest email**: one mail at 08:00 with "pending review (3)", "publishing today (5)", "resonance (12 new)". Drives daily engagement with the tool.
- **Book-chapter tracker**: for a book-promotion campaign, maintain a chapter-by-chapter progress view: which chapters have been turned into how many posts, with completion bars.
- **A/B headline picker**: for any post, generate three headline variants and show them side by side. One click to pick.
- **Evergreen re-surface**: posts that performed well older than 90 days become candidates for "re-publish as a fresh angle" suggestions.

### 13.2 Medium value, medium cost

- **Thread expansion**: a long-form kind 30023 auto-generates a companion X thread + a NOSTR kind 1 teaser + a LinkedIn medium-form summary + a TikTok short script. One input, four outputs.
- **Guest-post ingestion**: accept markdown contributions from trusted collaborators through a limited-scope token, route to drafts for review. Useful if a team member wants to ghost-write without nsec access.
- **Link performance**: tie Sovereign Link click data back to posts. Top-performing post = most clicks, not most reactions.
- **Quiet hours**: no publishes between 22:00 and 06:00 CET (configurable). Prevents accidentally publishing mid-night due to a slipped timezone.

### 13.3 High value, high cost

- **True team mode**: NIP-46 delegated signing for NOSTR; OAuth sub-tokens for X; role-based access in the GUI (Admin / Editor / Viewer).
- **Cross-account analytics roll-up**: unified "how am I doing across NOSTR + X + LinkedIn + TikTok this month" dashboard.
- **Paid sub-tier for creators** (ties to `brickos-licensing`, design 022): tier-gated features could include AI b-roll generation, advanced resonance, unlimited voice clones.

---

## 14. Social-Exposure Levers (What Actually Moves the Needle)

Features in §13 are useful; these are the ones that specifically increase **social exposure**, ranked:

1. **Resonance + human-reviewed comments** (§9). The fastest non-advertising way to grow reach on NOSTR and X is to comment substantively on other people's posts in your niche. Automating discovery (not reply!) is the exact lever.
2. **TikTok short-video pipeline** (§8). TikTok's algorithm delivers zero-follower reach like no other platform. One viral 15 s clip from the book can do more than a month of NOSTR posts.
3. **Consistent posting cadence** (§6.6 + §10.1 calendar). Platforms reward daily activity. The calendar view makes gaps visible.
4. **Thread expansion** (§13.2). Single piece of content -> four channels = 4x exposure for 1.2x the effort.
5. **Evergreen re-surface** (§13.1). Your best posts from 90 days ago are unseen by your last 90 days of new followers.
6. **Voice-to-post** (§13.1). Removes the friction that kills daily posting.
7. **Reply queue in the same app** (planned in 007 Phase 4). Responding within 15 min of a mention compounds reach; having the queue where the posting happens keeps the loop tight.
8. **Content-performance leaderboard**. Surface "your top 10 posts this quarter" weekly; patterns emerge (topic, length, time-of-day).
9. **Cross-promotion swap**. When another content creator's npub shows up repeatedly in Resonance with high relevance scores, surface a "mutual-boost candidate" card.

---

## 15. Drawbacks and Honest Limitations

### 15.1 Product risks

1. **AI slop detection**: algorithmic detectors (Originality.ai, GPTZero) will flag AI-drafted posts. Even with tone checks, posts will feel off to some readers. Counter: keep the human in the loop for editing; publish under the user's real voice, not a generic AI's.
2. **Tone drift**: if the AI's draft is "good enough", users will stop editing. In six months the feed reads like a bot wrote it. Counter: explicit edit-before-publish gate that cannot be skipped, and a weekly "drift report" comparing published posts to the user's historical voice profile.
3. **Channel fragility**: X's paid API, TikTok's approval program, LinkedIn's closed ecosystem -- any of these can change ToS and break the integration overnight. Counter: build each channel's adapter as a minimum-coupled plugin; NOSTR is the only guaranteed channel.
4. **Reach asymmetry**: NOSTR users don't see X's audience and vice versa. Cross-posting doesn't automatically translate to cross-platform growth. The TikTok bet is the biggest asymmetric reach play.
5. **Book over-exposure**: turning "Brick by Brick" into 200 short videos could saturate -- the book's existing readers will feel the repetition. Solution: tag content by chapter; rate-limit per chapter; prioritise new angles over old.
6. **Resonance false positives**: a bad comment can hurt reputation more than 50 good ones help. The "human decides" safeguard is non-negotiable.

### 15.2 Technical risks

1. **Image-gen cost**: DALL-E 3 at ~$0.04/image, Flux via Replicate at ~$0.03/image. At 10 posts/day across channels with regenerate-until-satisfied, the bill climbs fast. Budget alerts + monthly caps.
2. **Video render throughput**: a single VPS worker is the bottleneck. Need explicit queue + per-user daily render cap + a "render priority" setting.
3. **PDF extraction quality**: PDFs vary wildly. Book PDFs with footnotes, two-column academic PDFs, and scanned PDFs all need different extractors. Pragmatic: ship with one library (e.g. pdfium) and escalate to OCR as a separate code path when text extraction fails.
4. **Migration from v0.2 JSON**: if a user has months of history in `.publish-state.json`, the importer needs to preserve external_ids (NOSTR event ids) so `/proof` and analytics stay continuous.
5. **Cross-app concurrency**: SHI, Oracle, and CRM all wanting to publish could flood the runner. Need per-app and per-channel rate limiting.

### 15.3 Scope risks

1. **Kitchen-sink temptation**: the feature list in §13 is long. Ship in phases (§16); resist bundling.
2. **"Brick by Brick" as a single source**: the pipeline must work for arbitrary sources. Don't special-case the book.
3. **Headless CLI deprecation pressure**: some users want the scheduler without the GUI. Keep the runner independently runnable through v1.x.

---

## 16. Innovative Approaches Worth Considering

### 16.1 "Voice Fingerprint" style transfer

Train a small local model on the user's last 500 posts. Use it to rewrite any AI-drafted body so that output matches the user's historical style (sentence length distribution, paragraph structure, vocabulary). Measurable via cosine similarity on sentence embeddings.

**Innovative because**: most AI-assisted writing tools drift toward a generic ChatGPT voice. A local fingerprint model fights drift rather than just flagging it.

### 16.2 NOSTR-native cross-promotion graph

Use the NOSTR contact graph (kind 3) to identify accounts that follow you AND follow other creators whose topics overlap with yours. Surface them as "soft-network" candidates for Resonance, so your comments reach people who already know both parties.

**Innovative because**: existing tools use a flat keyword match. Graph-weighted relevance is a qualitative improvement in signal-to-noise.

### 16.3 Pre-signed delayed-publish events

For high-stakes posts (announcements, contract claims), sign the NOSTR event locally *and* store its signed JSON in a commitment file. If you are incapacitated before the scheduled publish, a trusted contact can publish the pre-signed event. It remains verifiably yours.

**Innovative because**: solves a real problem (content continuity on creator incapacitation) with native cryptographic primitives; no platform-specific workaround.

### 16.4 Topic-depletion tracking

Track "how many posts per topic" across 90 days. When a topic runs low (< 1 post in the last 4 weeks), Voice surfaces it as a "topic drought" candidate for the next source ingest. Keeps topical coverage balanced.

**Innovative because**: content planning usually works forward from material. Drought tracking works backward from the feed, preventing the "I've posted about X four times this week" blindspot.

### 16.5 "Resonance karma"

Track how often a creator's content shows up in your Resonance matches and how their creators' content shows up in yours. Bidirectional signal -> mutual-boost candidates. With consent, automate cross-boosts for high-karma pairs (human still reviews each).

**Innovative because**: collaborative growth without the shill-farm dynamic; karma is earned by topic overlap, not transactional quid-pro-quo.

### 16.6 PGP-style post signing for non-NOSTR channels

X, LinkedIn, TikTok have no native cryptographic authenticity. Voice can append a tiny signature fragment (or a nevent link) to the end of every cross-posted body, letting interested readers verify the post against a NOSTR-anchored original. Helps combat impersonation.

**Innovative because**: extends NOSTR's authenticity guarantees across channels that don't natively have them.

---

## 17. Implementation Phases

12-week rollout, each phase ending in a published release (`.github/workflows/release.yml` fires on `sovereign-voice/v1.X.Y`).

### Phase 1 -- Scaffold + Data Model (Weeks 1-2) -> v1.0.0-alpha

- Run scaffold (Option A, §4.1): new `api/` + `frontend/` merged into existing directory, existing TS moved to `runner/`.
- `svo.*` schema migrations.
- `brickos-jobs` crate extracted (minimum viable: queue, worker, retry).
- `runner/` ported to read from Postgres; existing `schedule.json` importer.
- Channels CRUD (NOSTR only).
- Dashboard shell.

### Phase 2 -- Generation Pipeline (Weeks 3-5) -> v1.1.0

- Sources ingest (PDF, URL, text).
- Topic proposal via `brickos-ai`.
- Draft generation per channel (NOSTR only this phase).
- Tone check + hashtag policy.
- Image-prompt-only mode (user supplies image).
- Post preview + edit UI.

### Phase 3 -- Composition GUI (Weeks 6-7) -> v1.2.0

- Calendar view with drag-and-drop rescheduling.
- Table view with filters and bulk actions.
- Daily digest email.
- Quiet hours.

### Phase 4 -- Image Generation (Weeks 8-9) -> v1.3.0

- Auto-generate mode via `brickos-ai` image module.
- `brickos-blob` crate extracted (MinIO adapter).
- Image library UI (reuse existing images).
- A/B headline picker.

### Phase 5 -- Multi-Channel (Weeks 10-11) -> v1.4.0

- X adapter: OAuth2, tweet creation, threads.
- Thread expansion feature (one input, four outputs).
- Stacker News optional adapter.
- `brickos-voice-client` crate (for SHI, Oracle, CRM to publish through Voice).

### Phase 6 -- Resonance (Week 12) -> v1.5.0

- `resonance_rules` + `resonance_matches` tables.
- NOSTR relay subscription worker.
- RSS polling worker.
- AI relevance scoring.
- Suggestion draft UI with approve / dismiss flow.

### Post-v1: TikTok track (Weeks 13-18) -> v1.6.0

- TikTok Voice Reels pipeline (§8) as a parallel track; separate worker, separate frontend route.
- ElevenLabs / Cartesia / XTTS adapter.
- ffmpeg render worker.
- Draft-mode export first; Approved-mode API publish later.

### Post-v1: Innovative track (as separate design doc stubs)

- 025: Voice Fingerprint style transfer
- 026: NOSTR-native cross-promotion graph
- 027: Pre-signed delayed-publish events
- 028: Topic-depletion tracking
- 029: Resonance karma
- 030: Cross-channel post signatures

---

## 18. Acceptance Criteria (v1.0)

Sovereign Voice v1.0 ships when:

- [ ] Scaffold-merged app builds; `api/` responds on `:8086/health`; frontend renders on `:3006`.
- [ ] `schedule.json` importer runs clean; an existing v0.2 install lifts to v1.0 with zero lost history.
- [ ] Runner continues to publish scheduled posts from DB unchanged (regression-protected by the existing 29 tests + new integration tests).
- [ ] End-to-end flow: upload PDF -> get topic proposals -> approve one -> generate NOSTR kind 1 draft + kind 30023 long-form -> preview -> schedule -> publish -> event visible on three independent relays.
- [ ] Tone check blocks an em-dash-heavy draft (tests memory-stored preference).
- [ ] Calendar + table views render with > 100 test posts without perf regressions.
- [ ] Image prompt-only mode works end-to-end (generate prompt, user uploads image, attached to post, NIP-92 imeta published).
- [ ] Release tag `sovereign-voice/v1.0.0` triggers the release workflow (when on main) OR is backfilled by the script if default-branch gap still open.

---

## 19. Open Questions

1. **Scaffold path**: Option A (manual merge, ship v1.0 faster) vs Option B (add `--into-existing`, ship v1.0 later with cleaner upstream). Recommendation: A now, extract B into design 019 follow-up.
2. **Image-gen default provider**: DALL-E 3 (best text rendering, OpenAI dependency), Flux via Replicate (highest quality, external), or local ComfyUI (sovereign but slow). Suggest DALL-E 3 as default + local ComfyUI as "sovereign" profile.
3. **TTS provider for TikTok**: ElevenLabs is commercial standard; Cartesia is faster; XTTS is open-source but less natural. Pragmatic: ElevenLabs default, Cartesia fallback, XTTS as "fully sovereign" option.
4. **LinkedIn**: stay semi-manual (export) or invest in Marketing API approval? Depends on audience composition data -- current numbers say minority share, so semi-manual in v1, revisit if ratio shifts.
5. **Tone-check enforcement**: blocking (user must edit) or advisory (warning, user can override). Start advisory; tighten to blocking for specific rules (em-dash ban) where the user's preference is explicit.
6. **Runner fate**: keep forever as headless option, or deprecate after v1.2 once GUI is mature? Helmut depends on systemd reliability today -- keep it.
7. **TikTok ToS risk tolerance**: default to draft-mode export (safe); enable API publishing only when the user opts in and has approved app status. Confirm.
8. **Per-user pricing**: AI generation costs scale per user. Free tier caps at N generations/day? Licensing design (022) should decide.
9. **Book PDF availability**: "Brick by Brick" exists in multiple formats. Which canonical file does the book-chapter ingestor read from? Owner: Helmut.
10. **Headline voice**: the user's own voice, or a stable "Sovereign Voice" meta-voice that's consistent across all users? Per-user fingerprint is the right answer; meta-voice would erase the sovereignty angle.

---

*Sovereign Voice v1.0 -- GUI + Content Pipeline + Multi-Channel + Discovery -- Draft v0.1 -- April 2026*
