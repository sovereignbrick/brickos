# 023 -- Sovereign Oracle: Bitcoin Signal Intelligence for BrickOS

**Status:** Draft v0.1
**Author:** Helmut / Claude
**Date:** 2026-04-18
**Related:** 001-sovereign-stack-vision, 002-nostr-bitchat-integration, 007-sovereign-voice, 017-sovereign-crm, 019-scaffold-generator-architecture, 022-licensing-model
**Source:** `preqos-bsi-spec.html` (PreqOS · BSI Module, DOC-BSI-001 v0.1-DRAFT, April 2026)

---

## 1. Concept Analysis

### What the Source Spec Describes

The PreqOS BSI spec defines a three-layer, self-hosted Bitcoin trading-intelligence module:

1. **Ingest** -- Rust harvester pulling on-chain data (Bitcoin Core RPC, mempool, miner wallets), exchange flows, ETF AUM deltas, and macro feeds (DXY, US10Y, Fed futures).
2. **Reasoning** -- Local Ollama model classifies raw signals into structured `SignalRecord`s (category, direction, magnitude, confidence, horizon, rationale). Claude API is a consent-gated fallback.
3. **Simulation** -- Monte Carlo engine runs ≥ 10,000 iterations over configurable forward windows, producing a `TradingSignal` (action, entry range, invalidation, R:R ratio).

Every approved signal is published as a signed NOSTR event (kind `30078`) with outcome records back-posted on trade close. An optional OP_RETURN monthly batch anchors the ledger to Bitcoin itself. A public `/proof` dashboard renders the verifiable track record from NOSTR queries alone.

### Core Innovation

**Cryptographically verifiable trade track record** -- not "trust me bro" Telegram screenshots, not a VC-funded leaderboard site, but signal → outcome chains pinned to NOSTR keypairs and (optionally) Bitcoin transactions. You cannot edit your losses out. You cannot forge your wins in.

Combined with **sovereignty-by-default inference** (local Ollama first, remote LLM only on explicit consent), this is a genuinely new product category: a reputation-bearing signal publisher that leaves no custody or integrity trust surface for third parties.

### Where the Spec Needs Adaptation for BrickOS

The spec targets "PreqOS" as the host platform, with its own vault, SSO, and module boundaries. To land in BrickOS, we swap every PreqOS assumption for an existing BrickOS primitive:

| PreqOS assumption | BrickOS replacement |
|---|---|
| PreqOS SSO (JWT) | `brickos-auth` crate (JWT, Argon2id, TOTP MFA) |
| PreqOS vault for NOSTR keys | `brickos-crypto` per-field AES-256-GCM + `platform.service_account_keys` pattern |
| "Hetzner VPN + mTLS" | Existing Caddy/nginx + Docker compose + optional WireGuard (out of scope for v1) |
| Standalone Postgres | Two-pool architecture: `PlatformPool` (brickos.*) + `AppPool` (`bsi` schema) |
| Own prompt-versioning table | `brickos-ai` crate's config pattern + app-local `prompt_versions` table |
| Standalone Prometheus/Loki | BrickOS observability baseline (design 011) |
| Spec-level "module boundary" | BrickOS app pattern: `apps/finance/sovereign-oracle/{api,frontend,ops}` |

We also **extend** beyond the spec in three directions: Polymarket auto-trading (§7), NOSTR NIP alignment (§8), and a cross-app signal bus linking Oracle to SHI (stress → trading bias) and Sovereign Voice (publish signal rationale as long-form content).

---

## 2. Pillar Placement: Finance (`apps/finance/sovereign-oracle/`)

Oracle belongs to the **Finance pillar** alongside BTC Tracker, Sovereign Exchange, Sovereign Vote, and Cashu Mint. It answers the Finance question: *"Can I generate and act on market intelligence without custody of my data or my analysis leaking to a third party?"*

Note on naming: "Sovereign Signal" already occupies the Attention pillar in the stack diagram (001). "Sovereign Oracle" captures the predictive, signal-intelligence nature without colliding.

```
apps/
  finance/
    btc-tracker/                  # portfolio tracking (planned)
    sovereign-exchange/           # bitcoin exchange (planned)
    cashu-mint/                   # ecash mint (planned)
    sovereign-oracle/             # NEW -- signal intelligence + policy-aware trading
      api/
        src/
          main.rs
          config.rs
          handlers/
            harvesters/           # one module per source (rpc, mempool, etf, macro)
            signals.rs
            simulations.rs
            publish.rs            # nostr + op_return
            polymarket.rs         # prediction-market integration
          services/
            harvester.rs
            classifier.rs         # brickos-ai wrapper
            montecarlo.rs
            backtester.rs
            policy.rs             # decides WHEN to act on a signal
          models/
        migrations/
        tests/
      frontend/
        src/app/
          dashboard/              # signal feed + regime label
          signals/[id]/           # signal drill-down
          simulations/            # price-path viewer
          journal/                # trades + P&L analytics
          markets/                # polymarket positions
          proof/                  # public, NOSTR-sourced
      ops/
        deploy.sh
        docker-compose.prod.yml
```

**App slug:** `sovereign-oracle` · **Prefix:** `bsi` (matches DOC-BSI-001) · **Port:** 8088 prod / 8089 staging · **DB:** `bsi`

---

## 3. Feature Overview

### 3.1 Harvester (§1.1 of spec, retained verbatim)

- FR-H-001 Bitcoin Core RPC (mempool, fee histogram, large-UTXO movement, threshold 10 BTC default)
- FR-H-002 Exchange flows (Binance/Coinbase/Kraken; ≥ 500 BTC/hour = bearish flag)
- FR-H-003 Miner signals (hash rate ± 15% MA, difficulty forecast, miner-wallet outflows)
- FR-H-004 Spot ETF flows (IBIT, FBTC, ARKB)
- FR-H-005 Macro feeds (DXY, US10Y, Fed funds futures) `SHOULD`
- FR-H-006 Social sentiment (NOSTR subscription + X keyword filter) `SHOULD`
- FR-H-007 Lightning Network health (channel open/close, capacity delta) `COULD`

### 3.2 AI Classifier (§1.2, retained)

- FR-AI-001 Sovereign-first inference: local Ollama, Claude fallback gated on confidence threshold `0.72` + logged consent
- FR-AI-002 Structured `SignalRecord` with `prompt_version_id`
- FR-AI-003 Signal cluster aggregation (4h windows, conflict-aware confidence discount)
- FR-AI-004 Rolling regime label: `bull_trend | bear_trend | accumulation | distribution | choppy`
- FR-AI-005 Prompt versioning: every classification references `prompt_versions.id` for back-test reproducibility

### 3.3 Simulation Engine (§1.3, retained)

- FR-SIM-001 Monte Carlo ≥ 10k iterations per cluster, 24h/3d/7d horizons, p10/median/p90 paths + max drawdown distribution
- FR-SIM-002 Rolling 90-day back-test calibration; weight changes proposed then applied on user review
- FR-SIM-003 `TradingSignal` decision surface: `long | short | hold | reduce` + entry range + invalidation + R:R
- FR-SIM-004 Volatility regime input from Deribit public API; auto-reduces position size in high-IV regimes

### 3.4 NOSTR Publication (§1.4, retained + aligned with NIPs)

- FR-PUB-001 Publish each approved `TradingSignal` as kind `30078` (see §8 for NIP mapping)
- FR-PUB-002 Outcome events on trade close: original event ID + realized P&L + `proof_of_accuracy` score
- FR-PUB-003 Optional monthly OP_RETURN batch commit of signal-cluster SHA-256 digest
- FR-PUB-004 Public `/proof` route, NOSTR-sourced, no DB dependency for external verification

### 3.5 Trade Journal (§1.5, retained)

- FR-TJ-001 Manual trade entry with optional `TradingSignal` linkage
- FR-TJ-002 P&L analytics in PostgreSQL: equity curve, win rate, avg winner/loser, max consecutive losses, Sharpe

### 3.6 Polymarket Integration (NEW -- see §7)

- FR-PM-001 Optional connection to Polymarket CLOB API; lists BTC-relevant markets (price-above-X, halving outcome, ETF-flow streaks)
- FR-PM-002 Trend → market mapping engine: given a `TradingSignal`, identify which live Polymarket conditions align, with an expected edge estimate
- FR-PM-003 Policy-gated auto-execution: a `Policy` object declares per-user limits (max-USDC-per-market, daily notional cap, kill switch) and only signals passing policy + confidence floor can auto-place orders
- FR-PM-004 Every fill is logged as a `market_position` row AND published as a NOSTR outcome event, extending the verifiable track record to prediction-market P&L

### 3.7 Cross-App Integration (NEW)

- **SHI → Oracle**: HRV / sleep / stress biomarkers feed a "biometric trading gate" -- refuse new entries when recovery score is below threshold. Preserves capital during physiological bad days. Toggleable, off by default.
- **Oracle → Sovereign Voice**: approved `TradingSignal.rationale` can be auto-scheduled as a long-form NOSTR note (NIP-23) through Sovereign Voice's scheduler. Signal publishing becomes content creation.
- **Oracle → Sovereign CRM**: counterparty awareness -- if an exchange flow signal references a desk the user is in contact with (via CRM), surface the relationship context on the signal.

---

## 4. Core Data Model

### 4.1 Tables (condensed; spec §2 is normative for fields)

```sql
-- schema: bsi (owned by AppPool; references brickos.users via platform FK)

CREATE TABLE prompt_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  name          TEXT NOT NULL,                -- e.g. "classifier_v3_regime_aware"
  template      TEXT NOT NULL,
  model_hint    TEXT,                         -- e.g. "llama3.1:8b", "claude-opus-4-7"
  active        BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE signal_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  harvested_at  TIMESTAMPTZ NOT NULL,
  source_type   TEXT NOT NULL,                -- on_chain|miner|etf|macro|sentiment|lightning
  raw_payload   JSONB NOT NULL,
  direction     SMALLINT,                     -- +1 / 0 / -1
  magnitude     NUMERIC(4,2),                 -- 0.00-10.00
  confidence    NUMERIC(4,3),                 -- 0.000-1.000
  time_horizon  TEXT,                         -- intraday|swing|macro
  rationale     TEXT,
  prompt_ver_id UUID REFERENCES prompt_versions(id),
  cluster_id    UUID REFERENCES signal_clusters(id)
);

CREATE TABLE signal_clusters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  window_start  TIMESTAMPTZ NOT NULL,
  window_end    TIMESTAMPTZ NOT NULL,
  regime_label  TEXT,                         -- bull_trend|bear_trend|accumulation|distribution|choppy
  composite     NUMERIC(4,3),
  uncertainty   NUMERIC(4,3)
);

CREATE TABLE trading_signals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id      UUID REFERENCES signal_clusters(id),
  created_at      TIMESTAMPTZ NOT NULL,
  action          TEXT NOT NULL,              -- long|short|hold|reduce
  entry_low       NUMERIC,
  entry_high      NUMERIC,
  invalidation    NUMERIC,
  rr_ratio        NUMERIC(5,2),
  sim_p10         NUMERIC,
  sim_p90         NUMERIC,
  nostr_event_id  TEXT,
  published_at    TIMESTAMPTZ,
  status          TEXT DEFAULT 'draft'        -- draft|published|closed
);

CREATE TABLE trades (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id       UUID REFERENCES trading_signals(id),
  exchange        TEXT NOT NULL,
  side            TEXT NOT NULL,              -- buy|sell
  size_btc        NUMERIC(16,8) NOT NULL,
  entry_price     NUMERIC(18,2) NOT NULL,
  exit_price      NUMERIC(18,2),
  fees_usd        NUMERIC(12,2) DEFAULT 0,
  opened_at       TIMESTAMPTZ NOT NULL,
  closed_at       TIMESTAMPTZ,
  pnl_usd         NUMERIC(14,2) GENERATED ALWAYS AS
                    ((COALESCE(exit_price,0) - entry_price)
                     * size_btc * CASE side WHEN 'sell' THEN -1 ELSE 1 END
                     - fees_usd) STORED
);

CREATE TABLE market_positions (                -- polymarket
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id       UUID REFERENCES trading_signals(id),
  venue           TEXT NOT NULL DEFAULT 'polymarket',
  market_id       TEXT NOT NULL,              -- polymarket condition id
  outcome_id      TEXT NOT NULL,              -- YES|NO token id
  size_usdc       NUMERIC(14,6) NOT NULL,
  entry_price     NUMERIC(6,4) NOT NULL,      -- 0.0000-1.0000
  exit_price      NUMERIC(6,4),
  opened_at       TIMESTAMPTZ NOT NULL,
  closed_at       TIMESTAMPTZ,
  resolution      TEXT,                       -- yes|no|invalid|pending
  policy_id       UUID REFERENCES policies(id),
  pnl_usdc        NUMERIC(14,6)
);

CREATE TABLE policies (                        -- governs auto-execution
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,              -- references brickos.users (cross-schema FK)
  kind            TEXT NOT NULL,              -- polymarket|manual_review|notify_only
  min_confidence  NUMERIC(4,3) NOT NULL,      -- signal confidence floor
  max_per_market  NUMERIC(14,6),              -- USDC cap per market
  daily_cap       NUMERIC(14,6),              -- USDC cap per 24h
  enabled         BOOLEAN NOT NULL DEFAULT false,
  kill_switch_at  TIMESTAMPTZ                 -- manual kill until this time
);

CREATE TABLE nostr_events (                    -- audit trail of what we published
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            INT NOT NULL,               -- 30078, 1, 30023, etc.
  event_id_hex    TEXT UNIQUE NOT NULL,
  references_id   UUID,                       -- signal or trade being referenced
  relays_hit      TEXT[] NOT NULL,
  published_at    TIMESTAMPTZ NOT NULL
);

CREATE TABLE consents (                        -- FR-AI-001 remote-inference consent log
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  granted_at      TIMESTAMPTZ NOT NULL,
  scope           TEXT NOT NULL,              -- e.g. "claude_fallback:signal:<uuid>"
  redacted_hash   TEXT                        -- hash of payload sent off-host
);
```

### 4.2 Key invariants

- `signal_records.prompt_ver_id` is `NOT NULL` for any row produced by AI (back-test reproducibility).
- `trading_signals.status = 'published'` implies `nostr_event_id IS NOT NULL`.
- `market_positions.policy_id` is `NOT NULL` for auto-executed positions (who authorised this order).
- Every remote-LLM call writes one `consents` row before the network call.

---

## 5. Tech Stack Mapping

| BSI spec requirement | BrickOS primitive |
|---|---|
| Rust harvester service | Axum/actix app in `apps/finance/sovereign-oracle/api/`, trait-based source plugins |
| PostgreSQL signal store | `brickos-db` two-pool pattern; AppPool owns `bsi` schema |
| Local Ollama + remote LLM fallback | `brickos-ai` crate (AI-agnostic: Anthropic / OpenAI / Ollama / local) |
| Prompt versioning | App-local `prompt_versions` table; `brickos-ai` consumes config only |
| Per-field encryption for keystore | `brickos-crypto` Encryptor, `v1:{iv}:{ciphertext}` format |
| NOSTR signing + relay publishing | New `brickos-nostr` crate (§8) -- new shared crate; also consumable by Sovereign Voice |
| Alerting (dead feed, drift) | `brickos-notify` (ntfy.sh / Telegram / email provider factory) |
| JWT auth | `brickos-auth` crate |
| Observability | Prometheus metrics + Grafana (design 011) |
| CI | `.github/workflows/ci-sovereign-oracle.yml` (scaffold gap, see §10) |
| Release | `.github/workflows/release.yml` + `docs/releases/sovereign-oracle/` (design 023-release convention, scaffold step 6) |

### 5.1 New shared crate: `brickos-nostr`

NOSTR usage shows up in three places today: Sovereign Voice (scheduler), proposed Oracle (signal publishing), and planned Sovereign Identity (NIP-98 auth). Building a shared crate now prevents three divergent implementations.

- `pub struct NostrClient { secret_key: SecretKey, relays: Vec<Url> }`
- `pub enum EventKind { ShortNote = 1, LongForm = 30023, ParameterizedReplaceable = 30078, AppSpecificAuth = 27235, ... }`
- `fn publish(&self, event: NostrEvent) -> Result<Vec<RelayAck>>`
- `fn subscribe(&self, filter: Filter) -> Stream<NostrEvent>`
- Serialisation, secp256k1 signing, and bech32 encoding (nsec/npub) live here, not per app.

This is the **most reusable** spin-off of the Oracle project -- argues for building it early and moving Sovereign Voice onto it in a follow-up sprint.

---

## 6. Scaffolding: What Works, What's Missing

### 6.1 What `scaffold-app.sh` gives us for free

```bash
bash ops/scaffold-app.sh sovereign-oracle bsi finance 8088 "Sovereign Oracle"
```

Emits in seconds:
- Full Rust API tree with `brickos-*` deps wired, two-pool init, auth stubs, migration folder
- Next.js frontend with dark theme, EN/DE i18n, login/signup/dashboard/settings pages
- Docker Compose (dev, staging, prod) + deploy.sh
- `docs/releases/sovereign-oracle/README.md` (after the sprint-043 release-automation change)

### 6.2 Gaps Oracle will expose

| Gap | Impact | Proposed fix |
|---|---|---|
| **No CI workflow template.** `.github/workflows/ci-{app}.yml` is still hand-created. Oracle will need one. | Every new app is a copy-paste session. | Add `ops/scaffold-templates/github-workflows/ci.yml.tmpl`; scaffold step 9 renders to `.github/workflows/ci-${APP_NAME}.yml`. |
| **No migration seed.** `migrations/.gitkeep` is empty; first real migration is always hand-written. | Every new app wastes 10 minutes on boilerplate. | Add `ops/scaffold-templates/api/migrations/0001_init_schema.sql.tmpl` that creates the app schema + grants. |
| **No source-plugin trait.** Oracle needs a pluggable harvester trait (Bitcoin, ETF, macro); CRM had its own ingestion abstraction; Voice had relay plugins. Three apps, three re-inventions. | Trait drift, inconsistent retry/circuit-breaker behaviour. | Promote to `brickos-plugins` crate: `trait SignalSource { fn id() -> &'static str; async fn poll() -> Vec<RawSignal>; }` with shared circuit-breaker and Prometheus-counter mixin. |
| **No NOSTR key vault pattern.** Each NOSTR-using app will re-invent secret storage. | Inconsistent protection, hard to rotate. | `brickos-nostr` crate owns the keystore; uses `brickos-crypto` internally. Scaffold template wires it when the app declares `--features=nostr`. |
| **No "external-service simulator" harness.** BSI harvesters call Bitcoin Core, Glassnode, Polymarket. Without a shared mock harness, integration tests become flaky, paid, or both. | Test coverage collapses around external I/O. | Add `crates/brickos-testing/` with trait-mockable HTTP clients and a fixture bank (mempool JSON, CLOB snapshots). Reusable across all apps. |
| **Scaffold assumes SaaS shape.** Oracle is a power-user workstation tool that will see 1 user, ~100M rows, long-running compute. Scaffold defaults (3 replicas, small DB pool, short HTTP timeouts) are wrong. | Hand-edit production config. | Scaffold flag `--profile=power-user` (or `--profile=saas`) selecting a tuned Docker/Postgres/nginx template set. |

### 6.3 Scaffolding improvement priority

If we only ship two improvements before Oracle starts: **the CI workflow template** (saves a whole ceremony) and **the migration seed** (zero good reason to hand-write `0001_init.sql` 10 times).

---

## 7. Polymarket: Automated Trading on Calculated Trends

### 7.1 Why Polymarket

BSI's `TradingSignal` asserts *"BTC directionally bullish, 24h horizon, confidence 0.81"*. A spot or derivatives exchange can act on that, but at a cost: exchange KYC, custody, regulatory posture. Polymarket is qualitatively different:

- **Prediction markets are CDF-shaped, not continuous.** Each market is a binary question ("Will BTC close above $X on YYYY-MM-DD?"). The *shape* of our directional signal maps cleanly onto the *shape* of a resolution question.
- **USDC on Polygon.** No fiat rails, no exchange custody, user-held wallet via private key.
- **Open CLOB API.** Order placement is programmatic and rate-limited rather than gated by partnership.
- **Resolution is deterministic.** On-chain or oracle-reported; settles automatically. No "trade closed with my broker" ambiguity.

### 7.2 Mapping engine (`services/policy.rs`)

```text
    TradingSignal (action=long, confidence=0.81, horizon=24h)
        │
        ▼
    candidate-market query  ──────► Polymarket CLOB API
        │                            "BTC > $X by YYYY-MM-DD"
        │                            active, with >T USDC liquidity
        ▼
    edge estimator          ──────► for each market, compute:
        │                            implied_prob (CLOB mid)
        │                            vs signal direction/confidence
        │                            expected edge (%)
        ▼
    policy filter           ──────► drop markets that:
        │                            - fail min_confidence
        │                            - exceed per-market or daily cap
        │                            - resolve outside signal horizon
        │                            - have insufficient depth
        ▼
    order placer            ──────► CLOB order; record market_position;
        │                            publish NOSTR outcome placeholder
        ▼
    settlement watcher      ──────► on resolution: update market_position,
                                     publish NOSTR outcome with P&L
```

### 7.3 Risks specific to prediction-market execution

| Risk | Mitigation |
|---|---|
| **KYC/jurisdiction**: Polymarket blocks US IPs; EU access varies by product line. | User's problem; we surface venue availability in the `markets/` UI and refuse to auto-enable in blocked regions. |
| **Market illiquidity**: small markets = big slippage. | Edge estimator requires min-depth gate (configurable); default 5× order size. |
| **Resolution risk**: contested oracles, ambiguous wording. | `markets/[id]` detail view shows resolution source and history; auto-execute is opt-in per market category. |
| **Capital lockup**: USDC tied up until resolution. | Daily-cap policy prevents cascading allocation; dashboard shows current locked vs liquid USDC. |
| **Regulatory drift**: prediction-market legality evolves fast. | `Policy.kill_switch_at` timestamp can disable all automation globally until manually re-enabled. |
| **Model overconfidence feedback**: auto-trades reinforce the model's recent bias. | Post-trade outcomes feed back into back-test calibration (FR-SIM-002); large drawdown automatically trips kill switch. |

### 7.4 What we do NOT do

- No auto-trading on centralised spot or futures exchanges in v1. Polymarket only. The reason: we want a clean integration story where the entire flow (signal → market → resolution → outcome) is observable and largely deterministic.
- No margin, leverage, or options. Binary outcome, pre-funded USDC only.
- No auto-placement without an active `Policy` record with `enabled=true` and a user-signed confirmation within the last 30 days.

---

## 8. NOSTR Integration: NIPs and Search Terms

### 8.1 NIPs we implement

| NIP | Purpose in Oracle | Google search term |
|---|---|---|
| NIP-01 | Base event structure, signing, serialisation | `NIP-01 NOSTR event structure spec` |
| NIP-09 | Event deletion requests (for withdrawing a signal that was wrong) | `NIP-09 NOSTR event deletion` |
| NIP-19 | bech32 entities (`nsec`, `npub`, `note`, `nevent`) used in vault + URLs | `NIP-19 bech32 NOSTR entities` |
| NIP-23 | Long-form content for `rationale` posts + `/proof` explanations | `NIP-23 long-form content NOSTR` |
| NIP-26 | Delegated event signing (future: org-delegated signal publishing) | `NIP-26 delegated event signing NOSTR` |
| NIP-33 → 30078 | Parameterised replaceable events: the core `SignalRecord` kind per spec FR-PUB-001 | `NIP-33 parameterized replaceable events kind 30078` |
| NIP-42 | Authenticated relay access (private relay publishing for paying tiers) | `NIP-42 client authentication NOSTR` |
| NIP-44 | Encrypted payloads (future: private signal tiers) | `NIP-44 versioned encryption NOSTR` |
| NIP-57 | Zaps (future: tip-for-signal monetisation path) | `NIP-57 lightning zaps NOSTR` |
| NIP-65 | Relay list metadata; lets `/proof` consumers discover our relays | `NIP-65 relay list metadata NOSTR` |
| NIP-98 | HTTP auth using NOSTR key (same keypair logs into Oracle + signs signals) | `NIP-98 HTTP auth NOSTR` |

General references for implementers:
- `nostr NIPs repository github` -- the master list at `github.com/nostr-protocol/nips`.
- `nostr relay specification how relays work` -- useful for understanding relay selection.
- `rust-nostr crate docs` -- reference Rust SDK (we will re-implement a minimal core in `brickos-nostr`; rust-nostr as a compatibility reference).
- `nostr parameterized replaceable event lifecycle` -- how replaceable events behave on relay refresh.
- `secp256k1 schnorr signature bitcoin nostr` -- signing primitives shared with Bitcoin.

### 8.2 Event kinds we emit

| Kind | When | Tag structure |
|---|---|---|
| `30078` | Signal publication (FR-PUB-001) | `["d", "<signal_id>"]`, `["bsi", "signal"]`, `["p", <user_npub>]`, content = signed JSON of `TradingSignal` |
| `30078` | Outcome publication (FR-PUB-002) | `["d", "<signal_id>:outcome"]`, `["e", <original_event_id>]`, `["bsi", "outcome"]`, content = P&L + proof_of_accuracy |
| `30023` | Long-form rationale, optionally through Sovereign Voice scheduler | `["t", "bitcoin"]`, `["t", "signals"]`, `["e", <signal_event_id>]` |
| `1` | Short announcement ("new signal published: <nevent>") | Typical short-note tags + link via Sovereign Link |

### 8.3 /proof dashboard

Public, unauthenticated, read-only route. Consumers are browsers querying user-configurable relays. Zero Oracle-side DB reads.

- Filter: kind `30078` AND `["bsi", "signal"]` AND `["p", <user_npub>]`
- Correlate: match outcome events (`:outcome` suffix on `d` tag) to signal events
- Render: equity curve, win rate, avg R:R, histogram of `proof_of_accuracy`, leaderboard of source-types by contribution

The user can hand their nevent of `/proof` to anyone -- Polymarket counterparty, podcast host, potential subscriber. Verification does not require trusting us.

---

## 9. Drawbacks, Risks, and Honest Limitations

### 9.1 Product risks

1. **Signal quality is a hardware ceiling**, not a code problem. A small local Ollama model doing macro classification will underperform even a modest remote LLM at this task. The sovereignty win (no data off-host) is real; the accuracy cost is real too. Must be communicated; cannot be engineered away.
2. **Back-test overfitting**: 90-day rolling weight calibration can happily overfit to the recent regime. When regime changes (bull → bear transition), the recently-calibrated weights are *worse* than a naive equal-weighted baseline. Need a regime-stability guard on the calibration loop.
3. **Publishing losers is emotionally hard**; publishing only winners is what every grifter does. The protocol makes this transparent, but users may quietly disable outcome publishing to save face, invalidating `/proof`. Design response: outcome publishing is opt-in per signal *at signal time*, not post-hoc. Opting out at publish time is a visible gap in the track record.
4. **Polymarket is a regulated, evolving venue**. Oracle should not become a wrapper that hides the user's exposure. Every auto-trade needs a clear trail, a kill switch, and opt-in per jurisdiction.
5. **Model-drift feedback loop**: outcomes feed back into calibration feed back into position sizing. A losing streak can self-reinforce if calibration reduces confidence below the auto-trade threshold, silently disabling the system at the worst time.

### 9.2 Technical risks

1. **Bitcoin Core RPC availability** is not a commodity. Not every user runs a full node. Degraded-mode harvesters (public API fallback) should be explicit and lower-weighted.
2. **Glassnode free-tier** is thin; paid tier is expensive; self-hosted alternatives (mempool.space, Electrum) cover some but not all data points. The harvester's dependency graph needs to be honest about what drops out without paid data.
3. **Monte Carlo runtime** (≥ 10k iterations per cluster) scales poorly if cluster volume spikes. Need a queue + adaptive iteration count, not a hard floor that causes harvester back-pressure.
4. **Cross-schema FKs** (`bsi.policies.user_id` → `brickos.users.id`) are fragile; the two-pool split is our own choice, not Postgres's. Need a pattern documented in design 018 for how apps reference platform users without breaking isolation guarantees.
5. **NOSTR relay reliability**: publishing to a single relay means your track record vanishes if that relay disappears. Need minimum-diversity publish (e.g. 5 independent relays) + periodic re-broadcast.

### 9.3 What the architecture is NOT trying to solve

- Not HFT, not sub-second execution, not market-making. Minimum actionable horizon is intraday (hours).
- Not a portfolio manager. The trade journal tracks P&L but does not rebalance.
- Not a tax tool. Export to CSV/JSON; downstream tooling handles tax.
- Not a recommendation service for other users' signals. Each user's Oracle instance is independent. Relays enable voluntary discovery; Oracle does not aggregate third-party signal feeds into its own decision surface.

---

## 10. Innovative Approaches Worth Considering

These go beyond the source spec and are listed as *design-space probes* -- each is a candidate for v1.x or a separate design doc.

### 10.1 Biometric trading gate (Oracle × SHI)

Refuse new entries when the user's recent SHI data indicates poor recovery (low HRV, short sleep, high resting HR). A `body_override` policy type sits alongside `polymarket` and `manual_review`. Trades get a pre-execution "you slept 4 hours last night; confirm?" block.

**Innovative because**: this is the first health-data-gated trading system anyone runs. It uses existing BrickOS primitives (SHI biomarker API + Oracle policy engine) to make this 2 days of integration work, not 2 months.

### 10.2 Cryptographic hedge commitment

Before placing a trade, publish a NOSTR event that *pre-commits* to a position size and stop. The event is published before order placement; actual order confirms to the committed values. Reduces the "I'll move my stop in a panic" failure mode: the commitment is public, and lying about it leaves a cryptographic mismatch visible on `/proof`.

**Innovative because**: pre-commitment devices are a known behavioural-economics tool. Pinning them to NOSTR + public verification makes them cryptographic, not psychological.

### 10.3 Counterparty discovery via NOSTR

A Polymarket market has counterparties. Oracle could query NOSTR for known npubs on the other side of a market (filter: kind `30078` on the same `d` tag, opposite direction) and display this as context: *"the counterparties on this market include 3 npubs with historical `/proof` scores of 0.62, 0.71, 0.58"*. Not automation -- just context.

**Innovative because**: prediction markets are informationally thin. A decentralised view of "who else is taking this trade, and how good are they at this" is a NOSTR-native feature no existing platform offers.

### 10.4 Prompt marketplace

Prompt versioning is already in the spec. Extend: the `prompt_versions` table can export/import signed prompt bundles (NIP-23 long-form with a JSON payload). A user can try another user's prompt on their own harvested data. Improves prompts faster than one person's iterations.

**Innovative because**: it turns prompt engineering into a reputation-bearing, NOSTR-native activity. Good prompt writers accumulate npub reputation the same way good signal callers do.

### 10.5 On-chain outcome reconciliation

For crypto-native trades (Polymarket, BTC DEXs), the outcome is already on-chain. Oracle can reconstruct P&L by reading chain data, not trusting the exchange's report. The `proof_of_accuracy` score becomes closer to a mathematical fact than a self-report.

**Innovative because**: every other trading journal trusts exchange output. An on-chain reconciler is, as far as we know, unprecedented for retail-scale tooling.

### 10.6 "Offline Oracle" degraded mode

If harvester feeds die (Bitcoin Core, Glassnode, Deribit all unreachable), Oracle does not crash. It switches to a `degraded` regime label, refuses new signals, and publishes a NOSTR "oracle-offline" heartbeat so `/proof` viewers know the pause is real, not convenient.

**Innovative because**: aligned with BrickOS's general "graceful degradation" posture and provides integrity guarantees around absence-of-signal, not just presence.

---

## 11. Implementation Phases

Aligned with the spec's 12-week roadmap, adjusted for BrickOS integration work.

### Phase 1 -- Foundation (Weeks 1-3)

- Run scaffold: `bash ops/scaffold-app.sh sovereign-oracle bsi finance 8088 "Sovereign Oracle"`
- Bitcoin Core RPC harvester (FR-H-001)
- `prompt_versions`, `signal_records`, `signal_clusters` migrations
- Ollama classifier via `brickos-ai` + prompt v1
- Basic Next.js signal-feed UI under `dashboard/`
- **New**: `brickos-nostr` crate bootstrapped (keystore + signer + publish; no subscribe yet)

### Phase 2 -- Signal Breadth (Weeks 4-6)

- Exchange flow adapter (FR-H-002)
- Miner signal adapter (FR-H-003)
- ETF flow adapter (FR-H-004)
- Macro feed adapter (FR-H-005) `SHOULD`
- Signal cluster aggregator (FR-AI-003)
- Regime classifier (FR-AI-004)
- **Scaffold improvement**: CI workflow template merged; `ci-sovereign-oracle.yml` generated not hand-written

### Phase 3 -- Simulation & Journal (Weeks 7-9)

- Monte Carlo engine (FR-SIM-001)
- Back-test calibration loop (FR-SIM-002)
- Decision-surface `TradingSignal` output (FR-SIM-003)
- Trade journal UI + P&L analytics (FR-TJ-001, FR-TJ-002)
- NOSTR signal + outcome publishing (FR-PUB-001, FR-PUB-002)
- **New**: `brickos-plugins` crate extracted; harvesters refactored onto shared `SignalSource` trait

### Phase 4 -- Proof, Polymarket, Polish (Weeks 10-12)

- Public `/proof` dashboard (FR-PUB-004)
- OP_RETURN monthly batch (FR-PUB-003) `COULD`
- Polymarket CLOB integration: read-only first (FR-PM-001, FR-PM-002)
- Policy engine + kill switch (FR-PM-003)
- Auto-execution on approved policies (FR-PM-004)
- Observability (Prometheus, Grafana dashboards)
- Sovereign Voice cross-app: rationale → long-form scheduler
- `brickos-testing` crate bootstrapped; Bitcoin Core + CLOB mock harness shipped

### Phase 5 -- Innovative track (post-v1)

One per sprint, scoped via separate design doc stubs:
- SHI biometric trading gate
- Cryptographic hedge commitment
- Counterparty discovery
- Prompt marketplace
- On-chain outcome reconciliation
- Offline-Oracle degraded mode

---

## 12. Open Questions

1. **Name collision**: "Sovereign Oracle" vs. future Bitcoin-oracle infrastructure. Alternative: `sovereign-scribe`? `bitcoin-signal`? Decision before scaffold.
2. **Licensing tier**: does this app justify a paid tier in `brickos-licensing`? Polymarket auto-execution behind a paid tier could be justifiable; signal-only stays free.
3. **Multi-user tenancy**: signals are per-user today. Do we support team/org-shared signal streams (white-label, same pattern as SHI in design 021)? Design decision before cross-schema FK pattern is set.
4. **NOSTR key rotation**: if a user rotates their key, the historical `/proof` track record lives at the old key. Cross-link via NIP-65 relay list? Or accept track-record starts fresh per key?
5. **Back-test calibration approval**: spec says "applied only after user review". What is the UX for this? A weekly digest? A notification? Silent if delta < 5%?
6. **Polymarket jurisdiction gating**: auto-detect (IP + wallet region) vs. self-declared? Probably self-declared with a disclaimer, but worth a legal review.
7. **Scaffold `--profile=` flag**: worth the complexity or should power-user vs. SaaS tuning be hand-edited per app? Oracle is the first power-user-profile app; future ones will tell us if this is worth generalising.
8. **`brickos-nostr` vs. existing Sovereign Voice NOSTR code**: do we extract now and migrate Voice, or ship Oracle with its own NOSTR module and unify later? Extraction first is slower but avoids a second rewrite.

---

## 13. Acceptance Criteria (Draft)

Oracle v1.0 ships when:

- [ ] Scaffold run completes; app responds on `:8088/health` with version
- [ ] All spec MUSTs in §1 implemented and integration-tested
- [ ] Signal → cluster → simulation → NOSTR publish path works end-to-end on staging
- [ ] `/proof` dashboard renders a verifiable track record from NOSTR relays alone (no DB)
- [ ] Polymarket read-only market listing + edge estimator work on mainnet; write path gated by opt-in policy
- [ ] `brickos-nostr` extracted; Sovereign Voice migration path documented
- [ ] CI workflow template merged; Oracle CI generated not hand-written
- [ ] Deploy staging + production via existing `deploy.sh` pattern
- [ ] Release via `.github/workflows/release.yml` on `sovereign-oracle/v1.0.0` tag push
- [ ] All NFRs in spec §3 verified (harvester cycle < 60s, AI < 8s local, MC < 4s, dashboard P95 < 400ms, NOSTR publish RTT < 2s)

---

*Sovereign Oracle · DOC-BSI-001 mapped to BrickOS · Draft v0.1 · April 2026*
