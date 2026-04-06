# 004 -- Cashu, TollGate & Zapstore: Completing the Sovereign Stack

**Status:** Draft
**Date:** 2026-04-05
**Authors:** twentyone.life, Claude (research)
**Parent:** [001-sovereign-stack-vision.md](001-sovereign-stack-vision.md), [002-nostr-bitchat-integration.md](002-nostr-bitchat-integration.md)

---

## 1. Overview

Three technologies complete the BrickOS sovereign stack by solving the remaining centralization dependencies:

| Dependency | Centralized solution | Sovereign replacement |
|---|---|---|
| Payments | Banks, PayPal, Stripe | **Cashu** -- private ecash mints on Lightning |
| Internet access | ISPs (Telekom, Comcast, ...) | **TollGate** -- permissionless WiFi via ecash micropayments |
| App distribution | Google Play, Apple App Store | **Zapstore** -- NOSTR-based censorship-resistant app store |

All three are **NOSTR-native** and use the same identity (npub), the same payment rail (Cashu/NIP-61), and the same relay infrastructure. They integrate naturally with BrickOS's existing NOSTR stack.

---

## 2. Cashu -- Private Instant Payments

### 2.1 What Is Cashu?

Cashu is a **Chaumian ecash** system built on Bitcoin/Lightning. It uses blind signatures (David Chaum, 1982) to create bearer tokens that are:

- **Private:** The mint cannot link who minted tokens to who spent them
- **Instant:** No on-chain confirmation, no Lightning routing
- **Offline-capable:** Tokens are bearer instruments, transferable without network
- **Micropayment-friendly:** No routing fees for intra-mint transfers

### 2.2 How Blind Signatures Work

This is the core cryptographic trick that makes Cashu private:

```
1. Alice wants 100 sats as ecash tokens
2. Alice pays a Lightning invoice to the mint (100 sats)
3. Alice generates a SECRET (random number x)
4. Alice computes Y = hash_to_curve(x)                    -- her "message"
5. Alice picks a random BLINDING FACTOR r
6. Alice computes B_ = Y + r*G                            -- "blinded message"
7. Alice sends B_ to the mint (mint sees B_, NOT Y or x)
8. Mint signs: C_ = k * B_                                -- "blinded signature"
9. Alice UNBLINDS: C = C_ - r*K                           -- removes blinding factor
10. Alice now has token (x, C) -- a valid 100-sat proof

When Alice spends:
11. Alice gives (x, C) to Bob (or to the mint to redeem)
12. Mint verifies: C == k * hash_to_curve(x)              -- valid signature
13. Mint marks x as SPENT (prevents double-spend)

KEY INSIGHT: The mint signed B_ (blinded), but verifies against x (unblinded).
The mint CANNOT connect step 8 (signing) to step 12 (verification).
It literally does not know that the token it's redeeming is the one it signed for Alice.
```

**In plain language:** Alice shows the mint a sealed envelope with carbon paper inside. The mint stamps the envelope (blind signature). Alice opens the envelope and has a stamped document. When she presents the stamp to the mint later, the mint can verify it's genuine but has no idea which envelope it was stamped on.

### 2.3 Who Holds the Money? Trust Model

```
                  Bitcoin Blockchain (L1)
                         |
                  Lightning Network (L2)
                         |
                    ┌────┴────┐
                    │  MINT   │  <-- Holds the sats backing all ecash tokens
                    │         │      (custodial -- this is the trust assumption)
                    │ BrickOS │
                    │  Mint   │
                    └────┬────┘
                         |
              ┌──────────┼──────────┐
              |          |          |
         ┌────┴───┐ ┌───┴────┐ ┌───┴────┐
         │ Alice  │ │  Bob   │ │ Carol  │
         │ 100sat │ │ 50sat  │ │ 200sat │  <-- Hold ecash tokens (bearer)
         └────────┘ └────────┘ └────────┘
```

**The mint is a trusted custodian.** It holds the Lightning/Bitcoin that backs the ecash tokens. This is the key trade-off vs. Lightning:

| | Lightning (NIP-57 zaps) | Cashu (NIP-61 nutzaps) |
|---|---|---|
| Custody | Non-custodial (your node) | Custodial (mint holds sats) |
| Privacy | Low (routing nodes see amounts, LNURL provider sees social graph) | High (mint cannot link sender to spender) |
| Speed | Seconds (routing) | Instant (token handoff) |
| Offline | No (requires routing path) | Yes (bearer tokens work offline) |
| Micropayments | Expensive (routing fees > value for tiny amounts) | Free (intra-mint transfers cost nothing) |

**Mitigation of custodial risk:**
- Keep small balances (use Cashu for micropayments, Lightning/on-chain for larger amounts)
- Users can redeem tokens to Lightning at any time (`melt` operation)
- DLEQ proofs (NUT-12) let users verify tokens offline without trusting the mint
- BrickOS is already a trusted platform -- the mint is operated by the same entity users trust with their health data
- Multiple mints can coexist -- users diversify

### 2.4 Cashu Protocol Specifications (NUTs)

NUTs (Notation, Usage, and Terminology) are the Cashu protocol specs:

| NUT | Title | BrickOS relevance |
|-----|-------|-------------------|
| NUT-00 | Base definitions | Token format, proof structure, `cashuA`/`cashuB` encoding |
| NUT-01 | Mint public keys | Keyset discovery (`GET /v1/keys`) |
| NUT-02 | Keysets & IDs | Key rotation, versioning |
| NUT-03 | Swap (split) | Token splitting/combining for change |
| NUT-04 | Mint tokens | Lightning -> ecash (fund wallet) |
| NUT-05 | Melt tokens | Ecash -> Lightning (drain wallet) |
| NUT-06 | Mint info | `GET /v1/info` -- name, supported NUTs |
| NUT-07 | Token state check | Check if proofs are spent/unspent/pending |
| NUT-08 | Fee return | Overpaid Lightning fees returned as change |
| NUT-09 | Restore | Wallet backup/restore from seed |
| NUT-10 | P2PK | Pay-to-Public-Key: lock tokens to a specific npub |
| NUT-11 | P2PK extended | Refund keys, timelocks, multisig (n-of-m) |
| NUT-12 | DLEQ proofs | Offline token verification |
| NUT-13 | Deterministic secrets | BIP-32 derived secrets for backup |
| NUT-14 | HTLCs | Hash-timelock contracts for atomic swaps |
| NUT-17 | WebSocket subs | Real-time quote status updates |
| NUT-18 | Payment requests | Structured payment request format |

### 2.5 NOSTR Integration -- NIP-60 and NIP-61

#### NIP-60: Cashu Wallet on NOSTR

Your Cashu wallet state lives on NOSTR relays, encrypted with your nsec:

```
Kind 17375 -- Wallet metadata (mint URLs, unit, name)
Kind 7375  -- Unspent proofs (your token balance, NIP-44 encrypted)
Kind 7376  -- Transaction history (mint/melt/swap records)
```

**What this means for BrickOS:** The user's ecash wallet roams with their NOSTR identity. Same wallet on desktop, mobile, Start9 node. Encrypted -- relays see nothing. Recoverable from Grab Bag (nsec decrypts everything).

#### NIP-61: Nutzaps -- NOSTR-Native Payments

Nutzaps replace Lightning zaps with Cashu tokens for privacy:

```
SENDING A NUTZAP:

1. Bob publishes kind:10019 "I accept nutzaps"
   Tags: mint URLs I trust, my P2PK pubkey for receiving

2. Alice has Cashu tokens on one of Bob's trusted mints

3. Alice creates proofs LOCKED TO BOB'S P2PK KEY (NUT-10/NUT-11)
   Only Bob's private key can unlock these tokens

4. Alice publishes kind:9321 "nutzap" event
   Contains: locked proofs, mint URL, tagged to Bob + the event being zapped

5. Bob's client sees the nutzap
   Bob redeems P2PK-locked proofs at the mint (only he can)
   Bob swaps for fresh proofs (privacy refresh)

RESULT: Alice paid Bob. The mint saw:
  - Step 2: Someone minted tokens (doesn't know it was Alice)
  - Step 5: Someone redeemed tokens (doesn't know it connects to step 2)
  The mint CANNOT build a social graph of who pays whom.
```

### 2.6 BrickOS Cashu Mint Architecture

```
┌─────────────────────────────────────────────┐
│              BrickOS Platform                │
│                                             │
│  ┌──────────────────┐  ┌────────────────┐  │
│  │ sovereign-mint   │  │ Existing apps  │  │
│  │ (new service)    │  │ Health, Link.. │  │
│  │                  │  │                │  │
│  │ cdk-mint ────────┤  │                │  │
│  │ cdk-axum ────────┤  │                │  │
│  │ cdk-sqlite ──────┤  │                │  │
│  │ cdk-signatory ───┤  │                │  │
│  │ cdk-phoenixd ────┼──┼──> Phoenixd    │  │
│  │                  │  │    Lightning   │  │
│  │ HTTP API:        │  │    Node        │  │
│  │  /v1/keys        │  │                │  │
│  │  /v1/mint/*      │  │                │  │
│  │  /v1/melt/*      │  │                │  │
│  │  /v1/swap        │  │                │  │
│  │  /v1/checkstate  │  │                │  │
│  └──────────────────┘  └────────────────┘  │
│                                             │
│  Frontend: @cashu/cashu-ts (browser wallet) │
└─────────────────────────────────────────────┘
```

**Rust dependencies:**

```toml
# crates/brickos-mint/Cargo.toml
[dependencies]
cdk = "0.x"              # Core types, BDHKE crypto
cdk-mint = "0.x"         # Mint logic
cdk-axum = "0.x"         # HTTP server (same framework as BrickOS)
cdk-sqlite = "0.x"       # Proof storage
cdk-signatory = "0.x"    # Key management
cdk-phoenixd = "0.x"     # Lightning backend (simplest)
# OR cdk-cln / cdk-lnd for advanced setups
```

**Frontend:**

```json
{ "@cashu/cashu-ts": "^2.x" }
```

### 2.7 Where Cashu Is Used Across BrickOS Pillars

| Pillar | Use case | How Cashu helps |
|---|---|---|
| **Finance** | Exchange trade fees | Private fee payment -- mint can't link buyer to seller |
| **Finance** | Escrow | P2PK locked tokens (NUT-11) + timelocks instead of Lightning hold invoices |
| **Finance** | Subscription payments | Monthly nutzap to BrickOS (auto-renew from NIP-60 wallet) |
| **Data** | SPP conviction voting | Nutzap on positions -- anonymous conviction signaling |
| **Energy** | Almanac tips | Tip authors with offline-capable tokens |
| **Attention** | Paid relay access | Pay-per-event on BrickOS relay |
| **Technology** | TollGate WiFi payment | Same wallet pays for internet access |
| **Community** | Mutual aid micro-donations | Private, instant, no minimum amount |

### 2.8 Offline Payments (Degradation Levels 3-4)

Cashu tokens are bearer instruments -- they work without network once minted:

```
Level 0-1: Mint tokens via Lightning, spend anywhere via nutzaps
Level 2:   Pre-mint tokens before connectivity degrades, spend over satellite
Level 3:   Exchange pre-minted tokens over mesh/BitChat (token = data blob)
Level 4:   Exchange tokens via USB/NFC/QR code (sneakernet)
```

At Level 3-4, there's no mint available to verify/redeem tokens in real-time. But tokens are still transferable as bearer instruments. When connectivity returns, the recipient redeems them.

**Double-spend risk at Level 3-4:** Without mint verification, the same token could be given to two people. Mitigations:
- Trust scores (Tier 2+ users are less likely to double-spend)
- Escrow vault slashing for proven double-spenders
- Small amounts only for offline transfers
- When connectivity returns, first-to-redeem wins

---

## 3. TollGate -- Permissionless Internet Access

### 3.1 What Is TollGate?

TollGate turns a WiFi router into a **paid internet access point** -- anyone with a router and upstream internet sells access for Bitcoin micropayments. No ISP contract, no identity, no subscription.

**The key innovation:** Mesh networks never scaled because operators had no economic incentive to share bandwidth. TollGate adds micropayments at every hop -- creating a free market for internet access.

### 3.2 How the Money Flows -- Who Gets Paid?

```
THE TOLLGATE PAYMENT MODEL:

┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐
│  Alice   │───>│  Router A    │───>│  Router B    │───>│ Internet │
│  (user)  │WiFi│  (operator)  │WiFi│  (operator)  │    │ Gateway  │
│          │    │              │    │              │    │          │
│ Pays:    │    │ Receives:    │    │ Receives:    │    │          │
│ 3 sat/min│    │ 1 sat/min    │    │ 2 sat/min    │    │          │
└──────────┘    └──────────────┘    └──────────────┘    └──────────┘

WHO IS THE OPERATOR?
  - Anyone. Your neighbor, a cafe, a stranger, a company, you.
  - They plug in a TollGate router ($30-50 hardware)
  - They connect it to their existing internet (home broadband, office WiFi, mobile hotspot)
  - The router broadcasts an open WiFi network
  - Users connect and pay ecash per minute
  - The operator collects sats -- automatically, 24/7

NO CONTRACT. NO IDENTITY. NO MIDDLEMAN.
  - Operator doesn't know who Alice is (Cashu is blind)
  - Alice doesn't need to know who operates the router
  - Payment is per-minute -- disconnect anytime
  - Each router sets its own price (free market)
```

### 3.3 Multi-Hop Economics (How Mesh Gets Incentivized)

```
SCENARIO: Router A has internet, Router B doesn't.
Router B BUYS access from Router A, then RESELLS to users.

Internet ─── Router A (operator: cafe owner) ─── Router B (operator: neighbor) ─── Users
              price: 2 sat/min                     price: 3 sat/min
              gets: 2 sat/min from Router B         gets: 3 sat/min from users
                                                    pays: 2 sat/min to Router A
                                                    profit: 1 sat/min

RESULT:
  - Cafe owner earns sats from their existing internet connection
  - Neighbor extends coverage and earns a markup
  - Users get internet where there was none before
  - Each hop adds cost but also adds coverage
  - Free market: if Router B charges too much, users connect to Router A directly

THIS IS WHY MESH NETWORKS NEVER SCALED BEFORE:
  - Old mesh: "please share your bandwidth for free" -> nobody does
  - TollGate mesh: "sell your bandwidth for sats" -> economic incentive at every hop
```

### 3.4 The Payment Flow in Detail

```
STEP BY STEP: Alice connects to a TollGate WiFi

1. DISCOVERY
   Alice's device scans for WiFi networks
   Sees "TollGate_cafe" (open network, no password)
   Connects automatically

2. CAPTIVE PORTAL (or background Crows Nest client)
   Router serves a captive portal page: "Pay 1 sat/min for internet"
   OR: Alice's Crows Nest app auto-handles payment in background

3. PAYMENT (NIP-61 nutzap)
   Router has published kind:10019 on NOSTR:
   {
     "kind": 10019,
     "tags": [
       ["mint", "https://mint.brickos.io", "sat"],     // I accept this mint
       ["pubkey", "02abc..."]                           // lock tokens to this key
     ]
   }

   Alice's wallet creates Cashu proofs locked to the router's P2PK key
   Alice publishes kind:9321 nutzap:
   {
     "kind": 9321,
     "tags": [
       ["proof", "{\"amount\":1,\"secret\":\"...\",\"C\":\"...\"}"],
       ["u", "https://mint.brickos.io"],                // mint URL
       ["p", "<router-npub>"],                          // pay to router
       ["d", "AA:BB:CC:DD:EE:FF"]                       // Alice's MAC address
     ]
   }

4. VERIFICATION
   Router's merchant service (tollgate-merchant-rs) sees the nutzap
   Redeems P2PK-locked proofs at the mint
   If valid: opens firewall for Alice's MAC address

5. SESSION
   Alice has internet access
   Payment renews automatically (wallet sends nutzap every minute)
   If payment stops: firewall closes, Alice disconnects

6. PAYOUT
   Router operator's wallet accumulates ecash tokens
   Periodically sweeps to Lightning address (automatic)
   OR: keeps as ecash for spending elsewhere

PRIVACY:
  - The mint sees: "someone minted 100 sats" and later "someone redeemed 1 sat"
  - The mint does NOT know these are the same person
  - The router knows: "MAC address AA:BB:CC paid" but not Alice's identity
  - Alice knows: "I paid 1 sat to this router" but not who operates it
```

### 3.5 Hardware and Software

| Component | What | Details |
|---|---|---|
| Router | GL.iNet MT-3000 | ~$30-50, dual-band WiFi 6, OpenWRT compatible |
| OS | TollGateOS | Custom OpenWRT image with all modules pre-installed |
| Installer | tollgate-installer | Desktop app to flash the router (TypeScript) |
| Merchant | tollgate-merchant-rs | Rust service that handles payments (NIP-61) |
| Firewall | Valve module | Opens/closes internet per client MAC address |
| Discovery | Crows Nest | Client that auto-discovers and pays TollGate APs |
| Relay | Local NOSTR relay | Runs on the router for offline-resilient communication |

### 3.6 BrickOS Integration

**A Start9 node + TollGate router = fully sovereign internet access point:**

```
┌────────────────────────────────────────────────┐
│              YOUR HOME / LOCATION               │
│                                                │
│  ┌──────────────┐     ┌──────────────────────┐ │
│  │ Start9 Node  │     │ TollGate Router      │ │
│  │              │     │ (GL.iNet MT-3000)     │ │
│  │ BrickOS apps │     │                      │ │
│  │ NOSTR relay  │◄───►│ Merchant (Rust)       │ │
│  │ Cashu mint   │     │ Local NOSTR relay     │ │
│  │ Health data  │     │ Valve (firewall)      │ │
│  │              │     │                      │ │
│  └──────┬───────┘     └──────────┬───────────┘ │
│         │                        │              │
│         │         ┌──────────────┘              │
│         │         │                             │
│  ┌──────┴─────────┴──┐                         │
│  │  Your Internet     │                         │
│  │  (ISP / Satellite  │                         │
│  │   / another        │                         │
│  │   TollGate hop)    │                         │
│  └────────────────────┘                         │
│                                                │
│  RESULT:                                       │
│  - You sell internet for sats (passive income) │
│  - Your BrickOS mint handles the ecash         │
│  - Same NOSTR identity for everything          │
│  - In emergency: your router becomes           │
│    a local mesh node for neighbors             │
└────────────────────────────────────────────────┘
```

---

## 4. Zapstore -- Censorship-Resistant App Distribution

### 4.1 What Is Zapstore?

A NOSTR-based app store where:
- Anyone can publish apps (signed with their NOSTR npub)
- No review process, no gatekeeper
- Apps are verified via cryptographic signatures (not corporate approval)
- Users discover apps through their NOSTR social graph (web of trust)

### 4.2 NOSTR Event Kinds (Proposed NIP-82)

```
Kind 32267 -- Software Application (addressable)
  d-tag: reverse-domain identifier (e.g., "io.brickos.health")
  Tags: name, summary, icon, images, url, repository, license
  Content: full Markdown description

Kind 30063 -- Software Release (addressable)
  d-tag: "<app-id>@<version>" (e.g., "io.brickos.health@0.31.0")
  Tags: version, channel (main/beta), pointers to asset events
  Content: release notes

Kind 3063 -- Software Asset (regular event)
  Tags: app-id, MIME type, SHA-256 hash, download URL, size, platform
  Platform identifiers: android-arm64-v8a, linux-x86_64, linux-aarch64, etc.
  MIME types: APK, Flatpak, AppImage, Docker/OCI, WASM, PWA bundles
```

### 4.3 Trust and Code Signing

Four-layer trust hierarchy:

```
Layer 1: EXPLICIT ALLOW LIST
  Zapstore team and early developers
  Highest trust, manually curated

Layer 2: REPOSITORY VERIFICATION
  Developer commits zapstore.yaml to their source repo
  Contains their NOSTR pubkey
  Relay verifies: "this GitHub/GitLab repo voches for this npub"

Layer 3: VERTEX REPUTATION
  DVM (Data Vending Machine) evaluates social graph standing
  PageRank, follower count, activity metrics
  Fallback when repo verification not available

Layer 4: REJECTION
  Unknown pubkeys with no reputation are blocked
```

**APK certificate linking (NIP-C1):**
```
Developer's APK signing key ──cryptographic proof──> NOSTR npub
At install: verify SHA-256 hash + APK cert + NOSTR signature
Result: you know exactly WHO published this binary
```

### 4.4 BrickOS Distribution via Zapstore

| BrickOS App | Format | Platform | Zapstore distribution |
|---|---|---|---|
| Sovereign Health | Flatpak | Linux desktop | `application/vnd.flatpak` |
| Sovereign Health | APK | Android | `application/vnd.android.package-archive` |
| Sovereign Health | PWA | Web | `application/webbundle` |
| Sovereign Health | Docker | Self-hosted | `application/vnd.oci.image.manifest.v1+json` |
| Start9 packages | s9pk | Start9 | Custom MIME type |

**Publishing workflow:**

```bash
# Install zsp CLI
zapstore-cli install zsp

# Configure (one-time)
# zapstore.yaml in repo root:
identifier: io.brickos.health
nostr_pubkey: <brickos-release-npub>
platforms:
  - android
  - linux-x86_64
  - linux-aarch64

# Publish a release
zsp publish \
  --version 0.31.0 \
  --apk ./build/sovereign-health.apk \
  --flatpak ./build/io.brickos.health.flatpak \
  --notes "Sprint 018: security + search"
```

**BrickOS-operated Zapstore relay:**

```
wss://apps.brickos.io     -- Zapstore relay (Go) + Blossom blob storage
                           -- Curates BrickOS ecosystem apps
                           -- Own trust policy (allow BrickOS team + verified devs)
                           -- CDN-backed binary storage
```

### 4.5 Why Not Just GitHub Releases?

| | GitHub Releases | Zapstore |
|---|---|---|
| Censorship | Microsoft can remove repos | NOSTR events on multiple relays |
| Identity | GitHub account (email-based) | NOSTR npub (self-sovereign) |
| Discovery | Requires URL/link | Social graph, search, app stacks |
| Auto-update | Manual or custom | Built into Zapstore client |
| Trust | "I trust GitHub" | "I trust this npub's signature" |
| Offline | Requires github.com | Cached locally, relay-synced |

---

## 5. Unified Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER DEVICES                                 │
│                                                                     │
│  Phone/Laptop ──> TollGate WiFi ──> Internet                       │
│       │              (pays 1 sat/min via NIP-61 nutzap)             │
│       │                                                             │
│  ┌────┴───────────────────────────────────────────────────────────┐ │
│  │  Cashu Wallet (NIP-60, stored on NOSTR relays, encrypted)     │ │
│  │  Balance: 5,000 sats across 2 mints                           │ │
│  │                                                                │ │
│  │  Used for: TollGate WiFi | Exchange fees | SPP voting |       │ │
│  │            Almanac tips | Signal paid relay | Subscriptions    │ │
│  └────┬───────────────────────────────────────────────────────────┘ │
│       │                                                             │
│  ┌────┴───────────────────────────────────────────────────────────┐ │
│  │  BrickOS Apps (installed via Zapstore, auto-updated)           │ │
│  │  Sovereign Health | Exchange | Signal | Almanac | Vote         │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              │
                    NOSTR Identity (npub)
                    Same key for everything
                              │
┌─────────────────────────────┼─────────────────────────────────────┐
│                    BrickOS INFRASTRUCTURE                          │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ BrickOS      │  │ BrickOS      │  │ Zapstore Relay           │ │
│  │ Cashu Mint   │  │ NOSTR Relays │  │ (wss://apps.brickos.io)  │ │
│  │              │  │              │  │                          │ │
│  │ Backed by    │  │ relay.       │  │ App catalog +            │ │
│  │ Lightning    │  │ dm.          │  │ Blossom blob storage     │ │
│  │ (Phoenixd)   │  │ proposals.   │  │ Binary hosting + CDN     │ │
│  │              │  │ almanac.     │  │                          │ │
│  │ NUT-00..18   │  │              │  │ NIP-82 events            │ │
│  │ NIP-60/61    │  │              │  │ NIP-C1 cert linking      │ │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Start9 Node (user-operated)                                  │  │
│  │  - Personal NOSTR relay                                      │  │
│  │  - Personal Cashu mint (optional)                            │  │
│  │  - TollGate merchant (if running a router)                   │  │
│  │  - All BrickOS apps self-hosted                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

---

## 6. NIP Summary (New NIPs Added by This Doc)

| NIP | Kind(s) | Technology | BrickOS usage |
|-----|---------|-----------|---------------|
| NIP-60 | 17375, 7375, 7376 | Cashu wallet | Wallet state on NOSTR relays |
| NIP-61 | 10019, 9321 | Cashu nutzaps | All payments (fees, tips, WiFi, voting) |
| NIP-82 | 32267, 30063, 3063 | Zapstore | App distribution events |
| NIP-C1 | -- | Zapstore | APK cert-to-npub linking |
| Blossom/BUD-01 | -- | Zapstore | Content-addressable binary storage |

These add to the NIPs already documented in [002-nostr-bitchat-integration.md](002-nostr-bitchat-integration.md).

---

## 7. Cashu vs Lightning: When to Use Which

| Scenario | Use Cashu | Use Lightning | Why |
|---|---|---|---|
| Exchange trade fee (0.5%) | X | | Privacy -- mint can't link buyer to seller |
| Large purchase (>100k sats) | | X | Non-custodial for large amounts |
| SPP conviction voting | X | | Anonymous conviction signaling |
| TollGate WiFi | X | | 1 sat/min too small for Lightning routing |
| Subscription payment | | X | Predictable, scheduled, non-custodial |
| Almanac tip to author | X | | Instant, no invoice round-trip |
| Escrow deposit | | X | Non-custodial for significant amounts |
| Offline token exchange | X | | Bearer tokens work without network |
| Cross-platform payment | | X | Between different mints/ecosystems |

**Rule of thumb:** Cashu for privacy + micropayments + offline. Lightning for large amounts + non-custodial + cross-platform.

---

## 8. Rust Crate Additions

### New Crate: `brickos-mint`

```
crates/brickos-mint/
  Cargo.toml
  src/
    lib.rs          # Mint service configuration and startup
    config.rs       # Mint settings (Lightning backend, keysets, fees)
    routes.rs       # Axum routes (or embed CDK's axum routes)
```

**Cargo.toml:**
```toml
[dependencies]
cdk = "0.x"
cdk-mint = "0.x"
cdk-axum = "0.x"
cdk-sqlite = "0.x"
cdk-signatory = "0.x"
cdk-phoenixd = "0.x"
```

### Updated Crate: `brickos-nostr`

Add NIP-60/61 event kinds:

```rust
// New kinds in crates/brickos-nostr/src/kinds.rs
pub const KIND_CASHU_WALLET: u32 = 17375;       // NIP-60 wallet
pub const KIND_CASHU_PROOFS: u32 = 7375;         // NIP-60 unspent proofs
pub const KIND_CASHU_HISTORY: u32 = 7376;        // NIP-60 transaction history
pub const KIND_NUTZAP_INFO: u32 = 10019;         // NIP-61 nutzap receiver info
pub const KIND_NUTZAP: u32 = 9321;               // NIP-61 nutzap payment
pub const KIND_APP_DEFINITION: u32 = 32267;      // NIP-82 software application
pub const KIND_APP_RELEASE: u32 = 30063;         // NIP-82 software release
pub const KIND_APP_ASSET: u32 = 3063;            // NIP-82 software asset
```

### Frontend Addition

```json
{
  "@cashu/cashu-ts": "^2.x"
}
```

---

## 9. Monorepo Structure Update

```
apps/
  finance/
    sovereign-exchange/      # P2P marketplace
    sovereign-mint/          # NEW -- BrickOS Cashu mint service
    btc-tracker/             # Bitcoin portfolio tracking
  distribution/
    zapstore-relay/          # NEW -- BrickOS Zapstore relay + Blossom

crates/
  brickos-mint/              # NEW -- Cashu mint logic (wraps CDK)
  brickos-nostr/             # UPDATED -- NIP-60/61/82 event kinds added
```

---

## 10. Build Order Integration

| Phase | Existing plan | Addition from this doc |
|---|---|---|
| Phase 1 (Foundation) | Sovereign Identity, trust scores | Add NIP-60/61 kinds to `brickos-nostr` |
| Phase 2 (SPP) | Proposal platform | SPP zap-voting could use nutzaps (optional) |
| Phase 3 (Exchange barter) | Listings, barter trades | No change |
| **Phase 4 (Exchange BTC)** | Lightning payments, escrow | **Add Cashu mint. Nutzaps for fees. P2PK escrow.** |
| Phase 5 (Signal) | NOSTR DMs, groups | No change |
| Phase 6 (Almanac) | Knowledge base | Nutzap tips for authors |
| **Phase 7 (Resilience)** | Mesh, grab bag, degradation | **TollGate integration. Zapstore publishing.** |

---

## 11. Open Questions

1. **Mint liability:** What jurisdiction for operating a Cashu mint? Custodial ecash has regulatory implications.
2. **Mint-to-mint swaps:** Should BrickOS mint federate with external Cashu mints? NUT-14 HTLCs enable this.
3. **Phoenixd vs CLN:** Which Lightning backend for the mint? Phoenixd is simpler, CLN is more configurable.
4. **Self-hosted mints:** Should Start9 nodes run personal Cashu mints? CDK supports this.
5. **TollGate hardware:** Should BrickOS sell pre-flashed TollGate routers? Or provide a Start9 package?
6. **Zapstore relay hosting:** Run our own or publish to the default `relay.zapstore.dev`?
7. **NIP-82 maturity:** Still a PR (#1336). Should BrickOS wait for merge or implement against the draft?

---

## 12. References

### Cashu
- [Cashu Protocol (NUTs)](https://github.com/cashubtc/nuts) -- Protocol specifications
- [CDK (Rust)](https://github.com/cashubtc/cdk) -- Cashu Development Kit
- [cashu-ts (TypeScript)](https://github.com/cashubtc/cashu-ts) -- Browser wallet library
- [NIP-60 (Cashu Wallet)](https://github.com/nostr-protocol/nips/blob/master/60.md)
- [NIP-61 (Nutzaps)](https://github.com/nostr-protocol/nips/blob/master/61.md)

### TollGate
- [TollGate Website](https://tollgate.me/)
- [TollGate Documentation](https://opentollgate.github.io/tollgate/)
- [OpenTollGate GitHub](https://github.com/OpenTollGate/)
- [tollgate-merchant-rs (Rust)](https://github.com/OpenTollGate/tollgate-merchant-rs)

### Zapstore
- [Zapstore Website](https://zapstore.dev)
- [Zapstore GitHub](https://github.com/zapstore/zapstore)
- [zsp CLI (publisher)](https://github.com/zapstore/zsp)
- [NIP-82 PR #1336](https://github.com/nostr-protocol/nips/pull/1336)

---

*This document extends [001-sovereign-stack-vision.md](001-sovereign-stack-vision.md) and [002-nostr-bitchat-integration.md](002-nostr-bitchat-integration.md) with three technologies that complete the sovereign stack: private payments (Cashu), permissionless internet (TollGate), and censorship-resistant distribution (Zapstore).*
