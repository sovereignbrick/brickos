# Design: Sovereign Proposal Platform (SPP)

**Status:** Draft
**Date:** 2026-03-24
**Pillar:** BrickOS Infrastructure

## Problem

Every major open protocol -- Bitcoin (BIPs), Ethereum (EIPs), Nostr (NIPs), Lightning (BOLTs) -- governs itself through improvement proposals. Every single one of these processes depends on GitHub, a centralized platform owned by Microsoft.

This creates three systemic failures:

### 1. Single Point of Censorship

GitHub has demonstrated willingness to remove repositories (youtube-dl 2020, Tornado Cash 2022). Bitcoin Core tracks this as an open risk (GitHub Issue #20227). The entire historical record of Bitcoin's design decisions lives on a platform that could restrict access unilaterally.

### 2. Editorial Gatekeeping

The BIP process nearly collapsed in 2023-2024. Luke Dashjr, as the sole active BIP editor, refused to assign numbers to OP_CAT and Ordinals-related proposals he philosophically opposed. Under BIP-2, editors evaluated "technical soundness," giving cover to block proposals indefinitely. PRs sat unreviewed for months. BIP-3 (activated January 2026) narrowed editor power to formatting review only and expanded to six editors -- but the structural dependency on GitHub and human gatekeepers remains.

### 3. The Irony of Decentralized Protocols on Centralized Infrastructure

Nostr's own documentation acknowledges this: "at any point the central index can be challenged if it is failing to fulfill the needs of the protocol." Yet the NIP process still lives on GitHub, where repository owner fiatjaf could theoretically revoke membership and rewrite history. A protocol built for censorship resistance governs itself through a platform with no censorship resistance.

### Why Now

- BIP-3 reform proves the community recognizes governance as broken
- Nostr protocol maturity now provides all the primitives needed (NIP-23, NIP-72, NIP-57, NIP-03)
- OpenTimestamps provides Bitcoin-anchored immutability
- BrickOS Infrastructure pillar needs its first product
- BTC Prague 2026 speaking slot provides a launch platform

## Approach

Build a sovereign proposal governance platform on Nostr, anchored to Bitcoin via OpenTimestamps. No GitHub dependency. No central editors. Cryptographic identity instead of accounts. Economic signaling instead of permission-gated merges.

### Core Principles

1. **Proposals are Nostr events** -- signed by the author's keypair, published to relays, addressable by stable coordinates
2. **Discussion is threaded comments** -- not GitHub PR reviews, not mailing lists, but cryptographically signed Nostr threads
3. **Consensus is argument-first, economically anchored** -- structured deliberation surfaces the best arguments; zaps signal conviction on arguments, not just positions
4. **History is Bitcoin-anchored** -- every proposal version timestamped via OpenTimestamps, immutable and independently verifiable
5. **Infrastructure is self-hostable** -- custom relay + web UI, both deployable via Docker

### Architecture Overview

```
+------------------+     +------------------+     +------------------+
|   Web UI (PWA)   |     |  Any Nostr Client|     |   CLI Tool       |
|  Next.js 16      |     |  (Amethyst, etc) |     |  (Rust)          |
+--------+---------+     +--------+---------+     +--------+---------+
         |                         |                        |
         +------------+------------+------------------------+
                      |
              WebSocket (NIP-01)
                      |
         +------------+------------+
         |                         |
+--------+---------+     +---------+--------+
| SPP Relay        |     | Public Relays    |
| (Khatru/custom)  |     | (backup/mirror)  |
| - Kind filtering |     |                  |
| - Format valid.  |     |                  |
| - OTS anchoring  |     |                  |
+--------+---------+     +---------+--------+
         |                         |
         +------------+------------+
                      |
              Negentropy Sync (strfry)
                      |
         +------------+------------+
         |                         |
+--------+---------+     +---------+--------+
| OpenTimestamps   |     | Bitcoin          |
| Calendar Servers |     | Timechain        |
+------------------+     +------------------+
```

## Data Model

No traditional database. All data lives as Nostr events on relays. The relay IS the database.

### Event Kinds Used

| Function | NIP | Kind | Replaceability |
|----------|-----|------|----------------|
| Proposal document | NIP-23 | 30023 | Addressable (pubkey + d-tag) |
| Proposal draft | NIP-23 | 30024 | Addressable |
| Community definition | NIP-72 | 34550 | Addressable |
| Editorial approval | NIP-72 | 4550 | Regular |
| Threaded discussion | NIP-22 | 1111 | Regular |
| Reactions (sentiment) | NIP-25 | 7 | Regular |
| Structured polls | NIP-88 | 1068 | Regular |
| Poll responses | NIP-88 | 1018 | Regular (latest per pubkey wins) |
| Zap requests | NIP-57 | 9734 | Not published |
| Zap receipts | NIP-57 | 9735 | Regular |
| OTS attestations | NIP-03 | 1040 | Regular |
| Deletion requests | NIP-09 | 5 | Regular |
| Code patches | NIP-34 | 1617 | Regular |

### Proposal Event Structure (Kind 30023)

```json
{
  "kind": 30023,
  "pubkey": "<author-secp256k1-pubkey>",
  "created_at": 1711276800,
  "tags": [
    ["d", "spp-001-sovereign-voting"],
    ["title", "SPP-001: Sovereign Voting via Lightning Zaps"],
    ["summary", "A mechanism for economically-weighted consensus signaling on proposals"],
    ["published_at", "1711276800"],
    ["t", "governance"],
    ["t", "voting"],
    ["t", "lightning"],
    ["L", "spp.type"],
    ["l", "standards-track", "spp.type"],
    ["L", "spp.status"],
    ["l", "draft", "spp.status"],
    ["a", "34550:<community-pubkey>:<community-d-tag>", "<relay>"]
  ],
  "content": "## Abstract\n\nThis proposal defines...\n\n## Motivation\n\n...\n\n## Specification\n\n...",
  "sig": "<schnorr-signature>"
}
```

### Proposal Addressing

Each proposal is uniquely addressed by: `30023:<author-pubkey>:<d-tag>`

Example: `30023:79dff8f82963424e0bb02708a22e44b4980893e3a4be0fa3cb60a43b946764e3:spp-001-sovereign-voting`

Human-shareable via NIP-19 `naddr` bech32 encoding. This address is stable across edits -- publishing a new event with the same coordinate replaces the previous version while the address remains the same.

### Proposal Types (via NIP-32 Labels)

Using the `L` and `l` tags for structured labeling:

| Type | Label Value | Description |
|------|-------------|-------------|
| Standards Track | `standards-track` | Changes to protocol, interoperability |
| Informational | `informational` | Design issues, guidelines (non-binding) |
| Process | `process` | Meta-governance, procedures |

### Proposal Statuses (via NIP-32 Labels)

| Status | Label Value | Transition |
|--------|-------------|------------|
| Draft | `draft` | Initial state, author publishes |
| Review | `review` | Author marks ready for community deliberation |
| Consensus | `consensus` | Rough consensus detected (>85% unique zappers aligned, objections addressed) |
| Contested | `contested` | Genuine disagreement (multiple positions each hold >30% support) |
| Stalled | `stalled` | No activity in 30 days |
| Deployed | `deployed` | Implemented in production (ratified outside SPP) |
| Withdrawn | `withdrawn` | Author withdraws |

Note: There is no "accepted" or "rejected" status. SPP surfaces consensus state -- it does not make decisions. Ratification happens when implementers act on the signal.

Status transitions are new versions of the same addressable event with updated `l` tag. Each transition is OTS-timestamped to Bitcoin.

### Community Definition (Kind 34550)

```json
{
  "kind": 34550,
  "tags": [
    ["d", "sovereign-proposals"],
    ["name", "Sovereign Proposal Platform"],
    ["description", "Censorship-resistant governance for open protocols"],
    ["p", "<editor1-pubkey>", "<relay>", "moderator"],
    ["p", "<editor2-pubkey>", "<relay>", "moderator"],
    ["relay", "wss://proposals.brickos.io", "author"],
    ["relay", "wss://proposals.brickos.io", "requests"],
    ["relay", "wss://proposals.brickos.io", "approvals"]
  ]
}
```

## Consensus Mechanism: Deliberative Consensus

### The Problem with Vote-Based Governance

Simple voting -- whether one-person-one-vote or one-sat-one-vote -- reduces governance to a counting exercise. Both are broken:

- **Reactions (NIP-25)** are trivially Sybil-attackable. Anyone generates unlimited keypairs.
- **Zap-weighted voting** is plutocracy. The block size wars would have been decided by whoever had more money, regardless of argument quality. A billionaire could override thousands of developers with a single zap. This is not sovereignty -- it's auction governance.

Real governance is about **surfacing the best arguments**, not counting the most sats.

### Three-Layer Consensus Model

SPP separates governance into three distinct layers:

```
Layer 3: RATIFICATION    -- Who runs the code? (outside SPP)
Layer 2: CONVICTION      -- Which arguments are compelling? (zaps on arguments)
Layer 1: DELIBERATION    -- What are the arguments? (structured positions)
```

#### Layer 1: Structured Deliberation

Proposals don't get a simple "support/oppose" binary. Instead, the community produces **formal positions** -- structured arguments that engage with the proposal's substance.

**Position Event (Kind 30023 with position label):**

```json
{
  "kind": 30023,
  "tags": [
    ["d", "spp-001-position-scalability-concern"],
    ["title", "Position: SPP-001 creates relay scalability issues at >10k proposals"],
    ["a", "30023:<proposal-author>:spp-001-sovereign-voting", "<relay>"],
    ["L", "spp.position"],
    ["l", "against", "spp.position"],
    ["L", "spp.position.category"],
    ["l", "technical-feasibility", "spp.position.category"]
  ],
  "content": "## Argument\n\n...\n\n## Evidence\n\n...\n\n## Proposed Amendment\n\n..."
}
```

Positions are **first-class events** -- full Markdown documents with their own discussion threads, not throwaway comments. They reference the proposal via `a` tag and declare their stance (`for`, `against`, `amendment`) and category:

| Category | Description |
|----------|-------------|
| `technical-feasibility` | Can this actually be built? Does it work at scale? |
| `security` | Does this introduce vulnerabilities or attack vectors? |
| `backwards-compatibility` | Does this break existing implementations? |
| `philosophical` | Does this align with the protocol's values/mission? |
| `economic` | What are the incentive effects? Who benefits, who loses? |
| `implementation` | Is the proposed approach the right one? Are there better alternatives? |

This forces structured thinking. You can't just say "I oppose this" -- you must say **why**, in which dimension, with evidence.

#### Layer 2: Conviction Signaling (Zaps on Arguments)

Zaps flow to **arguments, not proposals**. This is the critical difference.

When you zap a position, you're saying: "This argument is compelling. I'm putting economic weight behind this reasoning." You're not buying a vote -- you're amplifying an argument.

```
Proposal: SPP-001 Sovereign Voting

  Position FOR: "Zap voting solves Sybil attacks"
    Author: npub1abc...
    Conviction: 340,000 sats from 89 unique zappers
    Discussion: 23 comments

  Position AGAINST: "Zap voting creates plutocracy"
    Author: npub1def...
    Conviction: 520,000 sats from 142 unique zappers
    Discussion: 47 comments

  Position AMENDMENT: "Use logarithmic weighting instead"
    Author: npub1ghi...
    Conviction: 890,000 sats from 203 unique zappers
    Discussion: 31 comments
```

**What the UI shows:**

The proposal page displays a **deliberation map** -- all positions organized by category and stance, ranked by a composite score:

```
Composite Score = (unique_zappers * 0.6) + (log2(total_sats + 1) * 0.2) + (discussion_depth * 0.2)
```

Where:
- **unique_zappers** (60% weight) -- how many distinct people found this argument compelling. This is the primary signal. One whale zapping 10M sats counts the same as one person zapping 100 sats for this component.
- **log2(total_sats)** (20% weight) -- economic conviction, logarithmically dampened. 1M sats scores only 2x more than 1,000 sats (log2(1M) = 20, log2(1K) = 10). This prevents plutocracy while still valuing skin-in-the-game.
- **discussion_depth** (20% weight) -- how much substantive engagement the argument generated. Measured by unique commenters, not comment count (prevents self-replies inflating scores).

**Why this works for the block size wars:**

Instead of "big blockers outspend small blockers," the platform surfaces:

1. "Here are the 12 strongest arguments for larger blocks, ranked by how many people found them compelling"
2. "Here are the 9 strongest arguments against, ranked the same way"
3. "Here are 4 proposed amendments/compromises, ranked the same way"

The community can see **which arguments carry weight** across the broadest base of support, not which side has deeper pockets.

#### Layer 3: Ratification (Outside SPP)

**SPP does not approve proposals. SPP surfaces consensus. Ratification happens outside the platform.**

This is a critical design decision. For different communities, ratification means different things:

| Community | Ratification Mechanism |
|-----------|----------------------|
| Bitcoin | Miners signal, node operators upgrade, users choose which chain to follow |
| Nostr | Client developers implement, relay operators adopt, users choose clients |
| Open-source project | Maintainers merge, users choose which fork to run |
| DAO | On-chain vote executes (if applicable) |
| Standards body | Committee publishes final standard |

SPP provides the **deliberation and consensus-surfacing layer** -- it shows the community where agreement and disagreement exist, which arguments carried weight, and whether rough consensus emerged. The actual decision is made by the people who run the code.

This mirrors how Bitcoin actually works: no governance platform can force a soft fork. Miners signal, nodes enforce, users choose. SPP makes the deliberation transparent and Bitcoin-anchored, but the ratification remains sovereign.

### Consensus State Detection

Instead of binary "accepted/rejected," SPP detects and displays the **state of consensus**:

| State | Definition | Visual |
|-------|------------|--------|
| **Emerging** | Positions still being published, no clear direction | Yellow -- active deliberation |
| **Converging** | >70% of conviction (by unique zappers) aligns with one direction | Blue -- consensus forming |
| **Rough Consensus** | >85% of unique zappers support the dominant position cluster AND at least 3 position categories addressed | Green -- rough consensus reached |
| **Contested** | Two or more position clusters each hold >30% conviction | Red -- genuine disagreement |
| **Stalled** | No new positions or zaps in 30 days | Grey -- needs attention |

**Rough Consensus** is not a vote count. It is detected when:
1. The dominant direction has broad support (>85% unique zappers, not sats)
2. The key objections have been addressed (positions in at least 3 categories)
3. No unaddressed "against" position holds >15% of unique zappers
4. The proposal author has published responses to the top 3 opposing arguments

This maps to the IETF's definition of rough consensus: "the dominant view has been heard, the objections have been considered, and the working group believes the proposal has addressed the substantive issues."

### Deliberation Timeline

```
1. PROPOSAL PUBLISHED
   -> Author publishes kind 30023 proposal
   -> Status: Draft
   -> OTS-timestamped

2. DELIBERATION OPENS (author sets status to "review")
   -> Community publishes formal positions (for/against/amendment)
   -> Each position is a kind 30023 event linking to the proposal
   -> Threaded discussion on each position (kind 1111)
   -> Zaps flow to positions, not to the proposal itself
   -> OTS timestamps on each position

3. AUTHOR RESPONDS
   -> Author publishes response positions addressing top objections
   -> May publish amended proposal version (same d-tag, new content)
   -> Each amendment is OTS-timestamped

4. CONSENSUS DETECTION (continuous, automated)
   -> Platform computes consensus state from position/zap data
   -> Displays deliberation map with current state
   -> No human authority declares "consensus reached"

5. ROUGH CONSENSUS REACHED (or not)
   -> If Rough Consensus: proposal status -> "consensus"
   -> If Contested: proposal remains in deliberation, author can amend or withdraw
   -> If Stalled: community notified, proposal can be revived

6. RATIFICATION (outside SPP)
   -> Community acts on the consensus signal
   -> Implementers build, operators deploy, users adopt
   -> Proposal status updated to "deployed" when live in production

7. FULL HISTORY Bitcoin-anchored via OTS
   -> Every proposal version, position, response, and status change
   -> Independently verifiable audit trail
```

### Comparison to Existing Governance

| System | Identity | Decision Method | Argument Quality | Sybil Resistance | Censorship Resistance |
|--------|----------|----------------|------------------|-------------------|----------------------|
| GitHub (BIP/EIP) | Email account | Editor approval + comments | Low (unstructured comments) | Low (free accounts) | None (Microsoft) |
| DAO (on-chain) | Wallet address | Token-weighted vote | None (binary vote) | Medium (buy tokens) | High (on-chain) |
| IETF | Membership | Rough consensus (human chairs) | High (structured process) | High (identity-based) | Low (centralized org) |
| SPP (this) | Nostr keypair | Deliberative consensus | High (structured positions) | High (economic signaling) | High (Nostr + Bitcoin) |

## Relay Architecture

### Custom SPP Relay (built on Khatru)

Khatru (Go) provides a framework for custom relays with arbitrary accept/reject functions. The SPP relay enforces:

**Accepted event kinds:**

```go
relay.AcceptEvent = func(ctx context.Context, event *nostr.Event) bool {
    allowedKinds := map[int]bool{
        30023: true,  // Proposals
        30024: true,  // Drafts
        34550: true,  // Community definition
        4550:  true,  // Approvals
        1111:  true,  // Comments
        7:     true,  // Reactions
        1068:  true,  // Polls
        1018:  true,  // Poll responses
        9735:  true,  // Zap receipts
        1040:  true,  // OTS attestations
        5:     true,  // Deletions
    }
    return allowedKinds[event.Kind]
}
```

**Proposal format validation:**

- Kind 30023 events MUST have `d`, `title`, `summary` tags
- MUST have `L`/`l` tags for type and status
- MUST have community `a` tag
- Content MUST be valid Markdown
- Content MUST follow proposal template (Abstract, Motivation, Specification sections)

**Automatic OTS timestamping:**

- On accepting a kind 30023 event, the relay automatically submits the event `id` to OpenTimestamps calendar servers
- When the OTS proof is upgraded (Bitcoin confirmation), the relay publishes a kind 1040 attestation event referencing the proposal
- This happens transparently -- authors don't need to manage timestamping

### Relay Redundancy via Negentropy Sync

Strfry supports the negentropy protocol for efficient relay-to-relay synchronization. The SPP relay mirrors its events to multiple backup relays:

```
Primary: wss://proposals.brickos.io (Khatru, custom logic)
Mirror 1: wss://proposals-backup1.brickos.io (strfry, sync only)
Mirror 2: Community-run relay (anyone can sync)
```

If the primary relay goes down or is censored, mirrors contain the full event history. Any Nostr client can read from any mirror.

### Relay as API

The Khatru framework allows mixing WebSocket handlers with HTTP handlers. The SPP relay also serves:

- `GET /proposals` -- list all proposals with current status and vote tallies
- `GET /proposals/<d-tag>` -- single proposal with full metadata
- `GET /proposals/<d-tag>/votes` -- zap receipts and reaction tallies
- `GET /proposals/<d-tag>/timeline` -- OTS-anchored version history
- NIP-11 relay information document at root

These HTTP endpoints power the Web UI but are optional -- the raw Nostr protocol is sufficient.

## UI Changes

### Web UI (Next.js 16 PWA)

**Proposal List View:**
- Filterable by type (Standards/Informational/Process) and status (Draft/Review/Consensus/Contested/Stalled/Deployed)
- Sort by: newest, highest conviction, most discussed, ready for implementation (consensus but no implementers)
- Each card shows: title, author npub, status badge, consensus state indicator, position count (for/against/amendment), unique participants, time since last activity

**Proposal Detail View:**
- Full Markdown rendering of proposal content
- Version history timeline with OTS Bitcoin block anchors
- **Deliberation Map** -- positions organized by category (technical, security, economic, philosophical, implementation) and stance (for/against/amendment), ranked by composite score
- Each position expandable with its own discussion thread and conviction stats
- Consensus state indicator with explanation of current state
- **Implementations panel** -- teams that claimed implementation, their status and links
- Zap button on each position (not the proposal itself)
- Comment threads on positions (kind 1111)

**Submit Proposal View:**
- Markdown editor with live preview
- Template auto-populated (Abstract, Motivation, Specification, Backwards Compatibility, Reference Implementation)
- Type selector (Standards/Informational/Process)
- Nostr login via NIP-07 browser extension (nos2x, Alby) or nsec input

**Submit Position View:**
- Linked from proposal detail page
- Stance selector: For / Against / Amendment
- Category selector: Technical / Security / Economic / Philosophical / Implementation
- Markdown editor with position template (Argument, Evidence, Proposed Amendment if applicable)

**Profile View:**
- Author's proposals, positions, comments
- Contribution stats: proposals authored, positions published, proposals reaching consensus
- Conviction received: total zaps on positions, unique zappers
- Participation breadth: how many deliberations engaged in

### Mobile Support

PWA installable on mobile. Core flows (read proposals, comment, zap-vote) work on mobile browsers. Proposal submission primarily desktop (Markdown editing).

### Nostr Client Compatibility

Since all data is standard Nostr events, proposals are readable in ANY Nostr client:
- **Amethyst** (Android) -- long-form content rendering, zaps, reactions
- **Damus** (iOS) -- same
- **Primal** (web/mobile) -- same
- **Habla.news** -- specialized for kind 30023 long-form content

The SPP Web UI is the premium experience; Nostr clients are the fallback. No vendor lock-in.

## Proposal Lifecycle

See "Deliberation Timeline" in the Consensus Mechanism section above. The lifecycle follows:

```
Draft -> Review (deliberation opens) -> Consensus / Contested / Stalled -> Deployed
```

Key difference from traditional governance: there is no "accepted" status decided by an authority. The platform detects and surfaces consensus state. Ratification happens outside SPP when implementers act on the consensus signal.

## User Journeys

### Journey 1: Community Member Proposes a Protocol Change

**Persona:** Satoshi Jr. -- independent Bitcoin developer, not affiliated with any Core team. Has an idea for a new opcode but no way to get a BIP number assigned without going through the GitHub gatekeeping process.

```
Day 1: Satoshi Jr. opens SPP in his browser
  -> Logs in with his Nostr key (NIP-07 browser extension)
  -> Clicks "New Proposal"
  -> Selects type: Standards Track
  -> The editor loads a template: Abstract, Motivation, Specification,
     Backwards Compatibility, Reference Implementation
  -> He writes his proposal in Markdown, fills every section
  -> Clicks "Publish as Draft"
  -> His proposal is live immediately as SPP-047
  -> No editor reviewed it. No gatekeeper approved it. His keypair signed it,
     the relay accepted it, OpenTimestamps anchored it to Bitcoin.

Day 2-5: Early feedback
  -> Three developers comment on his proposal (kind 1111 threads)
  -> One spots a vulnerability in the specification
  -> Satoshi Jr. updates his proposal (same d-tag, new content)
  -> The version history shows v1 and v2, both OTS-timestamped
  -> He does NOT set status to "review" yet -- still iterating

Day 6: He sets status to "Review" -- deliberation officially opens
  -> The proposal appears in the "Under Review" section of the homepage
  -> Anyone can now publish formal positions

Day 7-20: Deliberation
  -> A Core developer publishes a position FOR (technical-feasibility):
     "This opcode is implementable with minimal consensus risk. Here's
     a prototype branch."
     Conviction: 45,000 sats from 67 unique zappers

  -> A security researcher publishes a position AGAINST (security):
     "This opcode creates a new DoS vector under high mempool pressure.
     Here's the attack scenario."
     Conviction: 38,000 sats from 52 unique zappers

  -> Satoshi Jr. publishes a response position addressing the DoS concern:
     "Amended specification with rate limiting per block. Here's the
     updated formal spec and why the attack vector no longer applies."
     Conviction: 72,000 sats from 134 unique zappers

  -> The security researcher acknowledges the fix in a comment:
     "The amendment addresses my concern. Withdrawing objection."

Day 25: Consensus state shifts to "Converging"
  -> 78% of unique zappers align with the "for" direction
  -> The top objection has been publicly addressed and withdrawn
  -> Platform displays: "Converging -- consensus forming"

Day 35: Rough Consensus detected
  -> >85% unique zappers support the dominant direction
  -> All 3 major objections have published responses
  -> No unaddressed "against" position holds >15% support
  -> Status auto-updates to "consensus"
  -> The entire deliberation history is Bitcoin-anchored

Day 35+: Ratification (outside SPP)
  -> Satoshi Jr.'s proposal now has a clear, publicly visible,
     Bitcoin-timestamped record of community consensus
  -> A Core developer opens a PR on Bitcoin Core referencing SPP-047
  -> Miners begin signaling
  -> SPP status updated to "deployed" when the soft fork activates
```

**What's different from today:** Satoshi Jr. never needed permission from a BIP editor. He never waited months for a PR review on GitHub. His proposal was live the moment he signed it. The community deliberated in the open, with structured arguments -- not GitHub comment threads. The consensus is verifiable and Bitcoin-anchored. No one person could block it.

---

### Journey 2: Bitcoin Core Team Proposes an Enhancement

**Persona:** Core Dev Team -- five Bitcoin Core contributors who want to propose a change to the P2P protocol. They are NOT outsiders -- they are the implementation team.

```
Day 1: Lead developer publishes proposal SPP-052 on SPP
  -> Type: Standards Track
  -> Category: Network protocol
  -> The proposal includes a reference implementation link (GitHub branch
     or NIP-34 Nostr git patch)
  -> Status: Draft

  Why use SPP instead of just merging directly?
  -> Legitimacy. A change merged without community deliberation can be
     reverted or forked away. SPP provides visible proof that the community
     was consulted and the arguments were heard.
  -> Transparency. The Core team's reasoning is published as formal positions,
     not buried in GitHub PR descriptions that only 50 people read.
  -> Accountability. Every position and response is signed and timestamped.
     "The community was consulted" is no longer a claim -- it's a
     verifiable fact.

Day 2: The team publishes supporting positions
  -> Position FOR (technical-feasibility): "We've tested this on testnet
     for 3 months. Here are the benchmarks." (authored by a different
     team member than the proposal author)
  -> Position FOR (security): "Formal security analysis by [researcher].
     No new attack vectors identified."

Day 3-15: Community deliberation
  -> A mining pool operator publishes position AGAINST (economic):
     "This change increases bandwidth requirements by 15%. Small miners
     can't afford this. Here are the numbers."
     Conviction: 89,000 sats from 178 unique zappers

  -> An independent node operator publishes position AMENDMENT:
     "Compromise: make the bandwidth increase opt-in with a feature flag
     for the first 6 months."
     Conviction: 120,000 sats from 245 unique zappers

  -> The Core team responds: "The amendment is reasonable. Updated spec
     to include the feature flag."
  -> They publish an amended proposal version incorporating the feedback

Day 20: Rough Consensus on the amended version
  -> The amendment position has the highest composite score
  -> The original objection is addressed
  -> Core team proceeds with implementation, citing the SPP deliberation record

Day 60: Deployed
  -> Feature merged into Bitcoin Core with the opt-in flag
  -> SPP status: "deployed"
  -> The deliberation record serves as permanent documentation of WHY
     this decision was made, not just WHAT was changed
```

**What's different from today:** The Core team used SPP not because they had to, but because it gives them legitimacy. "We consulted the community" is now a verifiable, Bitcoin-timestamped claim, not a vague gesture at GitHub comments. The mining pool's concern was heard, the compromise was visible, and the final decision has a clear paper trail. This protects the Core team from accusations of making unilateral decisions.

---

### Journey 3: Contested Proposal -- No Consensus

**Persona:** The Bitcoin community during a contentious change (analogous to the block size wars).

```
Day 1: Developer A publishes SPP-060: "Increase block size to 8MB"
  -> Type: Standards Track
  -> Status: Review (goes straight to deliberation)

Day 2-30: Deep division emerges
  -> 8 positions FOR published across categories:
     - Technical: "8MB is within current hardware capacity" (156 zappers)
     - Economic: "Lower fees expand user base" (234 zappers)
     - Philosophical: "Bitcoin should be usable as cash" (189 zappers)

  -> 7 positions AGAINST published:
     - Technical: "8MB blocks increase orphan rate" (201 zappers)
     - Security: "Larger blocks centralize mining" (267 zappers)
     - Philosophical: "Store of value requires small blocks" (312 zappers)

  -> 3 AMENDMENT positions:
     - "Segwit as a compromise" (345 zappers)
     - "Gradual increase: 2MB then reassess" (178 zappers)
     - "Layer 2 solutions instead" (289 zappers)

Day 30: Consensus state: CONTESTED
  -> No single direction holds >70% of unique zappers
  -> The "for" cluster holds 42%, "against" holds 38%, "amendment" holds 20%
  -> Platform displays: "Contested -- genuine disagreement"
  -> The deliberation map clearly shows WHERE the disagreement lies:
     agreement on the problem (fees too high), disagreement on the solution

Day 30+: What happens next
  -> The proposal does NOT get "rejected" -- SPP doesn't reject.
  -> The deliberation record is permanent and Bitcoin-timestamped.
  -> Anyone can see exactly which arguments carried weight and where
     the community divides.
  -> Implementers decide: fork, compromise, or wait.
  -> If someone publishes a new proposal addressing the contested points,
     it links back to SPP-060 and its deliberation record, building on
     the structured arguments rather than starting from scratch.

What SPP provides that GitHub didn't during the actual block size wars:
  -> Structured arguments, not Twitter flame wars
  -> Visible consensus state, not "whoever shouts loudest"
  -> Bitcoin-timestamped positions that can't be revised or denied later
  -> A clear map of WHERE agreement exists (the problem) vs WHERE it
     doesn't (the solution) -- enabling targeted compromise proposals
  -> No moderator deleting comments, no editor blocking proposals
```

---

### Journey 4: Implementation Team Picks Up a Community Proposal

**Persona:** A Nostr client development team looking for their next feature. They browse SPP to find proposals with strong community consensus that haven't been implemented yet.

```
Day 1: Team lead opens SPP, filters by:
  -> Status: "consensus"
  -> Type: Standards Track
  -> Sort by: composite conviction score (highest first)
  -> Category filter: any

  The list shows 12 proposals with rough consensus, ranked:
  1. SPP-034: "Relay-to-relay encrypted DMs" -- 890 unique zappers
  2. SPP-041: "Offline-first event sync" -- 723 unique zappers
  3. SPP-029: "Zap splits for collaborative content" -- 651 unique zappers
  ...

Day 1: Team selects SPP-041 to implement
  -> They read the full proposal, all positions, the deliberation history
  -> The top "amendment" position suggests an alternative sync protocol
     that scored higher than the original approach
  -> The team decides to implement the amended version (the community
     already validated this approach)

Day 2: Team publishes an "implementation claim" event
  -> A kind 30023 position with label "implementation":
     "We (Amethyst team) are implementing SPP-041 with the amended
     sync protocol. Target release: v3.2. Branch: [link]"
  -> This is visible on the proposal page under "Implementations"
  -> Other teams can see who's building what -- prevents duplicate work

Day 30: Implementation shipped
  -> Amethyst v3.2 includes the feature
  -> Team updates their implementation position: "Deployed in v3.2.
     Here's the release notes."
  -> Once a second client implements it (per NIP merge criteria),
     the proposal can also become a formal NIP

Day 30+: The proposal's SPP page now shows:
  -> Full deliberation history (Bitcoin-timestamped)
  -> Two independent implementations
  -> Deployed status
  -> A permanent record of community-driven development:
     idea -> deliberation -> consensus -> implementation -> deployment
```

**What this enables:** Implementation teams don't need to guess what the community wants. They browse proposals ranked by genuine, Sybil-resistant community conviction. They can see which approaches the community validated through deliberation. They pick up work that already has buy-in, reducing the risk of building something nobody uses. The "pull" model -- implementers pull from community consensus -- replaces the "push" model where a few maintainers decide what gets built.

---

### Journey 5: Non-Technical Community Member

**Persona:** Maria -- a Bitcoin node operator and small business owner. Not a developer, but runs a full node and accepts Bitcoin payments. She has opinions about protocol changes that affect her.

```
Day 1: Maria hears about SPP-060 (block size increase) on a podcast
  -> Opens SPP on her phone (PWA)
  -> Reads the proposal -- it's structured Markdown, not a GitHub diff
  -> Scrolls to the Deliberation Map
  -> She can see all positions organized by category:
     Technical | Security | Economic | Philosophical
  -> Each position has a conviction score and discussion thread

Day 1: She reads the positions
  -> She doesn't understand the orphan rate argument (technical)
  -> She DOES understand the "centralize mining" argument (security)
  -> She finds the "layer 2 instead" amendment compelling

Day 1: She engages
  -> She zaps the "layer 2 instead" position: 5,000 sats
  -> She's not buying a vote. She's saying: "This argument resonates
     with me as a node operator."
  -> She comments on the position: "As someone running a node on a
     Raspberry Pi, I can't handle 8MB blocks. Layer 2 works for my
     customers already."
  -> Her comment adds a real-world perspective that developers
     might not have considered

Day 5: Her comment gets traction
  -> 12 other node operators reply with similar experiences
  -> A developer publishes a new position citing Maria's thread:
     "Position AGAINST (implementation): Real-world node operators
     report hardware constraints. Here are 15 testimonials from
     the SPP-060 deliberation."
  -> This position gets high conviction from node operators

What this means:
  -> Maria participated in protocol governance without writing code
  -> Her perspective as a node operator influenced the deliberation
  -> Her contribution is signed, timestamped, and permanent
  -> She didn't need a GitHub account, a mailing list subscription,
     or permission from anyone
  -> The developer who cited her thread gave her argument formal
     weight in the deliberation -- her voice was amplified through
     the system, not despite it
```

---

### Journey 6: Auditor / Historian

**Persona:** A researcher studying how a past protocol decision was made, two years after the fact.

```
Day 1: Researcher opens SPP-060 (block size proposal from 2 years ago)
  -> Every event is still on the relay (and mirrored to backups)
  -> Every version of the proposal is OTS-timestamped
  -> She can see:

  Timeline:
  ├─ 2026-06-15 Block 892,401: Proposal v1 published
  ├─ 2026-06-17 Block 892,583: First "against" position published
  ├─ 2026-06-20 Block 893,012: Amendment proposed
  ├─ 2026-06-28 Block 894,130: Proposal v2 (amended) published
  ├─ 2026-07-10 Block 895,847: Consensus state: Contested
  └─ 2026-07-15 Block 896,413: Author withdraws, cites deliberation record

  -> She can verify ANY of these timestamps independently:
     Download the .ots proof, run it against any Bitcoin full node
  -> No one can claim "this position was published before that one"
     or "this argument was edited after the fact"
  -> She can reconstruct the entire deliberation: who said what, when,
     which arguments carried weight, where the community agreed and
     disagreed

  -> Her research paper cites SPP-060 with Bitcoin block numbers
     as immutable references -- not GitHub URLs that could be edited
     or deleted

What this means:
  -> Protocol governance decisions have an audit trail as permanent
     as Bitcoin's blockchain itself
  -> "Who decided this and why?" is always answerable
  -> Historical revisionism is cryptographically impossible
```

## Technical Due Diligence

### What Works Today (Production-Ready)

| Component | Status | Evidence |
|-----------|--------|----------|
| NIP-23 long-form content | Mature | Used by Habla.news, Yakihonne, all major clients |
| NIP-25 reactions | Mature | Universal across clients |
| NIP-57 zaps | Mature | Billions of sats transacted across Nostr |
| NIP-72 communities | Moderate | Supported by some clients (Satellite, Coracle) |
| NIP-22 comments | Moderate | Newer NIP, growing client support |
| NIP-03 OpenTimestamps | Mature | Protocol defined, calendar servers operational |
| NIP-88 polls | Early | Limited client support |
| Khatru relay framework | Mature | Production-ready, well-documented |
| Strfry negentropy sync | Mature | Used by large relays |
| OpenTimestamps | Mature | Operating since 2016, Bitcoin-anchored |

### What Needs Building

| Component | Effort | Complexity |
|-----------|--------|------------|
| Custom Khatru relay with format validation + auto-OTS | Medium | Go, Khatru framework handles boilerplate |
| Web UI (proposal list, detail, submit, vote) | Medium | Next.js 16, standard frontend |
| Zap-weighted voting aggregation logic | Low | Query kind 9735 events, sum amounts |
| OTS auto-timestamping on relay | Low | OpenTimestamps client library exists |
| Proposal template enforcement | Low | Tag validation in relay accept function |
| Negentropy sync configuration | Low | Strfry config, operational |

### Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Low NIP-72 client support | Medium | SPP Web UI is primary interface; Nostr clients are bonus |
| Zap vote manipulation by whales | Medium | Logarithmic weighting option; display both sat-weight and unique-voter count |
| Relay downtime | Low | Negentropy sync to multiple mirrors; any Nostr client can read from mirrors |
| Lightning wallet adoption barrier | Medium | Allow NWC (Nostr Wallet Connect) for seamless in-app zapping |
| Proposal spam | Low | Relay accept function can require minimum proof-of-work (NIP-13) or community membership |
| Key management for non-technical users | Medium | NIP-07 browser extensions abstract key management; future: NIP-46 remote signing |

### What This Does NOT Replace

- **Code review** -- SPP handles proposals and consensus, not pull requests. Code review can use NIP-34 (git on Nostr) or remain on GitHub/Radicle
- **Mailing list discussion** -- threaded Nostr comments replace this
- **CI/CD** -- out of scope; implementations are tested independently

## Comparison to Existing Solutions

| | GitHub (BIP/NIP) | Radicle | Gitopia | SPP (this) |
|---|---|---|---|---|
| **Hosting** | Microsoft-owned | P2P (Git DAG) | Cosmos blockchain | Nostr relays |
| **Identity** | Email account | Device keys | Cosmos wallet | Nostr keypair (secp256k1) |
| **Censorship resistance** | None | High | High | High |
| **Voting** | PR comments | RAD token governance | LORE token governance | Lightning zaps (sats) |
| **Sybil resistance** | Low | Medium (token-gated) | Medium (token-gated) | High (economic cost) |
| **Bitcoin alignment** | None | None | None | Native (OTS + Lightning) |
| **Self-hostable** | No | Partial | No (requires Cosmos) | Yes (Docker) |
| **Existing community** | Large | Small | Small | Bitcoin + Nostr overlap |
| **Token required** | No | RAD | LORE | No (uses Bitcoin) |
| **Mobile access** | GitHub app | Limited | Limited | PWA + any Nostr client |

## Scope and Phasing

### Phase 1: MVP (BTC Prague demo)

- Custom Khatru relay with kind filtering and format validation
- Web UI: proposal list, detail view, Markdown rendering, Nostr login
- NIP-23 proposal publishing with template
- NIP-22 threaded discussion
- NIP-25 reaction-based sentiment (no zap voting yet)
- Docker deployment

### Phase 2: Deliberative Consensus

- Formal position events (for/against/amendment) as kind 30023 with position labels
- Position categories (technical, security, philosophical, economic, etc.)
- NIP-57 zap conviction on arguments (not proposals)
- Deliberation map UI: positions organized by category, ranked by composite score
- Consensus state detection (emerging/converging/rough consensus/contested/stalled)
- NWC (Nostr Wallet Connect) integration for in-app zapping

### Phase 3: Bitcoin Anchoring

- NIP-03 auto-timestamping on relay
- Version history timeline with OTS proofs
- Verification UI: click any version to verify against Bitcoin block header

### Phase 4: Federation

- Negentropy sync to mirror relays
- Community-run relay documentation
- Multi-community support (one relay, multiple proposal communities)
- NIP-34 git integration for code patches

## Open Questions

- [ ] Should proposal numbering be sequential (like BIPs) or content-addressed (like the d-tag)?
- [ ] Should editor approval (NIP-72 kind 4550) be required, or should all proposals be visible immediately with community filtering?
- [ ] Logarithmic vs linear zap weighting -- which should be the default?
- [ ] Should the relay require NIP-42 authentication for writes, or accept from any pubkey?
- [ ] How to handle proposal forks (two competing proposals on the same topic)?
- [ ] Should there be a minimum zap amount to prevent dust voting?
- [ ] Multi-language proposal support -- separate events per language or i18n within one event?
- [ ] What is the relationship between SPP and the existing BrickOS platform crates? Shared auth? Separate deployment?

## References

### Protocol Specifications
- [NIP-01: Basic Protocol](https://nips.nostr.com/1) -- Event structure, relay communication
- [NIP-03: OpenTimestamps Attestations](https://nips.nostr.com/3) -- Bitcoin-anchored timestamps
- [NIP-22: Comment](https://nips.nostr.com/22) -- Universal threaded comments (kind 1111)
- [NIP-23: Long-form Content](https://nips.nostr.com/23) -- Proposals as kind 30023
- [NIP-25: Reactions](https://nips.nostr.com/25) -- Sentiment signaling (kind 7)
- [NIP-32: Labeling](https://nips.nostr.com/32) -- Structured metadata (type, status)
- [NIP-33: Parameterized Replaceable Events](https://github.com/nostr-protocol/nips/blob/master/33.md) -- Addressable events
- [NIP-34: Git Stuff](https://nips.nostr.com/34) -- Code collaboration on Nostr
- [NIP-42: Authentication](https://nips.nostr.com/42) -- Relay auth
- [NIP-57: Lightning Zaps](https://nips.nostr.com/57) -- Economic voting (kind 9734/9735)
- [NIP-72: Moderated Communities](https://nips.nostr.com/72) -- Proposal communities (kind 34550/4550)
- [NIP-88: Polls](https://github.com/nostr-protocol/nips/blob/master/88.md) -- Structured voting

### Bitcoin Governance
- [BIP-2: BIP Process](https://bips.dev/2/) -- Original process (replaced)
- [BIP-3: Updated BIP Process](https://bips.dev/3/) -- Current process (January 2026)
- [GitHub Issue #20227: Dependency on GitHub](https://github.com/bitcoin/bitcoin/issues/20227)
- [GitHub Alternatives for Bitcoin Core](https://github.com/bitcoin-core/bitcoin-devwiki/wiki/GitHub-alternatives-for-Bitcoin-Core)
- [BIP Editor Crisis Coverage](https://blockspace.media/insight/bitcoins-bip-process-gets-first-overhaul-in-9-years/)

### Infrastructure
- [OpenTimestamps](https://opentimestamps.org/) -- Bitcoin timestamping
- [Khatru Relay Framework](https://khatru.nostr.technology/) -- Custom relay in Go
- [Strfry](https://github.com/hoytech/strfry) -- High-performance relay with negentropy sync
- [TrueVote](https://truevote.org/) -- Existing Nostr + Bitcoin + OTS voting platform

### Existing Decentralized Governance
- [Radicle](https://radicle.xyz/) -- P2P code collaboration (RAD token)
- [Gitopia](https://gitopia.com/) -- Cosmos-based code hosting (LORE token)
- [ngit-cli](https://codeberg.org/DanConwayDev/ngit-cli) -- Git on Nostr CLI

### Bitcoin Data Anchoring
- [OP_RETURN: Bitcoin Core v30](https://yellow.com/research/bitcoin-core-v30-release-guide-opreturn-changes-wallet-updates-and-network-impact) -- 100KB limit, multiple outputs
- [OpenTimestamps & Knots/OCEAN](https://petertodd.org/2025/opentimestamps-and-knots-ocean) -- Compatibility analysis
