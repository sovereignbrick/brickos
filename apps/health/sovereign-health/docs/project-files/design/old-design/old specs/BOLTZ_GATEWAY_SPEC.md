# Boltz Payment Gateway Specification

**Epic:** E-06 Payment Integration
**Task:** T-0420 (Backlog)
**Priority:** MEDIUM (after Strike + Stripe are abstracted)
**Dependencies:** T-0410 (Gateway Abstraction Layer)

---

## Overview

Boltz is a non-custodial submarine swap service. It enables receiving Lightning payments and settling to on-chain BTC or Liquid BTC without running a Lightning node. This makes it an ideal fallback/alternative to Strike for Bitcoin payments.

### Why Boltz?

| Feature | Strike | Boltz |
|---|---|---|
| Lightning receive | Yes | Yes |
| On-chain BTC payout | Yes | Yes |
| Liquid payout | No | Yes |
| Custodial | Yes (Strike holds funds) | No (atomic swaps) |
| KYC required | Yes (Strike account) | No |
| Self-custody | No | Yes |
| Node required | No | No |
| Availability | US + limited regions | Global |
| Fees | ~1% | ~0.1-0.5% |

**Use cases for Sovereign Health:**
1. **Primary:** Fallback when Strike is down or unavailable
2. **Future:** Preferred gateway for full self-custody (no counterparty risk)
3. **Future:** Liquid settlement for faster batching and lower fees

---

## Architecture

```
User selects BTC payment
 ↓
PaymentRouter checks active BTC gateway
 ↓
If Boltz:
  Backend calls Boltz API (create reverse swap)
  ↓
  Boltz returns Lightning invoice
  ↓
  Frontend displays invoice QR + amount
  ↓
  User pays Lightning invoice
  ↓
  Boltz detects payment (WebSocket event)
  ↓
  Boltz broadcasts BTC/Liquid to our address
  ↓
  Backend confirms on-chain settlement
  ↓
  Subscription activated
```

---

## Implementation: BoltzGateway

### Config (environment variables)

```env
BOLTZ_API_URL=https://api.boltz.exchange
BOLTZ_PAYOUT_ADDRESS=bc1q...          # On-chain BTC address for payouts
BOLTZ_LIQUID_ADDRESS=                   # Optional: Liquid address for L-BTC payouts
BOLTZ_PREFERRED_CHAIN=btc              # "btc" or "liquid"
BOLTZ_MIN_CONFIRMATIONS=1             # Required confirmations before marking paid
```

No API key needed. Boltz is permissionless.

### Struct

```rust
// src/payments/boltz_gateway.rs

pub struct BoltzGateway {
    api_url: String,
    payout_address: String,
    liquid_address: Option<String>,
    preferred_chain: String,       // "btc" or "liquid"
    min_confirmations: u32,
    http_client: reqwest::Client,
}

#[async_trait]
impl PaymentGateway for BoltzGateway {
    fn id(&self) -> GatewayId { GatewayId::Boltz }

    fn supports(&self, currency: &PaymentCurrency) -> bool {
        matches!(currency, PaymentCurrency::Lightning | PaymentCurrency::BtcOnchain)
    }

    async fn create_checkout(&self, req: CheckoutRequest) -> Result<CheckoutResponse> {
        // 1. Convert EUR amount to sats (use exchange rate API)
        // 2. Call Boltz createswap
        // 3. Return Lightning invoice
    }

    // Boltz doesn't do subscriptions - each payment is one-shot
    async fn cancel_subscription(&self, _: &str) -> Result<()> {
        Err(anyhow!("Boltz does not support recurring subscriptions"))
    }
    async fn reactivate_subscription(&self, _: &str) -> Result<()> {
        Err(anyhow!("Boltz does not support recurring subscriptions"))
    }
    async fn change_subscription(&self, _: &str, _: &str, _: &str) -> Result<()> {
        Err(anyhow!("Boltz does not support recurring subscriptions"))
    }
    async fn refund(&self, _: &str, _: Option<i64>) -> Result<String> {
        Err(anyhow!("Boltz payments are non-refundable (self-custody)"))
    }
    async fn get_invoice_pdf_url(&self, _: &str) -> Result<Option<String>> {
        Ok(None) // We generate our own receipt for BTC payments
    }

    async fn verify_webhook(&self, headers: &HeaderMap, body: &[u8]) -> Result<WebhookResult> {
        // Boltz uses WebSocket, not webhooks
        // This would be called from our WebSocket listener
        todo!()
    }
}
```

### Key Limitation

Boltz does **not** support recurring subscriptions. Each payment is a one-time swap. For BTC subscriptions:
- Prepaid periods (3/6/12 months) - user pays once, gets X months
- Manual renewal reminder before expiry
- This aligns with our existing "BTC via prepaid periods" decision

---

## API Integration Details

### 1. Get Swap Pairs (startup/periodic)

```
GET https://api.boltz.exchange/getpairs
```

Cache response (refresh every 5 min). Extract:
- Available pairs (`BTC/BTC`, `L-BTC/BTC`)
- Fee percentages
- Min/max swap amounts (in sats)

### 2. Create Reverse Submarine Swap

```
POST https://api.boltz.exchange/createswap

{
  "type": "reversesubmarine",
  "pairId": "BTC/BTC",           // or "L-BTC/BTC" for Liquid
  "orderSide": "buy",
  "invoiceAmount": <sats>,
  "onchainAddress": "<our_btc_address>"
}
```

Response:
```json
{
  "id": "swap-id",
  "invoice": "lnbc...",
  "redeemScript": "...",
  "timeoutBlockHeight": 840000,
  "lockupAddress": "bc1..."
}
```

Store: `swap_id`, `invoice`, `timeoutBlockHeight`, `lockupAddress`

### 3. Monitor Swap Status

**Option A: WebSocket (preferred)**
```
wss://api.boltz.exchange/v2/ws

Subscribe to swap updates:
{ "op": "subscribe", "channel": "swap.update", "args": ["<swap-id>"] }

Events:
{ "event": "swap.update", "id": "swap-id", "status": "invoice.paid" }
{ "event": "swap.update", "id": "swap-id", "status": "transaction.mempool" }
{ "event": "swap.update", "id": "swap-id", "status": "transaction.confirmed" }
```

**Option B: Polling (fallback)**
```
GET https://api.boltz.exchange/swapstatus?id=<swap-id>
```

Poll every 5 seconds until terminal state.

### 4. Status State Machine

```
swap.created → invoice.set → invoice.paid → transaction.mempool → transaction.confirmed
                                                                          ↓
                                                                    PAYMENT COMPLETE
                           swap.expired (timeout)
                                  ↓
                           PAYMENT FAILED
```

---

## Database: Boltz-Specific Tables

```sql
CREATE TABLE IF NOT EXISTS boltz_swaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id),
    user_id UUID NOT NULL REFERENCES users(id),
    boltz_swap_id VARCHAR(100) NOT NULL UNIQUE,
    swap_type VARCHAR(30) NOT NULL DEFAULT 'reversesubmarine',
    pair_id VARCHAR(20) NOT NULL,
    invoice TEXT NOT NULL,
    invoice_amount_sats BIGINT NOT NULL,
    onchain_address VARCHAR(200) NOT NULL,
    lockup_address VARCHAR(200),
    redeem_script TEXT,
    timeout_block_height BIGINT,
    status VARCHAR(30) NOT NULL DEFAULT 'swap.created',
    onchain_txid VARCHAR(100),
    settled_at TIMESTAMPTZ,
    expired_at TIMESTAMPTZ,
    fee_sats BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boltz_swaps_status ON boltz_swaps(status);
CREATE INDEX IF NOT EXISTS idx_boltz_swaps_user ON boltz_swaps(user_id);
```

---

## Frontend: Lightning Invoice Display

When Boltz is the active BTC gateway, the checkout shows:

```
┌─────────────────────────────────────────────┐
│  Pay with Bitcoin (Lightning)               │
│                                             │
│  Amount: 49,500 sats (~€24.99)              │
│  Discount: 5% applied                       │
│                                             │
│  ┌───────────────────────┐                  │
│  │                       │                  │
│  │    [QR CODE]          │                  │
│  │    (Lightning invoice)│                  │
│  │                       │                  │
│  └───────────────────────┘                  │
│                                             │
│  lnbc495000n1pj... [Copy]                   │
│                                             │
│  ● Waiting for payment...                   │
│  Expires in: 14:32                          │
│                                             │
│  Status: Awaiting Lightning payment         │
│  ──────────────────────────────             │
│  ○ Invoice created                          │
│  ○ Payment received                         │
│  ○ On-chain settlement                      │
│  ○ Subscription activated                   │
└─────────────────────────────────────────────┘
```

Real-time status updates via WebSocket from backend.

---

## Exchange Rate

For EUR → sats conversion:
- Use Boltz's own rate (embedded in swap creation response)
- Fallback: CoinGecko or Kraken API
- Cache rate for 60 seconds
- Show user the exact sats amount before they pay
- Lock rate for 15 minutes (swap expiry)

---

## Error Handling

| Scenario | Action |
|---|---|
| Swap expired (user didn't pay in time) | Mark payment as expired, show "Payment timed out" with retry button |
| Boltz API unreachable | Fall back to Strike if available, or show "BTC payments temporarily unavailable" |
| On-chain tx stuck in mempool | Wait (no action needed, Boltz handles it) |
| Swap amount below minimum | Show error "Minimum BTC payment is X sats" |
| Swap amount above maximum | Show error "Maximum single BTC payment is X sats, contact us for Horizon tier" |

---

## Security Considerations

1. **Verify swap ID** matches our records before processing
2. **Track timeout block height** - alert if approaching expiry
3. **Confirm on-chain settlement** before activating subscription (don't trust mempool alone for large amounts)
4. **Store redeem script** - needed if manual claim is ever required
5. **Rate limit swap creation** - prevent abuse (1 swap per user per 5 min)
6. **Address reuse** - generate fresh payout address per swap if using HD wallet

---

## Implementation Phases

### Phase 1: Basic Integration (T-0420)
- Implement `BoltzGateway` struct with `PaymentGateway` trait
- Create reverse swap for one-time payments
- WebSocket monitoring for payment status
- Frontend: Lightning invoice QR display
- Admin: enable/disable in gateway settings

### Phase 2: Liquid Support (T-0421, Icebox)
- Add Liquid payout option (L-BTC/BTC pair)
- Admin setting: preferred chain (BTC vs Liquid)
- Faster settlement times

### Phase 3: Auto-Failover (T-0422, Icebox)
- If Strike fails, auto-switch to Boltz
- Health monitoring with automatic fallback
- Admin notification on gateway switch

---

## Estimated Effort

| Phase | Tasks | Estimate |
|---|---|---|
| Phase 1 | 1 Claude Code prompt | Medium-Large |
| Phase 2 | 1 Claude Code prompt | Small |
| Phase 3 | 1 Claude Code prompt | Medium |

---

## Translations

- "Pay with Bitcoin (Lightning)" / "Mit Bitcoin bezahlen (Lightning)"
- "Waiting for payment" / "Warte auf Zahlung"
- "Payment received" / "Zahlung empfangen"
- "On-chain settlement" / "On-Chain-Abwicklung"
- "Subscription activated" / "Abonnement aktiviert"
- "Payment timed out" / "Zahlung abgelaufen"
- "Retry" / "Erneut versuchen"

Proper Umlaute. No emdashes.
