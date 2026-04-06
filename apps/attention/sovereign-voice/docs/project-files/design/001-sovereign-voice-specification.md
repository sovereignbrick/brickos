# 001 - Sovereign Voice: Product Specification

**Version:** 1.0
**Date:** 2026-04-06
**Status:** Draft
**Codebase:** `apps/attention/sovereign-voice/`
**Pillar:** Attention (P4) + Community (F2)

---

## 1. Product Vision

Sovereign Voice is a **self-hosted NOSTR content management and community growth tool** that gives individuals and small organizations full control over their publishing, audience, and attention infrastructure.

It started as a scheduler. It will evolve into the attention pillar of BrickOS - the tool that manages how you communicate, grow your audience, and engage your community, all without depending on centralized platforms.

### Why it exists

1. **NOSTR has no native scheduling.** You publish or you don't. There is no "queue this for Monday at 10:00 UTC." Content creators need to plan and automate.
2. **Audience growth on NOSTR is manual.** There is no algorithm helping you. Growth requires consistent publishing, strategic engagement, and community building - all of which can be systematized.
3. **BrickOS needs an attention layer.** The sovereign stack has money (Bitcoin), health (SHI), infrastructure (Sovereign Link), but no tool for managing communication and audience. Sovereign Voice fills this gap.
4. **Attention is the fourth pillar.** The book "Brick by Brick" identifies attention as one of the five pillars of sovereignty. "Your attention is proof-of-work for your life." The same principle applies to your output: your content is proof-of-work for your reputation.

### What it is today (v0.1 - shipped)

A TypeScript CLI that schedules and publishes NOSTR notes to relays on a cron schedule. Deployed on a VPS, running as a systemd daemon.

### What it becomes (v1.0+)

A sovereign content management platform: schedule, publish, analyze, engage, and grow - all from your own infrastructure, authenticated with your NOSTR keys.

### What it is NOT

- Not a NOSTR client (use Primal, Damus, Amethyst for reading)
- Not a social media management SaaS (no hosted version, no accounts, no monthly fee)
- Not a bot farm or spam tool (rate-limited, single-identity, transparent)

---

## 2. Architectural Position in BrickOS

### The Sovereignty Stack

```
Pillar 1: Finance     -> Bitcoin, Cashu Mint, Sovereign Exchange
Pillar 2: Health      -> Sovereign Health Intelligence (SHI)
Pillar 3: Data        -> Sovereign Proposal Platform (SPP)
Pillar 4: Attention   -> Sovereign Voice (this project)
Pillar 5: Energy      -> Sovereign Almanac

Foundation F1: Technology -> Sovereign Link, Sovereign Identity, NOSTR Relay
Foundation F2: Community  -> Trust Scores, Mutual Aid, Governance
```

Sovereign Voice sits at the intersection of **Attention (P4)** and **Community (F2)**:

- **Attention:** Manages your outbound communication. What you publish, when, to whom, and how effectively.
- **Community:** Manages your inbound relationships. Who follows you, who engages, how you respond, and how you grow trust.

### Cross-Pillar Integration

| Integration | How |
|---|---|
| **Sovereign Link (F1)** | Short links in posts use Sovereign Link for click tracking. Every `brickos.io/r/xyz` link in a NOSTR note is tracked. Content performance measured by real clicks, not vanity metrics. |
| **Sovereign Health (P2)** | "Proof of Blood" content series published automatically. Health milestones trigger posts ("90 days of carnivore - here's what changed"). |
| **Sovereign Identity (F1)** | NOSTR NIP-98 authentication. Same keypair signs your content and logs into all BrickOS apps. No separate accounts. |
| **Trust Scores (F2)** | Engagement quality feeds into community trust. Users who consistently engage get higher trust scores for governance and mutual aid. |

---

## 3. User Personas

### Persona 1: Solo Creator ("Helmut")

- Runs a sovereignty-focused brand (blog, book, podcast)
- Publishes daily content across NOSTR, Stacker News, and social platforms
- Needs consistent publishing without being online every day
- Tracks which content drives signups and engagement
- **Current pain:** Manual posting, no analytics, no scheduling
- **Auth:** NOSTR nsec (stored in systemd encrypted credentials)

### Persona 2: Community Builder ("Sarah")

- Runs a carnivore/keto health community (500+ members)
- Needs to post announcements, challenges, and updates on a schedule
- Wants to identify and engage active community members
- Monitors mentions and replies to respond quickly
- **Current pain:** Misses mentions, can't track community growth
- **Auth:** NOSTR nsec or NIP-46 remote signing

### Persona 3: Organization ("BitcoinVienna")

- Runs meetups, events, and educational programs
- Multiple team members need to post under the organization's npub
- Needs approval workflows (draft -> review -> publish)
- Tracks event signups and community engagement
- **Current pain:** Shared nsec is a security risk, no workflow
- **Auth:** NIP-46 (Nostr Connect) for delegated signing

---

## 4. Evolution Roadmap

### Phase 1: Scheduler (v0.1 - SHIPPED)

What we built and deployed today.

| Feature | Status |
|---|---|
| Publish kind 1 notes immediately | Done |
| Publish kind 30023 long-form articles | Done |
| Schedule notes via JSON config with ISO timestamps | Done |
| Schedule notes via cron expressions | Done |
| Companion notes (kind 1 teaser for long-form) | Done |
| Retry logic (3 attempts per relay) | Done |
| Publish state tracking (idempotent restarts) | Done |
| Systemd service with encrypted credentials | Done |
| CLI: publish, schedule, list, test commands | Done |
| Multi-relay publishing (configurable) | Done |

### Phase 2: Analytics & Link Tracking (v0.2)

Understand what works. Integrate with Sovereign Link.

| Feature | Description |
|---|---|
| **Click tracking via Sovereign Link** | Every URL in a published note gets auto-shortened via Sovereign Link API. Clicks tracked per-link, per-post, per-day. |
| **Engagement metrics** | Query relays for reactions (kind 7), reposts (kind 6), and replies (kind 1 with e-tag) on published events. |
| **Follower tracking** | Query relays for kind 3 (contact list) events that include your pubkey. Track follower count over time. |
| **Content performance dashboard** | CLI or web UI showing: posts published, reactions per post, top-performing content, follower growth curve. |
| **Relay health monitoring** | Track which relays accept and serve your events reliably. Drop underperforming relays, add new ones. |

### Phase 3: Audience Management (v0.3)

Know your community. Segment. Prioritize.

| Feature | Description |
|---|---|
| **Follower database** | Local SQLite database of all followers (pubkey, display name, follower count, first seen, last interaction). Updated daily from relay queries. |
| **Audience segmentation** | Tag followers by type: "health", "bitcoin", "developer", "creator". Manual or auto-detected from their posts and bio. |
| **Engagement scoring** | Score followers by engagement: reactions, replies, reposts, mentions. Identify your top 50 most engaged followers. |
| **Growth tracking** | Daily follower count, net new, churned. Weekly growth rate. Milestone alerts ("You reached 1,000 followers"). |
| **Notable follower alerts** | Alert when a high-follower account follows you or engages with your content. |

### Phase 4: Smart Engagement (v0.4)

Grow strategically. Engage authentically.

| Feature | Description |
|---|---|
| **Mention monitoring** | Watch for notes that mention your npub or configured keywords (e.g., "sovereign health", "brickos", "proof of blood"). Alert via webhook, email, or Telegram. |
| **Reply queue** | Collect incoming replies and mentions into a queue. Review and respond from a single interface. Mark as read, star, defer. |
| **Engagement suggestions** | Surface posts from accounts you follow that are getting high engagement. Suggest commenting to increase visibility. |
| **Auto-reactions** | Optionally auto-zap (via NWC - Nostr Wallet Connect) or auto-react to posts from whitelisted pubkeys. Configurable: "zap 21 sats to any post from these 10 accounts." |
| **Follow-back rules** | Auto-follow accounts that meet criteria: "follows me + has > 100 followers + bio contains 'bitcoin' or 'health'." Configurable filters. |
| **Comment templates** | Pre-written response templates for common interactions. Select and customize before posting. |

### Phase 5: Multi-Account & Team (v0.5)

Scale beyond solo creator.

| Feature | Description |
|---|---|
| **Multi-identity** | Manage multiple NOSTR identities from one instance. Publish as "TwentyOne.Life" or "BrickOS" depending on context. |
| **NIP-46 delegation** | Team members sign events via Nostr Connect without sharing the nsec. Revocable, auditable, per-permission. |
| **Approval workflow** | Draft -> Review -> Approve -> Publish pipeline. Team member writes draft, admin approves, scheduler publishes. |
| **Content calendar** | Visual calendar showing scheduled, published, and draft content across all identities. |
| **Role-based access** | Admin (full access), Editor (draft + schedule), Viewer (analytics only). |

### Phase 6: Cross-Platform (v0.6)

NOSTR first. Everything else second.

| Feature | Description |
|---|---|
| **Stacker News cross-post** | Publish to Stacker News via API (if/when available) or generate copy-paste-ready formatted posts. |
| **RSS feed generation** | Generate an RSS/Atom feed from published NOSTR notes. Allows aggregators and podcatchers to pick up content. |
| **Webhook integration** | Fire webhooks on publish events. Connect to Zapier, n8n, or custom workflows. |
| **NOSTR-to-blog bridge** | Auto-publish NOSTR notes to a Ghost/WordPress blog via API. |

---

## 5. Technical Architecture

### Current (v0.1)

```
nostr-scheduler/
  src/
    index.ts          # CLI entry (commander)
    config.ts         # .env + schedule.json loading
    publisher.ts      # Event signing + relay publishing + retry
    scheduler.ts      # Cron scheduling + state tracking
  schedule.json       # Content schedule
  .publish-state.json # Idempotent publish tracking
  .env                # NOSTR_NSEC (or systemd credential)
```

**Dependencies:** nostr-tools, croner, commander, dotenv
**Runtime:** Node.js 22+, systemd service on VPS
**Auth:** nsec from environment variable or systemd encrypted credential
**Storage:** JSON files (schedule, state)
**Size:** ~50KB compiled, <25MB with node_modules

### Target (v1.0)

```
sovereign-voice/
  src/
    core/
      publisher.ts      # Event signing + relay publishing
      scheduler.ts      # Cron scheduling engine
      identity.ts       # NIP-46 + nsec management
    analytics/
      engagement.ts     # Reaction/reply/repost tracking
      followers.ts      # Follower database + growth tracking
      links.ts          # Sovereign Link integration
      relay-health.ts   # Relay monitoring
    audience/
      database.ts       # SQLite follower/audience store
      segments.ts       # Audience segmentation
      scoring.ts        # Engagement scoring
    engagement/
      mentions.ts       # Mention monitoring
      reply-queue.ts    # Reply management
      auto-react.ts     # Auto-zap, auto-follow rules
      suggestions.ts    # Engagement opportunity surfacing
    api/
      routes.ts         # REST API for web UI
      auth.ts           # NIP-98 authentication
    web/
      dashboard/        # Analytics dashboard (server-rendered)
      calendar/         # Content calendar view
      queue/            # Reply queue view
  db/
    migrations/
      001_followers.sql
      002_posts.sql
      003_engagement.sql
  templates/            # askama HTML templates (like Sovereign Link)
  static/
    style.css           # BrickOS design tokens
```

### Sovereignty Primitives (shared with all BrickOS apps)

| Primitive | Implementation |
|---|---|
| **Identity** | NOSTR keypair (nsec/npub). NIP-98 for web auth. NIP-46 for delegation. |
| **Data storage** | Local SQLite. No cloud. No external databases. |
| **Encryption** | Content encrypted at rest (optional). nsec stored in systemd credentials. |
| **Self-hosting** | Docker single container. Static binary option (future). |
| **Open source** | AGPL-3.0. Fully auditable. |
| **No tracking** | No telemetry. No phone-home. No analytics on the tool itself. |

---

## 6. Sovereign Link Integration (Detail)

This is the first cross-app integration in BrickOS. It demonstrates how sovereign tools compose.

### Flow

```
1. User writes a note with a URL:
   "Check out our health tracker: https://sovereignhealth.io"

2. Before publishing, Sovereign Voice calls Sovereign Link API:
   POST /api/v1/links { target: "https://sovereignhealth.io", code: "shi" }
   -> Returns: https://brickos.io/r/shi

3. Sovereign Voice replaces the URL in the note:
   "Check out our health tracker: https://brickos.io/r/shi"

4. Note is published to NOSTR relays.

5. When someone clicks brickos.io/r/shi:
   - Sovereign Link records the click (referrer, country, timestamp)
   - Redirects to sovereignhealth.io

6. Sovereign Voice queries Sovereign Link API for click data:
   GET /api/v1/links/{id}/stats
   -> Returns: 47 clicks, 12 from Germany, 8 from US, top referrer: primal.net

7. Analytics dashboard shows: Post #1 drove 47 clicks to sovereignhealth.io
```

### API Integration

```typescript
interface SovereignLinkConfig {
  baseUrl: string;      // e.g., "https://brickos.io"
  apiKey: string;       // Sovereign Link API key
  autoShorten: boolean; // Replace URLs before publishing
  trackClicks: boolean; // Query click stats after publishing
}
```

---

## 7. Attention as a Sovereign Pillar

### The Problem

Attention is the most exploited resource in the fiat system.

Social media platforms monetize your attention through algorithmic manipulation. They decide who sees your content. They sell your engagement patterns to advertisers. They can suppress, amplify, or delete your voice at any time.

For creators, the dependency is even deeper: your audience, your reach, your reputation - all stored on someone else's server. Deplatforming means losing years of relationship building overnight.

### The Sovereign Alternative

NOSTR solves the protocol layer: censorship-resistant publishing, keypair-based identity, relay diversity. But NOSTR does not solve the **strategy layer**: what to publish, when, to whom, and how to grow.

Sovereign Voice is the strategy layer. It applies the same sovereignty principles to content management that Bitcoin applies to money and SHI applies to health data:

| Fiat Attention | Sovereign Attention |
|---|---|
| Algorithm decides who sees your content | You publish to relays you choose |
| Platform owns your audience data | You own your follower database (local SQLite) |
| Analytics sold to advertisers | Analytics are yours, private, on your server |
| Platform can delete your content | Content lives on multiple relays, signed by your key |
| Growth requires platform compliance | Growth requires proof-of-work: consistent, valuable content |
| Scheduling requires SaaS (Buffer, Hootsuite) | Scheduling runs on your VPS, your cron, your terms |

### The Attention Stack

```
Layer 1: Protocol    -> NOSTR (relays, events, keypairs)
Layer 2: Publishing  -> Sovereign Voice (schedule, publish, manage)
Layer 3: Tracking    -> Sovereign Link (click analytics, URL management)
Layer 4: Growth      -> Sovereign Voice (audience, engagement, segmentation)
Layer 5: Monetization -> NWC/Zaps (value-for-value, no middleman)
```

Each layer is self-hosted, open source, and composable.

---

## 8. Community Management Vision

### Beyond Scheduling

The scheduler is the entry point. The real value is community management:

**Know your audience.** Who follows you? What do they care about? Who engages most? Who is a creator vs. a consumer? Sovereign Voice builds a local database of your community, updated daily from relay queries.

**Grow strategically.** Identify accounts in your niche with overlapping audiences. Engage with their content. Surface mutual follow opportunities. Track growth rate and correlate it with content types.

**Engage authentically.** Auto-reactions and follow-back rules sound like bot behavior, but the key is: you control the rules, you review the queue, you maintain the relationship. The tool surfaces opportunities; you make the decision.

**Manage attention.** "Noise is cheap. Signal requires effort." Sovereign Voice helps you focus your attention budget: prioritize replies from engaged followers, defer low-signal mentions, batch your engagement into focused sessions.

### Trust Integration

Sovereign Voice feeds into the BrickOS trust layer:

- Accounts that consistently engage positively build trust scores
- Trust scores are visible across BrickOS apps (governance votes, mutual aid, escrow)
- Your Sovereign Voice engagement data is one input into a broader trust model
- This creates a reputation system earned through proof-of-work, not purchased through advertising

---

## 9. Deployment Modes

### Standalone Mode (current)

Single binary/container. SQLite. Own auth. Runs independently.

| Property | Value |
|---|---|
| Database | SQLite (single file) |
| Auth | nsec from .env or systemd credential |
| UI | CLI (v0.1), server-rendered web (v1.0) |
| Config | JSON + .env |
| Binary size | < 20MB (target) |
| Memory | < 50MB |
| Dependencies | Node.js (current), Rust static binary (future) |

### Platform Mode (future)

Integrated into BrickOS platform. Shared auth, shared database.

| Property | Value |
|---|---|
| Database | PostgreSQL (shared with SHI) |
| Auth | brickos-auth JWT (shared session) |
| UI | Part of BrickOS admin panel |
| Sovereign Link | Direct API integration (same database) |

### Start9 Mode (future)

Packaged as a Start9 service (.s9pk).

| Property | Value |
|---|---|
| Database | SQLite (mounted volume) |
| Auth | nsec via Start9 config screen |
| Access | Tor hidden service + LAN HTTPS |
| Updates | Start9 marketplace |

---

## 10. Security

| Concern | Mitigation |
|---|---|
| nsec exposure | Systemd encrypted credentials. Never in plaintext files in production. |
| Relay MITM | Events are cryptographically signed. Tampering is detectable. |
| Auto-engagement abuse | All auto-actions are rate-limited. No mass-follow, no spam. |
| NIP-46 key theft | Delegated signing with revocable permissions. Audit log. |
| Local data access | SQLite encrypted at rest (optional). File permissions. |
| Spam prevention | Content deduplication. Minimum interval between posts. |

---

## 11. Success Criteria

### v0.1 (Scheduler - achieved)

1. Publish 14 daily notes on schedule without manual intervention
2. Survive VPS restart without republishing
3. 3/3 relay success rate consistently
4. nsec never stored in plaintext

### v0.2 (Analytics)

1. Click tracking on every link via Sovereign Link integration
2. Follower count tracked daily
3. Engagement metrics (reactions, replies) per post

### v1.0 (Community Management)

1. Follower database with 500+ entries
2. Mention monitoring with < 5 minute latency
3. Reply queue processing 20+ interactions per day
4. Growth rate of 10+ net new followers per week

---

## 12. Relationship to Sovereign Link

Sovereign Voice and Sovereign Link are complementary bricks:

| | Sovereign Link | Sovereign Voice |
|---|---|---|
| **Domain** | Infrastructure (URLs) | Attention (content) |
| **Pillar** | F1: Technology | P4: Attention |
| **Core function** | Shorten, redirect, track clicks | Schedule, publish, manage audience |
| **Data** | Click analytics | Content + engagement analytics |
| **Together** | Link tracking in published content = full content-to-conversion funnel |

The integration creates a complete content analytics pipeline:

```
Content created -> Scheduled -> Published -> Clicked -> Converted
(Sovereign Voice)  (SV)        (SV+NOSTR)   (Sov.Link) (SHI signup)
```

No centralized platform offers this with full data sovereignty. Buffer + Bitly + Google Analytics gives you the same pipeline, but your data lives on three different companies' servers.

With BrickOS: one server, one identity, full control.

---

## 13. Open Questions

- [ ] Should Sovereign Voice be rewritten in Rust for consistency with Sovereign Link and SHI backend?
- [ ] NIP-46 (Nostr Connect) vs. shared nsec for multi-account: which first?
- [ ] Web UI framework: server-rendered HTML (like Sovereign Link) or Next.js (like SHI)?
- [ ] Monetization: is this a free tool that drives SHI adoption, or a standalone product?
- [ ] How does auto-engagement avoid being perceived as inauthentic?
- [ ] Should follower data be encrypted at rest like health data, or is it public information anyway?
