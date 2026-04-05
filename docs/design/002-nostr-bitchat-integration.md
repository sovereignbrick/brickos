# BrickOS Protocol Integration -- NOSTR & BitChat Technical Design

**Status:** Draft
**Date:** 2026-04-05
**Authors:** twentyone.life, Claude (research)
**Parent:** [001-sovereign-stack-vision.md](001-sovereign-stack-vision.md)

---

## 1. Purpose

BrickOS currently relies on centralized identity (email/password), centralized
communication (HTTPS-only), and server-side state. This document defines the
technical path to NOSTR-native identity, end-to-end encrypted messaging, offline
mesh networking via BitChat, and a trust-minimized marketplace with escrow.

Goals:
- Replace email/password auth with NOSTR keypair identity across all apps
- Enable peer-to-peer encrypted communication without a central server
- Support offline-first operation with eventual consistency via relay sync
- Integrate with BitChat's BLE mesh for zero-internet scenarios
- Provide escrow and payment primitives for the marketplace

Non-goals:
- Building a general-purpose NOSTR client
- Replacing the existing PostgreSQL backend (it becomes a relay-backed cache)
- Supporting NIP-04 encryption (deprecated, known vulnerabilities)

---

## 2. Protocol Landscape

### 2.1 NOSTR

NOSTR (Notes and Other Stuff Transmitted by Relays) is a decentralized protocol
where clients sign events with Schnorr signatures (secp256k1) and publish them
to relays. Key properties:

- **Identity** is a keypair -- no registration, no email, no phone number
- **Data** is signed JSON events with a `kind` field determining semantics
- **Relays** are dumb storage/forwarding servers -- clients hold all logic
- **Interoperability** comes from shared event kinds defined in NIPs

### 2.2 BitChat

BitChat is a Swift-only Apple application providing BLE mesh networking with
NOSTR-compatible identity. Key properties:

- **Transport:** Bluetooth Low Energy (BLE) mesh, max 7 hops
- **Encryption:** Noise_XX_25519_ChaChaPoly_SHA256 handshake
- **Identity:** secp256k1 keypairs (same as NOSTR)
- **Protocol:** Custom binary protocol with 13-byte header
- **Platform:** Apple-only (Swift), no Android or desktop client
- **Integration path:** Shared NOSTR event kinds, not shared code

### 2.3 Integration Strategy

BrickOS and BitChat share the same identity layer (secp256k1 keypairs) and the
same semantic layer (NOSTR event kinds). Integration happens at the protocol
level, not the implementation level:

```
 BrickOS (Rust/TS)          BitChat (Swift)
 ┌─────────────────┐       ┌─────────────────┐
 │  brickos-nostr   │       │  BitChat.app     │
 │  brickos-identity│       │  BLE mesh        │
 │  brickos-trust   │       │  Noise_XX        │
 └────────┬────────┘       └────────┬────────┘
          │                         │
          │   Shared NOSTR events   │
          │   (kinds 0,1,4,30023...)│
          ▼                         ▼
 ┌──────────────────────────────────────────┐
 │              NOSTR Relays                 │
 │  (BrickOS relays + user relays)           │
 └──────────────────────────────────────────┘
```

---

## 3. App-to-NIP Mapping

### 3.1 Complete NIP Matrix

| NIP | Name | Health | Finance | Link | Platform | Marketplace |
|-----|------|--------|---------|------|----------|-------------|
| 01 | Basic protocol | x | x | x | x | x |
| 02 | Relay list | x | x | x | x | x |
| 04 | Encrypted DM (legacy) | -- | -- | -- | -- | -- |
| 05 | DNS identity | x | x | x | x | x |
| 07 | Browser signer | x | x | x | x | x |
| 09 | Event deletion | x | x | x | x | x |
| 10 | Text notes | -- | -- | x | x | -- |
| 11 | Relay info | -- | -- | -- | x | -- |
| 13 | Proof of work | -- | -- | -- | -- | x |
| 15 | Marketplace (stalls) | -- | -- | -- | -- | x |
| 17 | Private DMs | x | -- | x | -- | x |
| 19 | bech32 entities | x | x | x | x | x |
| 21 | nostr: URIs | x | x | x | x | x |
| 23 | Long-form content | -- | -- | x | x | -- |
| 25 | Reactions | -- | -- | x | x | x |
| 27 | Multicast | -- | -- | x | -- | -- |
| 28 | Public chat | -- | -- | x | -- | -- |
| 32 | Labeling | x | -- | -- | -- | x |
| 38 | User statuses | -- | -- | x | -- | -- |
| 39 | External identities | x | x | x | x | x |
| 42 | Relay auth | x | x | x | x | x |
| 44 | Encryption v2 | x | x | x | x | x |
| 46 | Remote signing | x | x | x | x | x |
| 47 | Wallet Connect | -- | x | -- | -- | x |
| 51 | Lists | x | x | x | x | x |
| 53 | Live activities | -- | -- | x | -- | -- |
| 54 | Wiki | -- | -- | x | x | -- |
| 57 | Zaps | -- | x | x | x | x |
| 58 | Badges | x | -- | x | -- | x |
| 59 | Gift wrap | x | -- | x | -- | x |
| 60 | Cashu wallet | -- | x | -- | -- | x |
| 61 | Nutzaps | -- | x | -- | -- | x |
| 65 | Relay list metadata | x | x | x | x | x |
| 69 | P2P orders | -- | x | -- | -- | x |
| 72 | Moderation | -- | -- | x | x | x |
| 77 | Negentropy sync | x | x | x | x | x |
| 78 | App-specific data | x | x | x | x | x |
| 89 | Recommended relays | -- | -- | -- | x | -- |
| 94 | File metadata | x | -- | x | -- | x |
| 96 | HTTP file storage | x | -- | x | -- | x |
| 98 | HTTP auth | x | x | x | x | x |
| 99 | Classifieds | -- | -- | -- | -- | x |

### 3.2 Sovereign Health

Health data requires the strongest privacy guarantees. All health events are
NIP-44 encrypted and published to the user's private relay only.

| Feature | NIPs | Event Kinds |
|---------|------|-------------|
| User profile | 01, 05 | 0 (metadata) |
| Health records (encrypted) | 44, 78 | 30078 (app data) |
| Lab imports | 44, 78, 94 | 30078, 1063 (file meta) |
| Provider sharing | 17, 59 | 14 (DM), 1059 (gift wrap) |
| Export / backup | 44, 77 | 30078 |
| Badges (milestones) | 58 | 30009 (badge def), 8 (award) |
| Deletion | 09 | 5 (deletion) |

### 3.3 BTC Tracker (Finance)

| Feature | NIPs | Event Kinds |
|---------|------|-------------|
| Portfolio (encrypted) | 44, 78 | 30078 |
| Price alerts | 78 | 30078 |
| Wallet connections | 47 | 23194 (request), 23195 (response) |
| Zap receipts | 57 | 9735 (zap receipt) |
| Cashu wallet state | 60 | 37375 (wallet), 7375 (token), 7376 (history) |
| P2P OTC trades | 69 | 38383 (order) |

### 3.4 Sovereign Link

| Feature | NIPs | Event Kinds |
|---------|------|-------------|
| Profiles | 01, 05 | 0 |
| Text notes | 10 | 1 |
| Long-form posts | 23 | 30023 |
| Wiki pages | 54 | 30818 |
| Direct messages | 17 | 14 |
| Public chat rooms | 28 | 40 (create), 41 (meta), 42 (msg) |
| Live streams | 53 | 30311 (activity), 1311 (chat) |
| Reactions | 25 | 7 |
| User statuses | 38 | 30315 |
| Zaps | 57, 61 | 9735, 9321 (nutzap) |
| File sharing | 94, 96 | 1063, 10096 (server list) |
| Labels / moderation | 32, 72 | 1985 (label), 1984 (report) |
| Relay recommendations | 65 | 10002 (relay list) |

### 3.5 BrickOS Platform / Website

| Feature | NIPs | Event Kinds |
|---------|------|-------------|
| Platform announcements | 01 | 1 |
| Documentation (wiki) | 54 | 30818 |
| Long-form blog | 23 | 30023 |
| Relay info | 11 | -- (HTTP) |
| Relay auth | 42 | 22242 (auth) |
| Recommended relays | 89 | 10002 |
| App-specific config | 78 | 30078 |

### 3.6 Marketplace (Future)

| Feature | NIPs | Event Kinds |
|---------|------|-------------|
| Merchant stalls | 15 | 30017 (stall), 30018 (product) |
| Classified listings | 99 | 30402 |
| P2P order flow | 69 | 38383 |
| Buyer/seller DMs | 17, 59 | 14, 1059 |
| Reviews / ratings | 32 | 1985 |
| Payments (zaps) | 57 | 9735 |
| Escrow (hold invoices) | 47 | 23194, 23195 |
| Escrow (Cashu P2PK) | 60, 61 | 7375 |
| Spam prevention (PoW) | 13 | (any, with nonce) |

---

## 4. Shared Crate Architecture

### 4.1 Dependency Graph

```
                    ┌──────────────────┐
                    │   brickos-nostr   │
                    │  (core protocol)  │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
    ┌─────────▼──────┐ ┌────▼──────┐ ┌────▼──────────┐
    │ brickos-identity│ │brickos-   │ │brickos-       │
    │ (keys, NIP-05)  │ │trust      │ │transport      │
    └─────────┬──────┘ │(WoT, rep) │ │(relay, BLE)   │
              │         └────┬──────┘ └────┬──────────┘
              │              │              │
              │    ┌─────────▼──────┐       │
              │    │ brickos-escrow  │       │
              │    │ (NIP-47, Cashu) │       │
              │    └────────────────┘       │
              │                             │
              └──────────┐    ┌─────────────┘
                         │    │
                    ┌────▼────▼─────┐
                    │ brickos-gossip │
                    │ (sync, offline)│
                    └───────────────┘
```

All six crates depend on `brickos-nostr`. The existing crates (`brickos-auth`,
`brickos-crypto`, `brickos-db`) remain and are consumed alongside the new ones.

### 4.2 brickos-nostr -- Core Protocol

The foundation crate implementing NOSTR event creation, signing, verification,
and relay communication.

```rust
//! brickos-nostr -- Core NOSTR protocol primitives

// -------------------------------------------------------
// Event kind constants -- single source of truth
// -------------------------------------------------------

/// NIP-01: User metadata (kind 0)
pub const KIND_METADATA: u32 = 0;

/// NIP-01: Short text note (kind 1)
pub const KIND_TEXT_NOTE: u32 = 1;

/// NIP-02: Follow list (kind 3)
pub const KIND_CONTACTS: u32 = 3;

/// NIP-09: Event deletion (kind 5)
pub const KIND_DELETION: u32 = 5;

/// NIP-25: Reaction (kind 7)
pub const KIND_REACTION: u32 = 7;

/// NIP-58: Badge award (kind 8)
pub const KIND_BADGE_AWARD: u32 = 8;

/// NIP-17: Private direct message (kind 14)
pub const KIND_PRIVATE_DM: u32 = 14;

/// NIP-28: Public chat channel creation (kind 40)
pub const KIND_CHANNEL_CREATE: u32 = 40;

/// NIP-28: Public chat channel metadata (kind 41)
pub const KIND_CHANNEL_META: u32 = 41;

/// NIP-28: Public chat channel message (kind 42)
pub const KIND_CHANNEL_MSG: u32 = 42;

/// NIP-94: File metadata (kind 1063)
pub const KIND_FILE_META: u32 = 1063;

/// NIP-59: Gift wrap (kind 1059)
pub const KIND_GIFT_WRAP: u32 = 1059;

/// NIP-59: Seal (kind 13)
pub const KIND_SEAL: u32 = 13;

/// NIP-53: Live chat message (kind 1311)
pub const KIND_LIVE_CHAT: u32 = 1311;

/// NIP-32: Labeling (kind 1985)
pub const KIND_LABEL: u32 = 1985;

/// NIP-72: Report (kind 1984)
pub const KIND_REPORT: u32 = 1984;

/// NIP-60: Cashu token event (kind 7375)
pub const KIND_CASHU_TOKEN: u32 = 7375;

/// NIP-60: Cashu history event (kind 7376)
pub const KIND_CASHU_HISTORY: u32 = 7376;

/// NIP-61: Nutzap (kind 9321)
pub const KIND_NUTZAP: u32 = 9321;

/// NIP-57: Zap request (kind 9734)
pub const KIND_ZAP_REQUEST: u32 = 9734;

/// NIP-57: Zap receipt (kind 9735)
pub const KIND_ZAP_RECEIPT: u32 = 9735;

/// NIP-96: HTTP file storage server list (kind 10096)
pub const KIND_FILE_SERVER_LIST: u32 = 10096;

/// NIP-65: Relay list metadata (kind 10002)
pub const KIND_RELAY_LIST: u32 = 10002;

/// NIP-42: Relay authentication (kind 22242)
pub const KIND_RELAY_AUTH: u32 = 22242;

/// NIP-47: Wallet Connect request (kind 23194)
pub const KIND_NWC_REQUEST: u32 = 23194;

/// NIP-47: Wallet Connect response (kind 23195)
pub const KIND_NWC_RESPONSE: u32 = 23195;

/// NIP-58: Badge definition (kind 30009)
pub const KIND_BADGE_DEF: u32 = 30009;

/// NIP-15: Marketplace stall (kind 30017)
pub const KIND_STALL: u32 = 30017;

/// NIP-15: Marketplace product (kind 30018)
pub const KIND_PRODUCT: u32 = 30018;

/// NIP-23: Long-form content (kind 30023)
pub const KIND_LONG_FORM: u32 = 30023;

/// NIP-78: App-specific data (kind 30078)
pub const KIND_APP_DATA: u32 = 30078;

/// NIP-53: Live activity (kind 30311)
pub const KIND_LIVE_ACTIVITY: u32 = 30311;

/// NIP-38: User status (kind 30315)
pub const KIND_USER_STATUS: u32 = 30315;

/// NIP-99: Classified listing (kind 30402)
pub const KIND_CLASSIFIED: u32 = 30402;

/// NIP-54: Wiki page (kind 30818)
pub const KIND_WIKI: u32 = 30818;

/// NIP-60: Cashu wallet (kind 37375)
pub const KIND_CASHU_WALLET: u32 = 37375;

/// NIP-69: P2P order (kind 38383)
pub const KIND_P2P_ORDER: u32 = 38383;

// -------------------------------------------------------
// Core types
// -------------------------------------------------------

use serde::{Deserialize, Serialize};

/// A NOSTR event per NIP-01
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: [u8; 32],
    pub pubkey: [u8; 32],
    pub created_at: u64,
    pub kind: u32,
    pub tags: Vec<Tag>,
    pub content: String,
    pub sig: [u8; 64],
}

/// A tag is a Vec of strings; first element is the tag name
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag(pub Vec<String>);

/// A subscription filter per NIP-01
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Filter {
    pub ids: Option<Vec<String>>,
    pub authors: Option<Vec<String>>,
    pub kinds: Option<Vec<u32>>,
    #[serde(rename = "#e")]
    pub e_tags: Option<Vec<String>>,
    #[serde(rename = "#p")]
    pub p_tags: Option<Vec<String>>,
    #[serde(rename = "#d")]
    pub d_tags: Option<Vec<String>>,
    pub since: Option<u64>,
    pub until: Option<u64>,
    pub limit: Option<u32>,
}

/// Relay message types (client to relay)
#[derive(Debug, Clone, Serialize)]
pub enum ClientMessage {
    Event(Event),
    Req { subscription_id: String, filters: Vec<Filter> },
    Close(String),
    Auth(Event),
}

/// Relay message types (relay to client)
#[derive(Debug, Clone, Deserialize)]
pub enum RelayMessage {
    Event { subscription_id: String, event: Event },
    Ok { event_id: String, accepted: bool, message: String },
    Eose { subscription_id: String },
    Notice(String),
    Auth { challenge: String },
}

/// Event builder for ergonomic event construction
pub struct EventBuilder {
    kind: u32,
    content: String,
    tags: Vec<Tag>,
    created_at: Option<u64>,
}

impl EventBuilder {
    pub fn new(kind: u32, content: impl Into<String>) -> Self {
        Self {
            kind,
            content: content.into(),
            tags: Vec::new(),
            created_at: None,
        }
    }

    pub fn tag(mut self, tag: Tag) -> Self {
        self.tags.push(tag);
        self
    }

    pub fn created_at(mut self, ts: u64) -> Self {
        self.created_at = Some(ts);
        self
    }

    /// Sign the event with the given secret key, producing a finalized Event
    pub fn sign(self, _secret_key: &[u8; 32]) -> Result<Event, SignError> {
        todo!("Implement Schnorr signing via secp256k1")
    }
}

#[derive(Debug, thiserror::Error)]
pub enum SignError {
    #[error("invalid secret key")]
    InvalidKey,
    #[error("serialization failed: {0}")]
    Serialization(String),
}
```

### 4.3 brickos-identity -- Key Management & NIP-05

Manages keypairs, NIP-05 DNS verification, and signer abstraction
(NIP-07 browser extension, NIP-46 remote signer).

```rust
//! brickos-identity -- Key management and identity verification

use crate::Event;

/// Signer abstraction -- implementations for local keys, NIP-07, NIP-46
#[async_trait::async_trait]
pub trait Signer: Send + Sync {
    /// Return the public key
    fn public_key(&self) -> [u8; 32];

    /// Sign an event
    async fn sign_event(&self, event_builder: super::EventBuilder)
        -> Result<Event, SignerError>;

    /// NIP-44 encrypt
    async fn nip44_encrypt(
        &self,
        recipient: &[u8; 32],
        plaintext: &str,
    ) -> Result<String, SignerError>;

    /// NIP-44 decrypt
    async fn nip44_decrypt(
        &self,
        sender: &[u8; 32],
        ciphertext: &str,
    ) -> Result<String, SignerError>;
}

/// Local signer -- holds the secret key in memory
pub struct LocalSigner {
    secret_key: [u8; 32],
    public_key: [u8; 32],
}

/// NIP-07 browser extension signer (WASM target only)
#[cfg(target_arch = "wasm32")]
pub struct Nip07Signer {
    public_key: [u8; 32],
}

/// NIP-46 remote signer (Nostr Connect)
pub struct Nip46Signer {
    relay_url: String,
    remote_pubkey: [u8; 32],
    local_keypair: LocalSigner,
}

/// NIP-05 verification result
#[derive(Debug)]
pub struct Nip05Verification {
    pub name: String,
    pub domain: String,
    pub pubkey: [u8; 32],
    pub relays: Vec<String>,
    pub verified: bool,
}

/// Verify a NIP-05 identifier (user@domain.com)
pub async fn verify_nip05(identifier: &str) -> Result<Nip05Verification, Nip05Error> {
    todo!("HTTP GET /.well-known/nostr.json?name=<user>")
}

#[derive(Debug, thiserror::Error)]
pub enum SignerError {
    #[error("signing failed: {0}")]
    SigningFailed(String),
    #[error("encryption failed: {0}")]
    EncryptionFailed(String),
    #[error("remote signer timeout")]
    Timeout,
    #[error("user rejected")]
    Rejected,
}

#[derive(Debug, thiserror::Error)]
pub enum Nip05Error {
    #[error("invalid identifier format")]
    InvalidFormat,
    #[error("DNS lookup failed: {0}")]
    DnsError(String),
    #[error("HTTP request failed: {0}")]
    HttpError(String),
    #[error("pubkey mismatch")]
    PubkeyMismatch,
}
```

### 4.4 brickos-trust -- Web of Trust & Reputation

```rust
//! brickos-trust -- Web of Trust scoring and reputation

/// Trust score for a pubkey, computed from follow graph + reports + badges
#[derive(Debug, Clone)]
pub struct TrustScore {
    pub pubkey: [u8; 32],
    /// 0.0 (unknown) to 1.0 (fully trusted)
    pub score: f64,
    /// Number of hops in follow graph to reach this pubkey
    pub degrees: u32,
    /// Number of positive interactions (zaps, reactions)
    pub positive_signals: u32,
    /// Number of negative signals (reports, blocks)
    pub negative_signals: u32,
    /// Badges held by this pubkey
    pub badges: Vec<String>,
}

/// Web of Trust engine
pub struct WotEngine {
    /// The user's own pubkey (trust anchor)
    anchor: [u8; 32],
    /// Maximum degrees of separation to consider
    max_degrees: u32,
    /// Follow graph adjacency list
    follows: std::collections::HashMap<[u8; 32], Vec<[u8; 32]>>,
}

impl WotEngine {
    pub fn new(anchor: [u8; 32], max_degrees: u32) -> Self {
        Self {
            anchor,
            max_degrees,
            follows: std::collections::HashMap::new(),
        }
    }

    /// Ingest a kind-3 (contacts) event to build the follow graph
    pub fn ingest_contacts(&mut self, event: &super::Event) {
        todo!("Parse p-tags from kind-3 event")
    }

    /// Compute trust score for a given pubkey
    pub fn score(&self, pubkey: &[u8; 32]) -> TrustScore {
        todo!("BFS from anchor, decay score per hop")
    }

    /// Check if a pubkey is within the trust horizon
    pub fn is_trusted(&self, pubkey: &[u8; 32], min_score: f64) -> bool {
        self.score(pubkey).score >= min_score
    }
}
```

### 4.5 brickos-escrow -- NIP-47 Hold Invoices & Cashu P2PK

```rust
//! brickos-escrow -- Escrow primitives for marketplace trades

/// Escrow state machine
#[derive(Debug, Clone, PartialEq)]
pub enum EscrowState {
    /// Buyer has funded the escrow
    Funded,
    /// Seller has shipped / delivered
    Shipped,
    /// Buyer confirms receipt -- funds released to seller
    Released,
    /// Dispute raised -- awaiting arbitration
    Disputed,
    /// Arbitrator resolved the dispute
    Resolved { winner: EscrowParty },
    /// Escrow cancelled and refunded
    Cancelled,
    /// Escrow expired (timeout)
    Expired,
}

#[derive(Debug, Clone, PartialEq)]
pub enum EscrowParty {
    Buyer,
    Seller,
}

/// Lightning hold invoice escrow (NIP-47)
pub struct LnEscrow {
    pub state: EscrowState,
    /// NWC connection string for the escrow wallet
    pub nwc_uri: String,
    /// Payment hash of the hold invoice
    pub payment_hash: [u8; 32],
    /// Amount in millisatoshis
    pub amount_msat: u64,
    /// Expiry timestamp
    pub expires_at: u64,
}

/// Cashu P2PK escrow (NUT-11)
///
/// Uses Cashu tokens locked to a pubkey. The buyer creates tokens
/// locked to the escrow agent's pubkey. On release, the agent
/// creates new tokens locked to the seller's pubkey.
pub struct CashuEscrow {
    pub state: EscrowState,
    /// Cashu mint URL
    pub mint_url: String,
    /// Locked token (NUT-11 P2PK)
    pub locked_token: String,
    /// Amount in satoshis
    pub amount_sat: u64,
    /// Buyer pubkey
    pub buyer: [u8; 32],
    /// Seller pubkey
    pub seller: [u8; 32],
    /// Escrow agent pubkey (BrickOS or community arbitrator)
    pub agent: [u8; 32],
}

impl CashuEscrow {
    /// Create a new escrow from a Cashu token locked to the agent
    pub fn new(
        mint_url: String,
        locked_token: String,
        amount_sat: u64,
        buyer: [u8; 32],
        seller: [u8; 32],
        agent: [u8; 32],
    ) -> Self {
        Self {
            state: EscrowState::Funded,
            mint_url,
            locked_token,
            amount_sat,
            buyer,
            seller,
            agent,
        }
    }

    /// Release funds to seller (agent signs new token to seller pubkey)
    pub fn release(&mut self) -> Result<String, EscrowError> {
        if self.state != EscrowState::Funded && self.state != EscrowState::Shipped {
            return Err(EscrowError::InvalidState);
        }
        self.state = EscrowState::Released;
        todo!("Create new Cashu token locked to seller pubkey")
    }

    /// Refund to buyer (agent signs new token to buyer pubkey)
    pub fn refund(&mut self) -> Result<String, EscrowError> {
        if self.state == EscrowState::Released {
            return Err(EscrowError::InvalidState);
        }
        self.state = EscrowState::Cancelled;
        todo!("Create new Cashu token locked to buyer pubkey")
    }
}

#[derive(Debug, thiserror::Error)]
pub enum EscrowError {
    #[error("invalid state transition")]
    InvalidState,
    #[error("token verification failed")]
    TokenInvalid,
    #[error("mint unreachable: {0}")]
    MintError(String),
    #[error("NWC request failed: {0}")]
    NwcError(String),
}
```

### 4.6 brickos-gossip -- Relay Discovery & Event Routing

```rust
//! brickos-gossip -- Relay discovery, outbox model, event routing

/// Relay purpose classification
#[derive(Debug, Clone, PartialEq)]
pub enum RelayPurpose {
    /// General read/write relay
    ReadWrite,
    /// Read-only relay (inbox)
    Read,
    /// Write-only relay (outbox)
    Write,
    /// Private relay (NIP-42 auth required)
    Private,
    /// Paid relay
    Paid,
    /// BrickOS platform relay
    Platform,
}

/// A known relay with metadata
#[derive(Debug, Clone)]
pub struct RelayInfo {
    pub url: String,
    pub purpose: RelayPurpose,
    pub supported_nips: Vec<u32>,
    pub requires_auth: bool,
    pub requires_payment: bool,
    pub last_connected: Option<u64>,
    pub latency_ms: Option<u32>,
}

/// Outbox model router -- determines which relays to use for each operation
pub struct GossipRouter {
    /// User's own relay list (kind 10002)
    user_relays: Vec<RelayInfo>,
    /// BrickOS platform relays
    platform_relays: Vec<RelayInfo>,
    /// Cached relay lists for other pubkeys
    peer_relays: std::collections::HashMap<[u8; 32], Vec<RelayInfo>>,
}

impl GossipRouter {
    /// Determine which relays to publish an event to
    pub fn publish_relays(&self, event: &super::Event) -> Vec<&RelayInfo> {
        todo!("Route based on event kind and tagged pubkeys")
    }

    /// Determine which relays to query for events from a pubkey
    pub fn query_relays(&self, pubkey: &[u8; 32]) -> Vec<&RelayInfo> {
        todo!("Look up peer's write relays, fall back to platform relays")
    }

    /// Ingest a kind-10002 relay list event
    pub fn ingest_relay_list(&mut self, event: &super::Event) {
        todo!("Parse relay list and update peer_relays")
    }
}
```

### 4.7 brickos-transport -- Relay Connections & BitChat Bridge

```rust
//! brickos-transport -- WebSocket relay connections and BitChat BLE bridge

/// Connection state for a relay
#[derive(Debug, Clone, PartialEq)]
pub enum ConnectionState {
    Disconnected,
    Connecting,
    Connected,
    Authenticating,
    Ready,
    Error(String),
}

/// A pool of relay connections
pub struct RelayPool {
    connections: Vec<RelayConnection>,
    max_connections: usize,
}

/// A single relay connection (WebSocket)
pub struct RelayConnection {
    pub url: String,
    pub state: ConnectionState,
    /// Pending subscriptions
    pub subscriptions: Vec<String>,
}

#[async_trait::async_trait]
pub trait Transport: Send + Sync {
    /// Send an event through this transport
    async fn send_event(&self, event: &super::Event) -> Result<(), TransportError>;

    /// Subscribe to events matching filters
    async fn subscribe(
        &self,
        filters: Vec<super::Filter>,
    ) -> Result<tokio::sync::mpsc::Receiver<super::Event>, TransportError>;

    /// Close the transport
    async fn close(&self) -> Result<(), TransportError>;
}

/// BitChat BLE bridge configuration
///
/// This does not implement BLE directly (BitChat is Swift-only).
/// Instead it bridges NOSTR events to/from BitChat via a local
/// relay that both BrickOS and BitChat connect to.
pub struct BitChatBridge {
    /// Local relay URL that BitChat app also connects to
    pub local_relay: String,
    /// Event kinds to bridge (filter for relevant kinds only)
    pub bridged_kinds: Vec<u32>,
}

#[derive(Debug, thiserror::Error)]
pub enum TransportError {
    #[error("connection failed: {0}")]
    ConnectionFailed(String),
    #[error("relay rejected event: {0}")]
    Rejected(String),
    #[error("timeout")]
    Timeout,
    #[error("transport closed")]
    Closed,
}
```

---

## 5. Auth Stack

### 5.1 Current State

BrickOS currently uses:
- Email + password registration
- Argon2id password hashing (brickos-crypto)
- JWT access tokens (15min) + refresh tokens (7d)
- Server-side session management in PostgreSQL

### 5.2 Target State

The target is a hybrid auth stack that supports both legacy and NOSTR auth:

```
┌────────────────────────────────────────────────────┐
│                    Client                           │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  NIP-07   │  │  NIP-46   │  │ Email/password   │ │
│  │ (browser  │  │ (remote   │  │ (legacy, will    │ │
│  │ extension)│  │  signer)  │  │  be deprecated)  │ │
│  └─────┬────┘  └─────┬────┘  └────────┬─────────┘ │
│        │              │               │             │
│        └──────┬───────┘               │             │
│               ▼                       ▼             │
│     ┌──────────────────┐   ┌──────────────────┐    │
│     │  NIP-98 HTTP Auth │   │  JWT (existing)   │    │
│     │  (signed event)   │   │  (access/refresh) │    │
│     └────────┬─────────┘   └────────┬─────────┘    │
└──────────────┼──────────────────────┼───────────────┘
               │                      │
               ▼                      ▼
┌────────────────────────────────────────────────────┐
│                 BrickOS API                         │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Auth middleware                               │  │
│  │  - Verify NIP-98 signed event (kind 27235)    │  │
│  │  - OR verify JWT (existing flow)              │  │
│  │  - Extract pubkey / user_id                   │  │
│  │  - Apply rate limits                          │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  NIP-42 relay auth (for private relays)       │  │
│  │  - Challenge/response with kind 22242         │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

### 5.3 NIP-98 HTTP Auth Flow

1. Client constructs a kind-27235 event:
   - `created_at`: current timestamp (valid window: 60s)
   - `tags`: `["u", "<request URL>"]`, `["method", "GET|POST|..."]`
   - Optional: `["payload", "<SHA-256 of body>"]` for POST/PUT
2. Client signs the event with their NOSTR key (via NIP-07 or NIP-46)
3. Client sends the event as `Authorization: Nostr <base64 event>` header
4. Server verifies signature, checks timestamp, validates URL and method
5. Server extracts the pubkey and maps it to the internal user account

### 5.4 Migration Path

Phase 1: Add NIP-98 as alternative auth (existing JWT continues to work)
Phase 2: Link NOSTR pubkeys to existing accounts via a linking event
Phase 3: New accounts default to NOSTR-only auth
Phase 4: Deprecate email/password (existing accounts can still use it)

---

## 6. BitChat Integration Path

### 6.1 Phase 1 -- Shared Identity (Months 1-2)

- BrickOS apps accept NOSTR keypair login
- BitChat users can authenticate to BrickOS with their existing keypair
- Shared NIP-05 verification (`user@brickos.io`)
- No direct BLE integration yet

Deliverables:
- `brickos-identity` crate with `Signer` trait
- NIP-07 and NIP-46 signer implementations
- NIP-05 verification endpoint at `brickos.io/.well-known/nostr.json`
- Account linking (npub to existing account)

### 6.2 Phase 2 -- Shared Events (Months 3-4)

- BrickOS publishes events that BitChat can read (kind 1, 14, 30023)
- BitChat publishes events that BrickOS can read
- Shared relay infrastructure (BrickOS relays accept BitChat events)
- Direct messages between BrickOS and BitChat users via NIP-17

Deliverables:
- `brickos-nostr` crate with event creation and verification
- `brickos-transport` crate with relay pool
- `brickos-gossip` crate with outbox model routing
- NIP-17 DM support in Sovereign Link
- Relay configuration for cross-app event flow

### 6.3 Phase 3 -- Offline Mesh Bridge (Months 5-6)

- Local relay bridge: BrickOS and BitChat both connect to a local relay
- Events created offline in BitChat propagate to BrickOS when in range
- BrickOS events queue for BitChat delivery when the device is nearby
- NIP-77 negentropy sync for efficient reconciliation

Deliverables:
- `BitChatBridge` in `brickos-transport`
- Local relay setup automation
- NIP-77 negentropy sync in `brickos-gossip`
- Offline queue with SQLite persistence

### 6.4 BitChat Binary Protocol Reference

BitChat uses a custom binary protocol over BLE with the following header:

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Version (1B) |   Type (1B)   |    TTL (1B)   |  Hop Cnt (1B) |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                        Sender ID (4B)                          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Message ID (4B)                          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Reserved (1B)|                Payload (variable)              |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

Total header: 13 bytes
Max hops: 7 (TTL field)
Encryption: Noise_XX_25519_ChaChaPoly_SHA256
MTU: BLE GATT characteristic size (typically 512 bytes)
```

Message types:
- `0x01`: Handshake (Noise_XX initiator)
- `0x02`: Handshake response
- `0x03`: Encrypted data
- `0x04`: Relay request (forward to NOSTR relay when internet available)
- `0x05`: Acknowledgment
- `0x06`: Peer discovery

BrickOS does NOT implement this protocol directly. The bridge works at the
NOSTR event level via a shared local relay.

---

## 7. Relay Strategy

### 7.1 BrickOS Relay Infrastructure

| Relay | Purpose | Auth | NIPs |
|-------|---------|------|------|
| `wss://relay.brickos.io` | General platform relay | NIP-42 | 01,02,09,11,42,44,65,77 |
| `wss://health.relay.brickos.io` | Health data (private) | NIP-42 (required) | 01,09,42,44,77,78 |
| `wss://market.relay.brickos.io` | Marketplace events | NIP-42 | 01,09,15,42,44,69,77,99 |
| `wss://inbox.relay.brickos.io` | DM inbox relay | NIP-42 (required) | 01,09,17,42,44,59,77 |

### 7.2 User Relays

Users bring their own relays via NIP-65 (kind 10002). The outbox model in
`brickos-gossip` reads each user's relay list and routes events accordingly:

- **Write to**: user's declared write relays + relevant BrickOS relay
- **Read from**: author's declared write relays + BrickOS relays

### 7.3 Zapstore Relay

The Zapstore relay (`wss://relay.zapstore.dev`) is used for app distribution
events. BrickOS publishes release metadata to this relay so the BrickOS mobile
app can be discovered and installed via Zapstore.

### 7.4 Relay Selection Algorithm

```
fn select_relays(event, author_relays, recipient_relays, platform_relays):
    targets = []

    // Always include the relevant platform relay
    match event.kind:
        health kinds  -> targets.push(health relay)
        market kinds  -> targets.push(market relay)
        DM kinds      -> targets.push(inbox relay)
        _             -> targets.push(general relay)

    // Add author's write relays (max 3)
    targets.extend(author_relays.write.take(3))

    // For tagged recipients, add their read relays (max 2 per recipient)
    for pubkey in event.p_tags():
        targets.extend(recipient_relays[pubkey].read.take(2))

    // Deduplicate and return
    targets.dedup()
    return targets
```

---

## 8. Content Format -- Markdown vs Djot

### 8.1 NIP-54 Wiki Pages Use Djot

NIP-54 specifies Djot (not Markdown) for wiki pages (kind 30818). Djot is a
markup language by the creator of Pandoc, designed to fix Markdown's parsing
ambiguities.

Key differences from Markdown:
- No indentation-based code blocks (use fences only)
- Attributes on any element: `{.class #id key=value}`
- Consistent emphasis: `_italic_` and `*bold*` (no overlap)
- Footnotes, definition lists, task lists built in
- Deterministic parsing (no ambiguous constructs)

### 8.2 Implications for BrickOS

| Content Type | Event Kind | Format | Crate |
|---|---|---|---|
| Wiki pages | 30818 | Djot (NIP-54) | `jotdown` |
| Long-form posts | 30023 | Markdown (NIP-23) | `pulldown-cmark` |
| Short notes | 1 | Plain text | -- |
| Chat messages | 42, 1311 | Plain text | -- |
| Health records | 30078 | JSON (encrypted) | `serde_json` |

### 8.3 Djot Rendering

```rust
// Wiki page rendering with jotdown
use jotdown::{Parser, Render, html::Renderer};

fn render_wiki_page(djot_source: &str) -> String {
    let events = Parser::new(djot_source);
    let mut output = String::new();
    Renderer::default().push(events, &mut output).unwrap();
    output
}
```

---

## 9. Offline-First Architecture

### 9.1 Design Principles

- All data is stored locally first (SQLite)
- Relay sync is eventual, not required for core functionality
- Conflict resolution: last-writer-wins based on `created_at`
- Parameterized replaceable events (NIP-33) for mutable state
- NIP-77 negentropy for efficient set reconciliation

### 9.2 SQLite Schema

```sql
-- Core event storage
CREATE TABLE IF NOT EXISTS events (
    id              BLOB    PRIMARY KEY,  -- 32-byte event id
    pubkey          BLOB    NOT NULL,     -- 32-byte author pubkey
    created_at      INTEGER NOT NULL,
    kind            INTEGER NOT NULL,
    content         TEXT    NOT NULL,
    sig             BLOB    NOT NULL,     -- 64-byte Schnorr signature
    received_at     INTEGER NOT NULL DEFAULT (unixepoch()),
    -- Sync metadata
    relay_url       TEXT,                 -- relay this was received from
    sync_state      TEXT    NOT NULL DEFAULT 'local',
    -- CHECK constraint for sync states
    CHECK (sync_state IN ('local', 'synced', 'pending', 'failed'))
);

-- Tags (normalized for querying)
CREATE TABLE IF NOT EXISTS tags (
    event_id        BLOB    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    tag_name        TEXT    NOT NULL,  -- first element (e.g., 'e', 'p', 'd')
    tag_value       TEXT    NOT NULL,  -- second element
    tag_extra       TEXT,              -- remaining elements as JSON array
    PRIMARY KEY (event_id, tag_name, tag_value)
);

-- Relay state tracking
CREATE TABLE IF NOT EXISTS relays (
    url             TEXT    PRIMARY KEY,
    purpose         TEXT    NOT NULL DEFAULT 'read_write',
    last_connected  INTEGER,
    last_eose       INTEGER,            -- timestamp of last EOSE per subscription
    latency_ms      INTEGER,
    requires_auth   INTEGER NOT NULL DEFAULT 0,
    CHECK (purpose IN ('read_write', 'read', 'write', 'private', 'paid', 'platform'))
);

-- Sync cursors for negentropy (NIP-77)
CREATE TABLE IF NOT EXISTS sync_cursors (
    relay_url       TEXT    NOT NULL,
    filter_hash     TEXT    NOT NULL,   -- SHA-256 of the serialized filter
    last_sync       INTEGER NOT NULL,
    negentropy_state BLOB,              -- opaque negentropy state
    PRIMARY KEY (relay_url, filter_hash)
);

-- Outbox queue for events created offline
CREATE TABLE IF NOT EXISTS outbox_queue (
    event_id        BLOB    PRIMARY KEY REFERENCES events(id),
    target_relays   TEXT    NOT NULL,   -- JSON array of relay URLs
    attempts        INTEGER NOT NULL DEFAULT 0,
    last_attempt    INTEGER,
    next_retry      INTEGER,
    status          TEXT    NOT NULL DEFAULT 'pending',
    CHECK (status IN ('pending', 'sending', 'sent', 'failed'))
);

-- User's own keypair metadata (encrypted at rest)
CREATE TABLE IF NOT EXISTS identity (
    pubkey          BLOB    PRIMARY KEY,
    encrypted_nsec  BLOB,               -- AES-256-GCM encrypted secret key
    nip05           TEXT,
    display_name    TEXT,
    created_at      INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_events_kind ON events(kind);
CREATE INDEX IF NOT EXISTS idx_events_pubkey ON events(pubkey);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_kind_pubkey ON events(kind, pubkey);
CREATE INDEX IF NOT EXISTS idx_events_sync_state ON events(sync_state)
    WHERE sync_state != 'synced';
CREATE INDEX IF NOT EXISTS idx_tags_name_value ON tags(tag_name, tag_value);
CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox_queue(status)
    WHERE status = 'pending';
```

### 9.3 Sync Strategy (NIP-77 Negentropy)

Negentropy is a set reconciliation protocol that efficiently determines which
events each side is missing, without transferring the events themselves.

```
Client                          Relay
  │                               │
  │  SYNC (filter, negentropy     │
  │        fingerprint)           │
  │──────────────────────────────>│
  │                               │
  │  SYNC (have_ids, need_ids)    │
  │<──────────────────────────────│
  │                               │
  │  EVENT (missing events)       │
  │──────────────────────────────>│
  │                               │
  │  EVENT (missing events)       │
  │<──────────────────────────────│
  │                               │
  │  SYNC (complete)              │
  │<──────────────────────────────│
```

Sync runs on a schedule:
- **Foreground:** Every 30 seconds for active subscriptions
- **Background:** Every 5 minutes for all followed pubkeys
- **On reconnect:** Immediately for all relay connections
- **Manual:** User can trigger a full sync at any time

### 9.4 Conflict Resolution

For replaceable events (kinds 0, 3, 10000-19999, 30000-39999):
- Keep the event with the highest `created_at`
- If timestamps are equal, keep the event with the lowest `id` (deterministic)
- Delete the superseded event from local storage

For regular events (kinds 1, 7, etc.):
- All events are kept (no conflict possible -- each event is unique)
- Deletion events (kind 5) mark referenced events as deleted

---

## 10. Testing Standards

### 10.1 NIP-44 Encryption Test Vectors

All NIP-44 implementations MUST pass the official test vectors from the spec.
The `brickos-nostr` crate includes these as integration tests:

```rust
#[cfg(test)]
mod nip44_tests {
    /// Official NIP-44 v2 test vectors
    /// Source: https://github.com/paulmillr/nip44
    const TEST_VECTORS: &[Nip44Vector] = &[
        // Vector 1: basic encryption roundtrip
        Nip44Vector {
            sec1: "0000000000000000000000000000000000000000000000000000000000000001",
            sec2: "0000000000000000000000000000000000000000000000000000000000000002",
            plaintext: "a]",
            // conversation_key and ciphertext omitted for brevity
        },
        // Additional vectors from the spec...
    ];

    struct Nip44Vector {
        sec1: &'static str,
        sec2: &'static str,
        plaintext: &'static str,
    }

    #[test]
    fn test_nip44_roundtrip() {
        for vector in TEST_VECTORS {
            let sec1 = hex::decode(vector.sec1).unwrap();
            let sec2 = hex::decode(vector.sec2).unwrap();
            let pub2 = derive_pubkey(&sec2);

            let encrypted = nip44_encrypt(&sec1, &pub2, vector.plaintext).unwrap();
            let decrypted = nip44_decrypt(&sec2, &derive_pubkey(&sec1), &encrypted).unwrap();

            assert_eq!(decrypted, vector.plaintext);
        }
    }

    #[test]
    fn test_nip44_never_nip04() {
        // Verify that NIP-04 encrypted payloads are rejected
        let nip04_payload = "base64content?iv=base64iv";
        let result = nip44_decrypt(
            &[0u8; 32],
            &[0u8; 32],
            nip04_payload,
        );
        assert!(result.is_err(), "NIP-04 payloads must be rejected");
    }
}
```

### 10.2 Fuzz Targets

Each crate exposes fuzz targets for security-critical code:

```
crates/brickos-nostr/fuzz/
  fuzz_event_deserialize.rs     -- malformed JSON events
  fuzz_filter_deserialize.rs    -- malformed filters
  fuzz_nip44_decrypt.rs         -- malformed ciphertexts
  fuzz_tag_parsing.rs           -- malformed tag arrays

crates/brickos-identity/fuzz/
  fuzz_nip05_parse.rs           -- malformed NIP-05 identifiers
  fuzz_nip46_message.rs         -- malformed NIP-46 messages

crates/brickos-escrow/fuzz/
  fuzz_cashu_token.rs           -- malformed Cashu tokens
  fuzz_state_machine.rs         -- random state transitions

crates/brickos-transport/fuzz/
  fuzz_relay_message.rs         -- malformed relay messages
  fuzz_websocket_frame.rs       -- malformed WebSocket frames
```

Run with: `cargo +nightly fuzz run <target> -j$(nproc)`

### 10.3 Quality Gates

All PRs must pass these checks before merge:

| Gate | Tool | Threshold |
|------|------|-----------|
| Unit tests | `cargo test` | 100% pass |
| Clippy | `cargo clippy -- -D warnings` | Zero warnings |
| Formatting | `cargo fmt --check` | No diff |
| NIP-44 vectors | Integration test | All vectors pass |
| Fuzz (CI) | `cargo fuzz` (60s per target) | No crashes |
| Event signature | Property test | 10,000 roundtrips |
| Relay message parsing | Property test | 10,000 roundtrips |
| WASM build | `cargo build --target wasm32-unknown-unknown` | Compiles |
| Minimum test coverage | `cargo tarpaulin` | 80% line coverage |

### 10.4 Property-Based Tests

```rust
#[cfg(test)]
mod proptests {
    use proptest::prelude::*;

    proptest! {
        #[test]
        fn event_roundtrip(
            kind in 0u32..65535,
            content in ".*",
            created_at in 0u64..u64::MAX,
        ) {
            let secret_key = generate_random_key();
            let event = EventBuilder::new(kind, &content)
                .created_at(created_at)
                .sign(&secret_key)
                .unwrap();

            // Verify the event we just created
            assert!(verify_event(&event).is_ok());

            // Serialize and deserialize
            let json = serde_json::to_string(&event).unwrap();
            let parsed: Event = serde_json::from_str(&json).unwrap();
            assert_eq!(event.id, parsed.id);
            assert_eq!(event.sig, parsed.sig);
        }

        #[test]
        fn filter_matches_event(
            kind in 0u32..100,
            content in "[a-zA-Z0-9 ]{0,100}",
        ) {
            let secret_key = generate_random_key();
            let event = EventBuilder::new(kind, &content)
                .sign(&secret_key)
                .unwrap();

            let filter = Filter {
                kinds: Some(vec![kind]),
                authors: Some(vec![hex::encode(event.pubkey)]),
                ..Default::default()
            };

            assert!(filter_matches(&filter, &event));
        }
    }
}
```

---

## 11. Monorepo Structure

### 11.1 New Crates

```
crates/
  brickos-auth/              # Existing -- email/password + JWT
  brickos-backup/            # Existing -- backup gateway
  brickos-billing/           # Existing -- subscription management
  brickos-crypto/            # Existing -- Argon2id, AES-256-GCM
  brickos-db/                # Existing -- PostgreSQL connection pool
  brickos-email/             # Existing -- SMTP
  brickos-startos/           # Existing -- Start9 integration
  brickos-nostr/             # NEW -- Core NOSTR protocol
  brickos-identity/          # NEW -- Key management, NIP-05, signers
  brickos-trust/             # NEW -- Web of Trust, reputation
  brickos-escrow/            # NEW -- Hold invoices, Cashu P2PK
  brickos-gossip/            # NEW -- Relay discovery, outbox model
  brickos-transport/         # NEW -- Relay pool, BitChat bridge
```

### 11.2 Cargo Workspace Additions

```toml
# Root Cargo.toml -- add to [workspace.members]
[workspace]
members = [
    # ... existing members ...
    "crates/brickos-nostr",
    "crates/brickos-identity",
    "crates/brickos-trust",
    "crates/brickos-escrow",
    "crates/brickos-gossip",
    "crates/brickos-transport",
]

# Shared dependency versions in [workspace.dependencies]
[workspace.dependencies]
# ... existing deps ...
secp256k1 = { version = "0.30", features = ["global-context", "rand-std"] }
nostr = "0.37"
nostr-sdk = "0.37"
negentropy = "0.4"
jotdown = "0.7"
tokio-tungstenite = "0.26"
```

### 11.3 Frontend Packages

```
packages/
  brickos-nostr-js/          # NEW -- TypeScript NOSTR utilities
    src/
      event.ts               # Event creation and verification
      nip44.ts               # NIP-44 encryption (wraps @noble/ciphers)
      nip07.ts               # Browser extension signer
      nip46.ts               # Remote signer client
      nip98.ts               # HTTP auth header generation
      relay.ts               # WebSocket relay connection
      types.ts               # Shared TypeScript types
    package.json
    tsconfig.json
```

---

## 12. Dependency Inventory

### 12.1 Rust Crates

| Crate | Version | Purpose | Used By |
|-------|---------|---------|---------|
| `secp256k1` | 0.30 | Schnorr signatures, ECDH | nostr, identity |
| `nostr` | 0.37 | NOSTR protocol types | nostr |
| `nostr-sdk` | 0.37 | High-level NOSTR client | transport, gossip |
| `negentropy` | 0.4 | NIP-77 set reconciliation | gossip |
| `chacha20poly1305` | 0.10 | NIP-44 AEAD cipher | nostr |
| `hkdf` | 0.12 | NIP-44 key derivation | nostr |
| `sha2` | 0.10 | SHA-256 for event IDs | nostr |
| `jotdown` | 0.7 | Djot parser/renderer (NIP-54) | nostr |
| `tokio-tungstenite` | 0.26 | WebSocket client | transport |
| `rusqlite` | 0.32 | SQLite for offline storage | gossip |
| `serde` | 1.0 | Serialization | all |
| `serde_json` | 1.0 | JSON serialization | all |
| `thiserror` | 2.0 | Error types | all |
| `async-trait` | 0.1 | Async trait support | identity, transport |
| `proptest` | 1.5 | Property-based testing | all (dev) |
| `cargo-fuzz` | 0.12 | Fuzz testing | all (dev) |
| `bech32` | 0.11 | NIP-19 bech32 encoding | nostr, identity |
| `base64` | 0.22 | NIP-98 auth encoding | nostr |
| `hex` | 0.4 | Hex encoding for event IDs | nostr |
| `url` | 2.5 | Relay URL validation | transport, gossip |

### 12.2 JavaScript/TypeScript Packages

| Package | Version | Purpose | Used By |
|---------|---------|---------|---------|
| `@noble/secp256k1` | 2.2 | Schnorr signatures | brickos-nostr-js |
| `@noble/ciphers` | 1.2 | ChaCha20-Poly1305 (NIP-44) | brickos-nostr-js |
| `@noble/hashes` | 1.7 | SHA-256, HMAC, HKDF | brickos-nostr-js |
| `@scure/bech32` | 1.2 | NIP-19 encoding | brickos-nostr-js |
| `nostr-tools` | 2.11 | NOSTR utilities (reference) | brickos-nostr-js |

### 12.3 Security Notes

- **NIP-44 v2 only**: Cure53-audited encryption. NIP-04 (AES-256-CBC) is
  explicitly rejected -- it leaks metadata and has no authentication.
- **@noble/* family**: Audited pure-JS crypto by Paul Miller. No native
  dependencies, no WASM, deterministic builds.
- **secp256k1 (Rust)**: Rust bindings to libsecp256k1 (Bitcoin Core's library).
  Battle-tested, constant-time operations.
- **rusqlite**: SQLite via C bindings. Use `bundled` feature to pin SQLite
  version and avoid system library mismatches.

---

## 13. Open Questions

### 13.1 Identity Migration

**Q:** How do existing email/password users migrate to NOSTR keypairs?

Options:
1. Generate a keypair server-side and encrypt the nsec with the user's password
2. Require the user to bring their own keypair (NIP-07 extension)
3. Hybrid: offer both, recommend option 2

**Leaning toward:** Option 3. Generate a custodial keypair for frictionless
onboarding, but strongly encourage migration to a self-custodied key.

### 13.2 Health Data on Relays

**Q:** Should encrypted health data ever touch a public relay?

Options:
1. Private relay only (user's own or BrickOS health relay with NIP-42)
2. Public relay with NIP-44 encryption (data is encrypted but visible)
3. Never on relays -- direct peer-to-peer only via NIP-17 gift wrap

**Leaning toward:** Option 1. Health data stays on authenticated relays.
Sharing with providers uses NIP-17 gift wrap (kind 1059) which is E2E
encrypted and relay-operator-invisible.

### 13.3 BitChat Android

**Q:** BitChat is Swift-only. What about Android users?

Options:
1. Wait for BitChat to ship Android
2. Build a Rust BLE mesh library that can be used from Kotlin
3. Accept that BLE mesh is Apple-only and focus on relay-based sync

**Leaning toward:** Option 3 for now. The relay bridge means Android users
still get all NOSTR features -- they just cannot participate in the BLE mesh
until BitChat or an equivalent ships on Android.

### 13.4 Relay Costs

**Q:** Who pays for BrickOS relay infrastructure?

Options:
1. Included in BrickOS subscription
2. Separate relay subscription (NIP-42 paid relay)
3. Free tier with rate limits, paid tier for heavy usage

**Leaning toward:** Option 1. Relay costs are minimal (storage + bandwidth)
and including them in the subscription simplifies the user experience.

### 13.5 Cashu Mint Trust

**Q:** Which Cashu mints should BrickOS trust for escrow?

Options:
1. BrickOS operates its own mint
2. Curated list of community mints
3. User chooses their own mint (full sovereignty)

**Leaning toward:** Start with option 1 for the marketplace escrow, allow
option 3 for direct P2P trades.

---

## 14. References

### 14.1 NOSTR

- [NIP Index](https://github.com/nostr-protocol/nips) -- complete NIP listing
- [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md) -- basic protocol
- [NIP-07](https://github.com/nostr-protocol/nips/blob/master/07.md) -- browser extension
- [NIP-15](https://github.com/nostr-protocol/nips/blob/master/15.md) -- marketplace
- [NIP-17](https://github.com/nostr-protocol/nips/blob/master/17.md) -- private DMs
- [NIP-42](https://github.com/nostr-protocol/nips/blob/master/42.md) -- relay auth
- [NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md) -- encryption v2
- [NIP-46](https://github.com/nostr-protocol/nips/blob/master/46.md) -- remote signing
- [NIP-47](https://github.com/nostr-protocol/nips/blob/master/47.md) -- Wallet Connect
- [NIP-54](https://github.com/nostr-protocol/nips/blob/master/54.md) -- wiki (Djot)
- [NIP-57](https://github.com/nostr-protocol/nips/blob/master/57.md) -- zaps
- [NIP-60](https://github.com/nostr-protocol/nips/blob/master/60.md) -- Cashu wallet
- [NIP-61](https://github.com/nostr-protocol/nips/blob/master/61.md) -- nutzaps
- [NIP-69](https://github.com/nostr-protocol/nips/blob/master/69.md) -- P2P orders
- [NIP-77](https://github.com/nostr-protocol/nips/blob/master/77.md) -- negentropy sync
- [NIP-98](https://github.com/nostr-protocol/nips/blob/master/98.md) -- HTTP auth
- [NIP-99](https://github.com/nostr-protocol/nips/blob/master/99.md) -- classifieds
- [NIP-44 Test Vectors](https://github.com/paulmillr/nip44) -- Cure53 audit + vectors
- [Djot Spec](https://djot.net/) -- Djot markup language

### 14.2 BitChat

- [BitChat App](https://bitchat.app) -- Official site
- [Noise Protocol](https://noiseprotocol.org/noise.html) -- Noise framework spec
- Noise_XX_25519_ChaChaPoly_SHA256 -- specific handshake pattern used

### 14.3 Cashu & Lightning

- [Cashu Protocol](https://cashu.space) -- Chaumian ecash
- [NUT-11](https://github.com/cashubtc/nuts/blob/main/11.md) -- P2PK (pay-to-pubkey)
- [LNbits](https://lnbits.com) -- Lightning wallet with NWC support

### 14.4 BrickOS Internal

- [001-sovereign-stack-vision.md](001-sovereign-stack-vision.md) -- parent design doc
- [004-cashu-tollgate-zapstore.md](004-cashu-tollgate-zapstore.md) -- Cashu/TollGate/Zapstore details
- `crates/brickos-crypto/` -- existing encryption primitives
- `crates/brickos-auth/` -- existing auth stack
