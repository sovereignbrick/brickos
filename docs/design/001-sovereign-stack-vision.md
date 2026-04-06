# 001 -- BrickOS Sovereign Stack: Platform Vision & Design Document

**Status:** Draft / Ideation
**Date:** 2026-04-05
**Authors:** twentyone.life, Claude (brainstorm partner)
**Version:** 0.2.0

---

## 1. Executive Summary

BrickOS evolves from a health-focused sovereign platform into a **full sovereign daily-life stack** -- a suite of apps people use every day that happens to keep working when centralized systems fail.

The core thesis: **the sovereign architecture is not the emergency feature -- it IS the product.** Emergency mode is simply "the centralized shortcuts stopped working, and everything still functions."

People do not adopt sovereign tech because they fear a crisis. They adopt it because it is better: faster payments, private health records, censorship-resistant governance, mesh communication that works in rural dead zones. The crisis resilience is a natural consequence of the architecture, not a separate feature bolted on.

### The "Brick by Brick" Philosophy

Sovereignty is not one thing. It is a stack of capabilities -- each a brick in a self-reliant life. Lose one and the structure weakens. Lose them all and you are dependent.

Consider the average European's dependency chain:

- **Finance:** bank account, credit card, PayPal -- all censorable, freezable, surveilled
- **Health:** doctor's office stores your records, insurance company decides access
- **Data:** Google Drive, iCloud, Notion -- all ToS-revocable, all readable by the provider
- **Communication:** WhatsApp, email -- metadata harvested, accounts bannable
- **Knowledge:** Wikipedia, YouTube -- algorithmically curated, geographically restricted

Each of these is a single point of failure. BrickOS replaces each with a sovereign alternative that works locally first, syncs globally when possible, and degrades gracefully under pressure.

BrickOS organizes sovereign life into **7 pillars**, each supported by purpose-built apps.

### Pillar Diagram

```
  ╔═══════════════════════════════════════════════════════════════════════════╗
  ║                     B R I C K   b y   B R I C K                         ║
  ║                  7 Pillars of Sovereign Life                            ║
  ╠═══════════════════════════════════════════════════════════════════════════╣
  ║                                                                         ║
  ║   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    ║
  ║   │ FINANCE  │ │  HEALTH  │ │   DATA   │ │ATTENTION │ │  ENERGY  │    ║
  ║   │    $     │ │    +     │ │    #     │ │    @     │ │    ~     │    ║
  ║   │          │ │          │ │          │ │          │ │          │    ║
  ║   │ Exchange │ │ Sov.     │ │ Sov.     │ │ Sov.     │ │ Sov.     │    ║
  ║   │ BTC Track│ │ Health   │ │ Proposal │ │ Signal   │ │ Almanac  │    ║
  ║   │ Sov.Vote │ │ (SHI)    │ │ Platform │ │          │ │          │    ║
  ║   │ Cashu    │ │          │ │ (SPP)    │ │          │ │          │    ║
  ║   │ Mint     │ │          │ │          │ │          │ │          │    ║
  ║   └─────┬────┘ └─────┬────┘ └─────┬────┘ └─────┬────┘ └─────┬────┘    ║
  ║         │             │            │             │            │         ║
  ║   ══════╪═════════════╪════════════╪═════════════╪════════════╪═══════  ║
  ║   ┌─────┴─────────────┴────────────┴─────────────┴────────────┴─────┐  ║
  ║   │           F1: TECHNOLOGY & PRIVACY (Foundation)                 │  ║
  ║   │  Sovereign Identity -- Sovereign Link -- NOSTR Relay -- Tor    │  ║
  ║   │  TollGate -- Zapstore -- Grab Bag -- Network Degradation       │  ║
  ║   └─────────────────────────────┬───────────────────────────────────┘  ║
  ║   ┌─────────────────────────────┴───────────────────────────────────┐  ║
  ║   │           F2: FAMILY & COMMUNITY (Social Layer)                │  ║
  ║   │  Trust Scores -- Escrow -- Governance -- Mutual Aid            │  ║
  ║   │  Family Safety -- Reunion Protocol -- Dead Man's Switch        │  ║
  ║   └─────────────────────────────────────────────────────────────────┘  ║
  ║                                                                         ║
  ╚═══════════════════════════════════════════════════════════════════════════╝
```

### Pillar Overview

| # | Pillar | Core Question | Apps |
|---|--------|---------------|------|
| 1 | **Finance** | Can I transact, save, and trade without banks? | Sovereign Exchange, BTC Tracker, Sovereign Vote, Cashu Mint |
| 2 | **Health** | Can I own and access my medical data? | Sovereign Health (SHI) |
| 3 | **Data** | Can I govern and preserve information without centralized platforms? | Sovereign Proposal Platform (SPP) |
| 4 | **Attention** | Can I communicate without surveillance? | Sovereign Signal |
| 5 | **Energy** | Can I access knowledge and resources to sustain myself? | Sovereign Almanac |
| F1 | **Technology & Privacy** | Is my infrastructure sovereign? | Sovereign Identity, Sovereign Link, NOSTR Relay, TollGate, Zapstore |
| F2 | **Family & Community** | Can we organize, trust, and help each other? | Trust Scores, Escrow, Governance, Mutual Aid |

### Design Principles

1. **Daily-use first, emergency-ready by design** -- adoption happens because the product is better, not because people fear a crisis. Emergency resilience is a natural consequence of the architecture.
2. **Local-first architecture** -- there is no "emergency switch." The app ALWAYS reads and writes locally. Remote sync is an optimization, not a requirement. When the network disappears, nothing changes except sync latency.
3. **Anonymous with reputation** -- NOSTR/BTC identity means no government ID required. Trust is earned through action (trades completed, proposals authored, arbiter decisions). Reputation is portable across the entire stack.
4. **No single point of failure** -- every layer has a fallback. Clearnet fails, use Tor. Tor fails, use satellite. Satellite fails, use mesh. Mesh fails, use sneakernet. The stack never fully breaks.
5. **Sovereign by default** -- user owns data, keys, and identity at all times. There is no "export my data" button because the data was never anywhere else.
6. **Interoperable and open** -- NOSTR events, Bitcoin payments, Cashu tokens. No proprietary lock-in. A user can leave BrickOS and take everything with them.
7. **Progressive complexity** -- a new user sees a simple app. Advanced users unlock NOSTR relay configuration, custom mint selection, mesh networking. Complexity is opt-in.

---

## 2. Architecture Overview

### 2.1 High-Level System Diagram

```
                         ┌──────────────────────────────┐
                         │        USER DEVICES           │
                         │  Desktop / Mobile / Start9    │
                         └──────────────┬───────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
              ┌─────▼─────┐     ┌──────▼──────┐     ┌─────▼──────┐
              │  Frontend  │     │  Frontend   │     │  Frontend  │
              │ (Next.js)  │     │  (Next.js)  │     │ (Next.js)  │
              │  Health    │     │  Exchange   │     │  Signal    │
              └─────┬──────┘     └──────┬──────┘     └─────┬──────┘
                    │                   │                   │
              ┌─────▼──────┐     ┌──────▼──────┐     ┌─────▼──────┐
              │  Rust API  │     │  Rust API   │     │  Rust API  │
              │  (Axum)    │     │  (Axum)     │     │  (Axum)    │
              └─────┬──────┘     └──────┬──────┘     └─────┬──────┘
                    │                   │                   │
                    └───────────┬───────┘───────────┬──────┘
                                │                   │
                    ┌───────────▼────────┐  ┌──────▼─────────┐
                    │    SQLite / PG     │  │  NOSTR Relays  │
                    │   (local-first)    │  │  (gossip sync) │
                    └───────────┬────────┘  └──────┬─────────┘
                                │                   │
                    ┌───────────▼───────────────────▼────────┐
                    │         Start9 Node (home)             │
                    │   Canonical store + NOSTR relay         │
                    │   Cashu mint + Lightning node           │
                    └────────────────────────────────────────┘
```

### 2.2 App-to-Pillar Directory Structure

```
apps/
  finance/
    sovereign-exchange/        # P2P marketplace, barter, BTC payments
      api/                     #   Rust API (Axum)
      frontend/                #   Next.js frontend
      ops/                     #   Deploy scripts
    sovereign-mint/            # BrickOS Cashu mint service
      api/                     #   CDK-based mint (cdk-axum)
    btc-tracker/               # Bitcoin portfolio tracking (existing)
  health/
    sovereign-health/          # Health data ownership (existing, shipped)
      api/                     #   Rust API (shipped)
      frontend/                #   Next.js frontend (shipped)
      admin/                   #   Admin panel (shipped)
  data/
    sovereign-proposal/        # Censorship-resistant proposal governance (SPP)
      api/                     #   Rust API
      frontend/                #   Next.js frontend
  attention/
    sovereign-signal/          # Encrypted comms, NOSTR + BitChat
      api/                     #   Rust API (relay + bridge)
      frontend/                #   Next.js frontend
  energy/
    sovereign-almanac/         # Offline-first knowledge base
      api/                     #   Rust API (content indexing)
      frontend/                #   Next.js frontend (PWA)
  governance/
    sovereign-vote/            # Community decisions, DAO, arbiter elections
      api/                     #   Rust API
      frontend/                #   Next.js frontend
  infrastructure/
    sovereign-link/            # Start9 node management (existing)
      api/                     #   Rust API (existing)
  distribution/
    zapstore-relay/            # BrickOS Zapstore relay + Blossom
      api/                     #   Rust relay implementation

crates/
  brickos-nostr/               # NOSTR protocol core -- event signing, relay pool,
                               #   NIP implementations
  brickos-identity/            # NOSTR + BTC identity, ZK linkage, trust tiers
  brickos-trust/               # Trust score engine -- reputation accumulation,
                               #   decay, portability
  brickos-escrow/              # 2-of-3 multisig + Cashu P2PK escrow
  brickos-gossip/              # NOSTR event gossip + mesh sync (BitChat bridge)
  brickos-transport/           # Network degradation handler
                               #   (clearnet / tor / satellite / mesh / sneakernet)
  brickos-mint/                # Cashu mint integration (wraps CDK --
                               #   cdk-mint, cdk-sqlite)
  brickos-almanac-core/        # Offline content engine -- Djot parsing,
                               #   search index, tier management

packages/
  brickos-ui/                  # Shared React component library (existing)
  brickos-nostr-react/         # NOSTR React hooks (useNostrEvent, useRelay,
                               #   useNutzap)
  brickos-i18n/                # Shared i18n (existing, EN + DE minimum)
```

### 2.3 Shared Infrastructure

All apps share:

- **Authentication:** Sovereign Identity (NOSTR keypair login via NIP-07/NIP-46, fallback to email+password during migration period)
- **Payments:** Cashu nutzaps (NIP-61) for all in-app payments, Lightning for larger amounts
- **Data sync:** NOSTR relays as gossip layer, Start9 node as canonical store
- **Transport:** `brickos-transport` crate handles network degradation transparently
- **Trust:** `brickos-trust` crate provides cross-app reputation (a good trader on Exchange earns trust visible in Vote)
- **i18n:** All user-facing text through i18n (EN + DE minimum, per CLAUDE.md conventions)

---

## 3. Pillar 1: FINANCE

*"Can I transact, save, and trade without banks?"*

Finance is the most urgent pillar. History shows that financial censorship is the first tool of authoritarian control -- bank freezes (Canada 2022), capital controls (Greece 2015), currency destruction (Venezuela 2018+). A sovereign stack without sovereign finance is a hobby project.

### 3.1 Sovereign Exchange -- P2P Marketplace

A continuous local and cross-border marketplace where anyone can list goods, services, or assets for trade. Listings are NOSTR events (NIP-15 marketplace listings / NIP-99 classifieds). Settlement via barter, Bitcoin (Lightning), or Cashu ecash (NIP-61 nutzaps).

**Key Features:**

- **Listing creation:** Structured NOSTR events with title, description, price (BTC/fiat/barter), location (optional), images (Blossom CDN)
- **Search and discovery:** Full-text search, category filters, location radius, reputation filters
- **Multi-currency pricing:** BTC (sats), fiat equivalent (display only), barter description
- **Reputation-gated actions:** Minimum trust score to list high-value items, escalating limits as reputation grows
- **Offline browsing:** Listings cached locally, searchable without network

**Escrow System (2-of-3 Multisig):**

The escrow system ensures neither party can cheat. Three keys control the funds:

- **Key 1:** Buyer -- generated per-transaction
- **Key 2:** Seller -- generated per-transaction
- **Key 3:** Arbiter -- elected community member via Sovereign Vote

Normal flow (no dispute):

```
  Buyer                    Escrow (2-of-3)              Seller
    │                           │                          │
    ├── Lock funds ────────────>│                          │
    │                           │                          │
    │                           │<──── Ship / deliver ─────┤
    │                           │                          │
    ├── Confirm receipt ───────>│                          │
    │                           │                          │
    │   Buyer + Seller sign ───>│── Release funds ────────>│
    │                           │                          │
```

Dispute flow:

```
  Buyer          Arbiter           Escrow (2-of-3)         Seller
    │               │                    │                    │
    ├── Dispute ───>│                    │                    │
    │               │<── Evidence ───────┤<── Evidence ───────┤
    │               │                    │                    │
    │               ├── Ruling ─────────>│                    │
    │               │                    │                    │
    │   Arbiter + Winner sign ──────────>│── Release ────────>│
    │                                    │    (to winner)     │
```

**Payment Rails:**

| Method | Mechanism | Privacy | Speed |
|--------|-----------|---------|-------|
| Barter | No payment -- mutual exchange | Full | Instant |
| Lightning | NIP-47 hold invoices via escrow | Moderate | Seconds |
| Cashu | P2PK locked tokens (NUT-11) with timelocks | High | Instant |
| On-chain BTC | 2-of-3 multisig (fallback for large amounts) | Moderate | ~30 min |

**Fee Structure:**

| Trade Type | Buyer Fee | Seller Fee | Emergency Mode |
|------------|-----------|------------|----------------|
| Barter | Free | Free | Free |
| BTC (any rail) | 0.5% | 0.5% | Free for subscribers |
| Cashu | 0.3% | 0.3% | Free for subscribers |

### 3.2 BTC Tracker (existing)

Bitcoin portfolio tracking -- already shipped as part of BrickOS. Tracks holdings, cost basis, and performance. Will integrate with Exchange for automatic portfolio updates on trades.

### 3.3 Sovereign Vote (governance cross-pillar)

Community decision-making. Used across the stack:

- **Arbiter elections** for Exchange escrow disputes
- **Proposal ratification** for SPP proposals
- **Mint policy votes** for Cashu mint parameters
- **Community fund allocation** for mutual aid

Voting mechanisms:

- **Simple majority** -- one-npub-one-vote for straightforward decisions
- **Conviction voting** -- time-weighted: longer stake = more weight. Prevents last-minute vote swings.
- **Quadratic voting** -- Cashu-funded. Cost of N votes = N^2 tokens. Prevents plutocracy while allowing intensity of preference.

### 3.4 Cashu Mint

BrickOS-operated Cashu mint for private micropayments across the entire platform. Built on CDK (Cashu Development Kit).

**Technology stack:**

- `cdk-mint` -- core mint logic (blind signatures, token issuance/redemption)
- `cdk-axum` -- HTTP API layer
- `cdk-sqlite` -- local database (Start9-compatible)
- `cdk-phoenixd` -- Lightning backend (Phoenix daemon for channel management)

**Integration points:**

- NIP-60 wallet state stored on NOSTR relays (encrypted, user-controlled)
- NIP-61 nutzaps for all platform payments (Exchange fees, Vote funding, Signal tips)
- Multi-mint support -- users can choose any compatible Cashu mint, not just BrickOS's
- Mint discovery via NOSTR relay announcements

**Mint operation model:**

- BrickOS operates a default mint for convenience
- Any user can run their own mint on Start9 (Sovereign Link manages it)
- Federation possible via inter-mint swaps (future)

---

## 4. Pillar 2: HEALTH -- Sovereign Health (SHI)

*"Can I own and access my medical data?"*

**Status:** Shipped (v0.31.0+). The first pillar to reach production.

Sovereign Health is the proof of concept for the entire BrickOS thesis. It demonstrates that sovereign architecture is not a compromise -- it is better than the centralized alternative. Users own their biomarker data, import lab results, get AI-powered health insights, and share selectively with doctors.

**Current capabilities:**

- Biomarker tracking with 120+ supported markers
- Lab result import (PDF parsing, manual entry)
- AI health assistant (contextual, privacy-preserving)
- Admin panel for data management
- Full encryption at rest (AES-256-GCM)
- German statutory health insurance (SHI) integration
- Global search across all health data

**Cross-pillar integration (planned):**

| Integration | Target Pillar | Description |
|-------------|---------------|-------------|
| Encrypted health records in Grab Bag | Technology | Portable health data on USB/Coldcard |
| Share records via Sovereign Signal | Attention | Send encrypted health records to a doctor via NOSTR DM |
| Medication trading on Exchange | Finance | List/find medications on the P2P marketplace |
| Health data governance via SPP | Data | Community proposals for health data standards |
| Emergency medical info in Almanac | Energy | First aid, medication guides, offline accessible |
| Health reputation in Trust | Community | Verified health data contributions build trust |

---

## 5. Pillar 3: DATA -- Sovereign Proposal Platform (SPP)

*"Can I govern information without centralized platforms?"*

NOSTR-native proposal governance anchored to Bitcoin via OpenTimestamps. SPP enables communities to deliberate, build conviction, and ratify decisions without any centralized platform controlling the process.

**Three-layer consensus model:**

```
  ┌─────────────────────────────────────────────────────────┐
  │  Layer 1: DELIBERATION                                  │
  │  ─────────────────────                                  │
  │  Structured positions on a proposal.                    │
  │  Pro/con arguments as NOSTR events.                     │
  │  Anyone can participate. No voting yet.                 │
  │  Duration: configurable (7-30 days typical)             │
  └──────────────────────────┬──────────────────────────────┘
                             │
                             ▼
  ┌─────────────────────────────────────────────────────────┐
  │  Layer 2: CONVICTION                                    │
  │  ────────────────────                                   │
  │  Zaps and nutzaps on individual arguments.              │
  │  Time-weighted: longer stake = more weight.             │
  │  Conviction threshold triggers ratification.            │
  │  Duration: open-ended until threshold                   │
  └──────────────────────────┬──────────────────────────────┘
                             │
                             ▼
  ┌─────────────────────────────────────────────────────────┐
  │  Layer 3: RATIFICATION                                  │
  │  ─────────────────────                                  │
  │  Happens OUTSIDE SPP (Sovereign Vote, DAO, etc.)        │
  │  SPP provides the evidence package.                     │
  │  Anchored to Bitcoin via OpenTimestamps.                │
  │  Result: immutable, timestamped, verifiable             │
  └─────────────────────────────────────────────────────────┘
```

**Key properties:**

- **Censorship-resistant:** Proposals are NOSTR events -- no single server can suppress them
- **Timestamped:** OpenTimestamps anchors prove a proposal existed at a specific time
- **Composable:** Any governance system can use SPP deliberation as input
- **Reputation-linked:** Argument quality builds trust score across the platform
- **Forkable:** Disagreement on a proposal creates a fork, not a suppression

**Full design document:** `apps/health/sovereign-health/docs/project-files/design/026-sovereign-proposal-platform.md`

---

## 6. Pillar 4: ATTENTION -- Sovereign Signal

*"Can I communicate without surveillance?"*

Communication is the most surveilled layer of modern life. Metadata alone (who talks to whom, when, how often) reveals more than content. Sovereign Signal replaces centralized messaging with NOSTR-native encrypted communication that degrades gracefully across network conditions.

**Protocol stack:**

| Level | Network State | Transport | Latency | Features |
|-------|--------------|-----------|---------|----------|
| 0 | Normal | NOSTR relays over clearnet | <1s | Full: DMs, groups, channels, media |
| 1 | Surveilled | NOSTR relays over Tor | 2-5s | Full (slower media) |
| 2 | Restricted | NOSTR over satellite (Blockstream) | 30-60s | Text only, receive-heavy |
| 3 | Local only | BitChat mesh (BLE/WiFi Direct) | <1s local | Text, small files, local group |
| 4 | Offline | Sneakernet (Grab Bag USB exchange) | Hours/days | Async message bundles |

**Core features:**

- **Direct messages:** NIP-17 encrypted DMs (gift-wrapped, metadata-protected)
- **Group chats:** NIP-29 relay-based groups with admin controls
- **Channels:** NIP-28 public channels for community broadcast
- **BitChat fallback:** Mesh communication via BLE/WiFi Direct when all internet is unavailable
- **Dead man's switch:** If a user does not check in within a configurable window, a pre-written message is sent to designated contacts (family safety)
- **Verified publishers:** NOSTR verification (NIP-05) for trusted news sources during crisis
- **Family safety groups:** Predefined contact groups with location sharing (opt-in), reunion protocols, and emergency broadcast

**Privacy guarantees:**

- End-to-end encryption at every level
- No metadata logging (relay operators see encrypted blobs)
- Sender/receiver unlinkable via gift wrapping (NIP-59)
- Group membership hidden from non-members
- Message deletion is real deletion (not just UI hiding)

---

## 7. Pillar 5: ENERGY -- Sovereign Almanac

*"Can I sustain myself with knowledge and resources?"*

When centralized knowledge platforms go down (or are censored), critical survival information becomes inaccessible. The Sovereign Almanac is an offline-first knowledge base that caches essential information locally, syncs community contributions via NOSTR, and ensures that the knowledge needed to sustain life is always available.

**Content format:** NIP-54 wiki articles using Djot markup (lightweight, unambiguous alternative to Markdown).

**Three tiers of knowledge:**

| Tier | Name | Size | Caching | Content Examples |
|------|------|------|---------|-----------------|
| 1 | Critical survival | ~5 MB | Pre-cached on install | Water purification, food preservation, first aid, shelter construction, fire starting, navigation without GPS |
| 2 | Self-sufficiency | ~50 MB | Cached on demand | Gardening, solar energy, mechanical repair, animal husbandry, basic finance, barter techniques, radio communication |
| 3 | Community resilience | ~500 MB | Synced via relay | Governance templates, legal frameworks, historical precedents, educational materials, trade skills, medical references |

**Historical lessons integrated:**

Each Almanac article can reference historical precedents to ground advice in real experience:

- **Weimar hyperinflation (1923):** Wheelbarrows of cash, barter economy emerges, those with real goods survive. Lesson: hold scarce assets, learn to trade.
- **Argentine crisis (2001):** Corralito bank freeze, neighborhood assemblies (asambleas), alternative currencies (patacones). Lesson: community organization is survival.
- **Greek capital controls (2015):** EUR 60/day ATM limit, cross-border payments blocked, businesses unable to import. Lesson: financial sovereignty is not paranoia, it is prudence.
- **Venezuelan collapse (2018+):** Hyperinflation destroys savings, Bitcoin becomes lifeline, mesh networks for communication. Lesson: the full stack matters, not just one layer.
- **Texas grid failure (2021):** Multi-day power outage, frozen pipes, no heat. Those with generators, stored water, and community networks fared best.
- **Ukraine displacement (2022):** Millions flee with nothing. Digital identity, Bitcoin savings, and portable records become lifelines.

**Offline-first architecture:**

- Content stored in local SQLite with full-text search (FTS5)
- NOSTR relay sync when network available
- Conflict resolution via CRDT (last-writer-wins per article section)
- Images stored as Blossom blobs, referenced by hash (content-addressable)
- PWA with service worker -- works fully offline after first load
- Incremental sync -- only changed articles downloaded, not entire tiers

---

## 8. Foundation: TECHNOLOGY & PRIVACY

The two foundation layers are not pillars in themselves -- they are the bedrock on which all five pillars stand. Without sovereign technology, every pillar is compromised. Without community, every pillar is lonely.

### 8.1 Sovereign Identity

**Core concept:** One identity across the entire stack. No email, no phone number, no government ID required.

**Identity components:**

- **NOSTR keypair (nsec/npub):** Primary identity. Signs all events, authenticates all API calls.
- **Bitcoin wallet (BIP39 seed):** Financial identity. Derives Lightning and on-chain addresses.
- **BitChat ID:** Mesh identity. Allows communication even without internet.
- **Zero-knowledge linkage:** User can prove "I am the same person across these identities" without revealing which person.

**Trust tiers:**

| Tier | Name | Requirements | Capabilities |
|------|------|-------------|--------------|
| 0 | Rookie | Fresh keypair | Read, browse, small purchases (<10k sats) |
| 1 | Verified | NIP-05 verification OR 3+ successful trades | List items, create proposals, vote |
| 2 | Trusted | 10+ successful trades AND 30+ days active | Large trades, create groups, moderate |
| 3 | Guardian | Community nomination + 90+ days trusted | Arbiter candidate, mint operator candidate |
| 4 | Arbiter | Elected via Sovereign Vote | Resolve disputes, emergency governance |

**Implementation:** Protocol-agnostic via `IdentityProvider` trait. See [003-sovereign-identity-roadmap.md](003-sovereign-identity-roadmap.md) for the full implementation plan.

### 8.2 Grab Bag -- Portable Identity

An encrypted export of your entire sovereign identity to a USB drive or Coldcard hardware wallet. The "bug-out bag" for your digital life.

**Contents:**

- NOSTR secret key (nsec)
- BIP39 seed phrase (Bitcoin wallet)
- Trust/reputation attestations (signed NOSTR events)
- Encrypted health records (AES-256-GCM)
- Almanac Tier 1 cache (critical survival, ~5 MB)
- Contact list (npubs of trusted people)
- Cashu token backup
- Reunion protocol coordinates (encrypted)

**Security:**

- **Encryption:** AES-256-GCM with key derived via Argon2id (passphrase-based, memory-hard)
- **Plausible deniability:** Hidden volume support (inspired by VeraCrypt). Two passphrases -- one reveals a decoy identity, the other reveals the real one. Under coercion, reveal the decoy.
- **Tamper detection:** HMAC over entire archive, verified on load
- **Format:** Single encrypted file, no metadata leakage in filename or headers
- **Size:** Typically 10-60 MB depending on health records and Almanac cache

### 8.3 TollGate -- Permissionless Internet

WiFi routers repurposed as paid access points. Anyone with a router and internet connection can sell bandwidth for Bitcoin micropayments.

**How it works:**

```
  User Device          TollGate Router           Internet
      │                      │                      │
      ├── Connect WiFi ─────>│                      │
      │<── Captive portal ───┤                      │
      │                      │                      │
      ├── Pay 1 sat/min ────>│                      │
      │   (Cashu nutzap)     │                      │
      │                      │                      │
      │<── Firewall open ────┤                      │
      │                      │                      │
      ├── Browse internet ──>│── Forward traffic ──>│
      │<── Response ─────────┤<── Response ─────────┤
      │                      │                      │
```

- Multi-hop mesh possible -- each hop adds its own fee (free-market pricing)
- Emergency relevance: when ISPs are shut down or censored, TollGate routers create an alternative internet
- Multiple hops can route around censorship points

Full design at [004-cashu-tollgate-zapstore.md](004-cashu-tollgate-zapstore.md).

### 8.4 Zapstore -- App Distribution

NOSTR-based app store (NIP-82). Censorship-resistant software distribution.

**Supported formats:**

| Platform | Format | Distribution |
|----------|--------|-------------|
| Linux Desktop | Flatpak | Zapstore relay + Blossom CDN |
| Android | APK | Zapstore relay + Blossom CDN |
| Server/Start9 | Docker/OCI | Zapstore relay + container registry |
| iOS | TestFlight (interim) | Apple-constrained (until sideloading laws) |

**Verification:** App releases are signed NOSTR events. Users verify the developer's npub, not a corporate certificate authority. Web of trust replaces centralized app review.

Full design at [004-cashu-tollgate-zapstore.md](004-cashu-tollgate-zapstore.md).

### 8.5 Network Degradation Model

The transport layer handles five levels of network degradation transparently. Applications do not need to know which level is active -- `brickos-transport` handles routing.

```
  Level 0: NORMAL
  ───────────────
  Clearnet (HTTPS)
  All features available
  Sync: real-time
      │
      ▼  (ISP surveilled / VPN blocked)
  Level 1: SURVEILLED
  ────────────────────
  Tor (.onion relays)
  All features available
  Sync: real-time (2-5s latency)
      │
      ▼  (Internet restricted / censored)
  Level 2: RESTRICTED
  ────────────────────
  Satellite (Blockstream Satellite)
  Read-only from global state
  Sync: receive-only, 30-60s delay
      │
      ▼  (No internet at all)
  Level 3: LOCAL ONLY
  ────────────────────
  BitChat mesh (BLE / WiFi Direct)
  Local community features only
  Sync: gossip with nearby devices
      │
      ▼  (No devices nearby)
  Level 4: OFFLINE
  ─────────────────
  Sneakernet (USB / Grab Bag)
  Single-user mode
  Sync: manual on next connection
```

**Automatic detection:** `brickos-transport` probes connectivity and escalates/de-escalates levels automatically. The user sees a small indicator icon but does not need to take action.

### 8.6 Data Sync -- Local-First, No Switch

There is no "emergency mode toggle." The architecture is the same in peacetime and crisis:

1. **App writes to local SQLite** -- always, immediately, no network required
2. **Sync engine publishes to NOSTR relay** -- when network available, as encrypted events
3. **Start9 node stores canonical copy** -- home server, user-controlled
4. **Other devices pull from relay/Start9** -- CRDT merge resolves conflicts

If the network disappears between step 1 and step 2, the app continues working. Step 2 happens whenever connectivity resumes. The user may not even notice.

**Conflict resolution:** Event sourcing with CRDT merge. Each field has a logical clock. Last-writer-wins per field (not per record). Deletions are tombstones with TTL.

---

## 9. Foundation: FAMILY & COMMUNITY

Sovereignty without community is survivalism. Sovereignty with community is resilience. This foundation layer provides the social infrastructure that makes the other pillars meaningful.

### 9.1 Trust as Social Infrastructure

The `brickos-trust` crate provides a cross-platform reputation system:

- **Accumulation:** Every successful interaction (trade completed, proposal authored, arbitration resolved) adds to trust score
- **Decay:** Trust decays slowly over inactivity (90-day half-life) to prevent stale reputations from outliving their relevance
- **Portability:** Trust score is a signed NOSTR event, verifiable by anyone, stored on relays. Leaving BrickOS does not destroy your reputation.
- **Context-specific:** A user's trust in Finance is separate from trust in Governance, though combined into an aggregate score
- **Sybil-resistant:** Trust requires real interactions with other trusted users. Creating 100 fake accounts does not create trust.

### 9.2 Mutual Aid

Coordinate community support during crisis:

- **Needs board:** "I need medicine / water / shelter" -- NOSTR listings with location
- **Offers board:** "I have surplus food / generator / medical skills"
- **Matching:** Proximity-based, trust-weighted (prioritize helping trusted community members)
- **Cashu micropayments:** Small tips to incentivize help (not required -- pure mutual aid also works)
- **Skill registry:** Community members register skills (medical, mechanical, agricultural) for emergencies

### 9.3 Family Safety

- **Check-in protocol:** Regular heartbeat ("I'm OK") on configurable schedule (daily, weekly)
- **Dead man's switch:** If heartbeat stops, pre-written messages sent to family group after configurable delay
- **Reunion protocol:** Predefined meeting points, encrypted and cached in each family member's Grab Bag. Multiple fallback locations.
- **Location sharing:** Opt-in, encrypted, family-group only, works on mesh (Level 3)
- **Emergency contacts:** Designated contacts outside the family who can relay messages if family mesh is down

### 9.4 Governance

Community self-governance via Sovereign Vote:

- **Constitutional templates:** Pre-built governance frameworks (direct democracy, representative, liquid democracy) that communities can adopt and customize
- **Role elections:** Arbiters, mint operators, relay operators, mutual aid coordinators -- all elected, all recallable
- **Fund management:** Community treasury via multisig, allocation decided by vote
- **Dispute resolution:** Escalation ladder from peer mediation to elected arbiter to community vote

---

## 10. Crisis Scenario User Journeys

These scenarios illustrate how BrickOS pillars work together under real-world pressure. Each scenario is drawn from historical precedent.

### Scenario 1: Bank Freeze

*Precedent: Canada 2022 (Freedom Convoy), Greece 2015 (capital controls)*
*Pillars: Finance, Technology*

**Without BrickOS:** Government freezes bank accounts of protest supporters. No access to savings. Cannot buy food, pay rent, or transact. Credit cards declined. PayPal frozen. Entirely dependent on cash if ATMs still work. Friends afraid to help due to guilt-by-association.

**With BrickOS:** User's Bitcoin is on a self-custodial wallet (BIP39 seed in Grab Bag). Cashu tokens in NIP-60 wallet on NOSTR relays -- no bank involved, no account to freeze. Sovereign Exchange continues operating -- buy groceries from local farmers via Lightning. Cashu nutzaps for coffee. Trust score proves you are a reliable community member. Life continues.

### Scenario 2: Food Rationing

*Precedent: Venezuela 2018+, wartime rationing*
*Pillars: Finance, Energy, Community*

**Without BrickOS:** Government controls food distribution. Long queues, corruption, favoritism. Black market emerges but is dangerous and unstructured. No way to verify food safety or fair pricing. Scammers thrive because there is no reputation system.

**With BrickOS:** Sovereign Exchange enables structured P2P food trading with escrow protection. Trust scores filter out scammers -- only trade with verified community members. Sovereign Almanac provides food preservation guides (Tier 1, already cached on device). Mutual Aid board coordinates neighborhood food sharing. Barter mode works without any payment infrastructure. Historical lessons from Argentine asambleas guide community organization.

### Scenario 3: Communication Blackout

*Precedent: Myanmar 2021 (military coup), Iran 2022 (Mahsa Amini protests)*
*Pillars: Attention, Technology*

**Without BrickOS:** Government shuts down internet. WhatsApp, Telegram, Signal -- all dead. No way to coordinate, verify news, or contact family. Radio is one-way. Rumors spread unchecked. People isolated in their homes with no information.

**With BrickOS:** Sovereign Signal degrades through transport levels automatically. Level 1 (Tor) if internet partially works. Level 3 (BitChat mesh) for local communication -- organize with neighbors via BLE. Family safety groups coordinate via mesh. Dead man's switch alerts family if someone goes silent. Verified publishers provide trusted news via mesh gossip -- rumors flagged as unverified. TollGate routers create pockets of internet access where power exists.

### Scenario 4: Currency Collapse

*Precedent: Weimar 1923, Zimbabwe 2008, Venezuela 2018+*
*Pillars: Finance, Energy, Community*

**Without BrickOS:** Savings evaporate overnight. Prices double daily. Cash becomes worthless paper. Barter is chaotic -- no common pricing, no trust, no escrow. Those without hard assets or foreign currency are destitute. Social fabric tears.

**With BrickOS:** Bitcoin holdings retain value (denominated in sats, not collapsing fiat). Sovereign Exchange becomes the primary marketplace -- barter mode and BTC pricing replace fiat. Cashu mint provides private micropayments without bank infrastructure. Almanac provides historical lessons on surviving hyperinflation (Weimar, Zimbabwe). Community governance via Vote coordinates collective response -- food sharing, skill exchange, mutual aid.

### Scenario 5: Lockdown / Movement Restriction

*Precedent: Global 2020-2022, China zero-COVID*
*Pillars: Health, Attention, Data*

**Without BrickOS:** Health records controlled by government. Vaccine status determines access to buildings, transport, employment. Communication surveilled for "misinformation." Proposals and petitions hosted on platforms that comply with takedown orders. Dissent is visible and punishable.

**With BrickOS:** Sovereign Health records are self-custodied -- user decides what to share, with whom, and when. No government database holds your records. Sovereign Signal provides private communication -- NIP-17 gift wrapping prevents metadata analysis. SPP enables censorship-resistant debate on policy -- no platform can take down a NOSTR event. Almanac provides medical information without algorithmic filtering or fact-checker gatekeeping.

### Scenario 6: Energy Crisis

*Precedent: Texas 2021 (grid failure), Europe 2022 (gas crisis)*
*Pillars: Energy, Technology, Finance*

**Without BrickOS:** Power grid fails. Internet goes down with it. No access to bank accounts (online banking dead). No way to coordinate with neighbors. Generator owners gouge prices because there is no transparent market. Information about the crisis is unavailable without internet.

**With BrickOS:** Almanac Tier 1 (pre-cached) provides emergency energy guides -- how to conserve heat, purify water without power, build a rocket stove. TollGate routers on battery/solar create local mesh internet. Sovereign Exchange enables generator/fuel trading with fair escrow -- no price gouging because the market is transparent and reputation-based. BitChat works without any infrastructure. Grab Bag on USB preserves identity and data through the outage.

### Scenario 7: Forced Migration

*Precedent: Ukraine 2022, Syria 2015+, Afghan evacuation 2021*
*Pillars: Technology, Finance, Health, Community*

**Without BrickOS:** Flee with whatever you can carry. Bank accounts inaccessible from abroad (or frozen by sanctions). Medical records left behind in a hospital that may no longer exist. No way to prove identity -- passport might be lost or expired. No trusted network in new location. Starting from zero.

**With BrickOS:** Grab Bag on a USB stick (or memorized BIP39 seed phrase) contains entire digital life. Bitcoin accessible from anywhere on Earth -- no bank, no border, no restriction. Health records travel with you, encrypted, shareable with new doctors via NOSTR DM. NOSTR identity works globally -- no government ID needed to prove you are who you say you are. Trust score portable to new community -- your reputation precedes you. Reunion protocol helps family reconnect across borders -- predefined meeting points, encrypted and cached in each Grab Bag.

---

## 11. Recommended Build Order

The build order prioritizes foundation layers first (identity and governance enable everything else), then expands outward through the pillars. Each phase builds on the previous and adds new capabilities.

| Phase | Name | Deliverables | Dependencies | Est. Duration |
|-------|------|-------------|--------------|---------------|
| 0 | **Current** | Sovereign Health (shipped), BTC Tracker, Sovereign Link | -- | Done |
| 1 | **Foundation** | Sovereign Identity MVP, Sovereign Vote MVP | brickos-nostr, brickos-identity | 6-8 weeks |
| 2 | **Data** | SPP MVP (target: BTC Prague) | brickos-nostr, Sovereign Identity | 4-6 weeks |
| 3 | **Finance (barter)** | Exchange listings + barter mode | Sovereign Identity, brickos-trust | 4-6 weeks |
| 4 | **Finance (BTC)** | Lightning + Cashu mint + escrow | brickos-mint, brickos-escrow, CDK | 8-10 weeks |
| 5 | **Attention** | Sovereign Signal MVP | brickos-nostr, brickos-gossip | 6-8 weeks |
| 6 | **Energy** | Sovereign Almanac MVP | brickos-almanac-core | 4-6 weeks |
| 7 | **Resilience** | TollGate, Zapstore, mesh, Grab Bag | brickos-transport, all crates | 10-12 weeks |

### Phase 0: Current State (Done)

- Sovereign Health: shipped at v0.31.0, biomarker tracking, lab imports, AI assistant
- BTC Tracker: portfolio tracking
- Sovereign Link: Start9 node management, dual-mode (platform + Start9)

### Phase 1: Foundation (Sovereign Identity + Vote)

**Sovereign Identity MVP:**
- NOSTR keypair generation and secure storage
- NIP-07 browser extension login (desktop)
- NIP-46 remote signing (mobile)
- Basic trust tier system (Rookie, Verified)
- Integration with existing Sovereign Health auth (migration path from email+password)
- `brickos-identity` crate with `IdentityProvider` trait

**Sovereign Vote MVP:**
- Simple majority voting on proposals
- Arbiter nomination and election
- NOSTR event-based ballots
- Basic anti-sybil (one npub, one vote, minimum trust tier)

### Phase 2: Data (SPP for BTC Prague)

**SPP MVP:**
- Proposal creation as NOSTR events
- Deliberation layer (pro/con arguments)
- Conviction voting (zap-weighted)
- OpenTimestamps anchoring
- Simple web frontend for conference demo
- Target: live demo at BTC Prague

### Phase 3: Finance -- Barter

**Exchange MVP (no BTC payments yet):**
- Listing creation (NIP-15/NIP-99 events)
- Category browsing and search
- Barter negotiation via NIP-17 DMs
- Trust score display on listings
- Location-based discovery (optional)

### Phase 4: Finance -- BTC Payments

**Full Exchange + Mint:**
- Lightning payment integration (NIP-47)
- Cashu mint deployment (CDK)
- P2PK escrow (NUT-11)
- 2-of-3 arbiter escrow
- Fee collection and distribution
- NIP-60 wallet state on relays

### Phase 5: Attention (Signal)

**Sovereign Signal MVP:**
- NIP-17 encrypted DMs
- NIP-29 group chats
- NIP-28 public channels
- Dead man's switch
- Family safety groups
- Basic BitChat bridge (BLE, experimental)

### Phase 6: Energy (Almanac)

**Sovereign Almanac MVP:**
- NIP-54 wiki engine (Djot markup)
- Tier 1 content: critical survival (~5 MB, pre-cached)
- Tier 2 content: self-sufficiency (~50 MB, on-demand)
- Full-text search (SQLite FTS5)
- PWA with service worker (offline-first)
- Community contributions via NOSTR

### Phase 7: Resilience (Full Stack)

**Complete sovereign infrastructure:**
- TollGate integration (WiFi-for-sats)
- Zapstore relay for BrickOS app distribution
- Mesh networking (BitChat production)
- Grab Bag export/import (encrypted identity backup)
- `brickos-transport` with all 5 degradation levels
- Satellite receive (Blockstream integration)
- Sneakernet tooling

**Total estimated timeline:** 12-18 months from Phase 1 start to Phase 7 completion, assuming single developer + AI pair programming. Phases can overlap where dependencies allow.

---

## 12. Open Questions

These are unresolved design decisions that need further brainstorming or research:

1. **Mint liability:** If BrickOS operates a Cashu mint, what are the legal implications under German/EU law (MiCA)? Should the mint be community-operated from day one?
2. **Content moderation in Almanac:** Who decides what Tier 1 (critical survival) content is? Community vote? Expert review? Both? How to prevent dangerous misinformation in survival guides?
3. **Arbiter incentives:** How are arbiters compensated? Flat fee per dispute? Percentage of escrow? Community fund? How to prevent arbiter corruption?
4. **Cross-mint interoperability:** How do users seamlessly transact across different Cashu mints? Federation? Atomic swaps? What is the UX for multi-mint wallets?
5. **Mobile-first vs desktop-first:** Which platform gets priority for each pillar? Health is desktop-first today -- should Exchange be mobile-first given its local-trading use case?
6. **Satellite integration:** Blockstream Satellite is receive-only. How do we handle the uplink problem for bidirectional communication? Tor bridges? SMS gateway? Mesh relay?
7. **Legal jurisdiction:** BrickOS is a German company (Sovereign Brick). How do regulatory requirements (MiCA, GDPR) interact with pseudonymous NOSTR identity? What disclosures are required?
8. **Onboarding UX:** How does a complete newcomer go from "install app" to "sovereign identity" without a 30-minute tutorial? Progressive disclosure? Guided setup wizard?
9. **Key recovery:** If a user loses their nsec AND their Grab Bag, is there any recovery path? Social recovery via trusted contacts (Shamir's Secret Sharing)?
10. **Scaling gossip:** NOSTR relay costs grow with usage. Who pays for relay infrastructure? Cashu micropayments per event? Subscription model? Community-funded?

---

## 13. Related Design Documents

- [002-nostr-bitchat-integration.md](002-nostr-bitchat-integration.md) -- NIP mapping, crate architecture, BitChat protocol bridge
- [003-sovereign-identity-roadmap.md](003-sovereign-identity-roadmap.md) -- Unified auth, NOSTR login, trust tiers, IdentityProvider trait
- [004-cashu-tollgate-zapstore.md](004-cashu-tollgate-zapstore.md) -- Cashu mint design, TollGate architecture, Zapstore relay

---

## Appendix A: NIP Reference

Key NOSTR Improvement Proposals used across the stack:

| NIP | Name | Used By |
|-----|------|---------|
| NIP-01 | Basic protocol (events, signatures, relays) | All apps |
| NIP-05 | DNS-based verification | Identity (Verified tier) |
| NIP-07 | Browser extension signing (window.nostr) | Identity (desktop login) |
| NIP-11 | Relay information document | Infrastructure (relay discovery) |
| NIP-15 | Marketplace listings | Exchange |
| NIP-17 | Encrypted direct messages (gift-wrapped) | Signal |
| NIP-28 | Public channels | Signal |
| NIP-29 | Relay-based groups | Signal |
| NIP-46 | Remote signing (Nostr Connect) | Identity (mobile login) |
| NIP-47 | Wallet Connect (NWC) | Exchange (Lightning payments) |
| NIP-54 | Wiki articles (Djot markup) | Almanac |
| NIP-59 | Gift wrapping (metadata protection) | Signal (sender/receiver unlinkable) |
| NIP-60 | Cashu wallet state on relays | Finance (wallet backup) |
| NIP-61 | Nutzaps (ecash zaps) | All payments across stack |
| NIP-82 | App releases | Zapstore |
| NIP-99 | Classifieds | Exchange |

## Appendix B: NUT Reference

Key Cashu protocol specifications:

| NUT | Name | Used By |
|-----|------|---------|
| NUT-00 | Notation, terminology | All Cashu components |
| NUT-03 | Swap tokens | Mint, wallet |
| NUT-04 | Mint tokens (Lightning deposit) | Mint |
| NUT-05 | Melt tokens (Lightning withdrawal) | Mint |
| NUT-07 | Token state check | Wallet |
| NUT-10 | Spending conditions | Escrow |
| NUT-11 | Pay-to-Public-Key (P2PK) | Escrow (locked tokens) |
| NUT-14 | Hashed Timelock Contracts (HTLC) | Escrow (timelocks) |

## Appendix C: Glossary

| Term | Definition |
|------|-----------|
| **BrickOS** | The sovereign daily-life platform. Named for "brick by brick" self-reliance. |
| **Cashu** | Chaumian ecash protocol on Bitcoin/Lightning. Private bearer tokens. |
| **CDK** | Cashu Development Kit. Rust library for building Cashu mints and wallets. |
| **CRDT** | Conflict-free Replicated Data Type. Enables local-first sync without conflicts. |
| **Djot** | Lightweight markup language (successor to CommonMark). Used by NIP-54. |
| **Grab Bag** | Encrypted portable identity backup (USB/Coldcard). |
| **Nutzap** | NIP-61. Cashu ecash sent as a NOSTR event (zap with privacy). |
| **NOSTR** | Notes and Other Stuff Transmitted by Relays. Decentralized social protocol. |
| **npub/nsec** | NOSTR public/secret key. The user's sovereign identity. |
| **NUT** | Notation, Usage & Terminology. Cashu protocol specification documents. |
| **P2PK** | Pay-to-Public-Key. Cashu token locking mechanism (NUT-11). |
| **Pillar** | One of the 7 domains of sovereign life in BrickOS. |
| **SHI** | Statutory Health Insurance (German: gesetzliche Krankenversicherung). |
| **Sneakernet** | Data transfer by physically carrying storage media. |
| **SPP** | Sovereign Proposal Platform. NOSTR-native governance. |
| **Start9** | Self-hosted server OS. BrickOS's recommended home node. |
| **TollGate** | Permissionless WiFi-for-sats. Routers as paid access points. |
| **Zapstore** | NOSTR-based app store. Censorship-resistant software distribution. |

---

*This document is a living artifact. Update as brainstorming continues and decisions are made. Last updated: 2026-04-05.*
