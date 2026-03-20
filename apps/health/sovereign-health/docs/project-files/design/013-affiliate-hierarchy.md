# Design: Affiliate Commission Hierarchy

**Issue:** Backlog
**Milestone:** Revenue / Affiliate System
**Status:** Draft
**Date:** 2026-03-19
**Related:** [012-enterprise-sso.md](012-enterprise-sso.md), [001-oauth-social-login.md](001-oauth-social-login.md)

## Problem

The current affiliate system supports a **2-level chain** only. This creates three structural problems:

### 1. BrickOS has no guaranteed revenue from affiliate referrals

BrickOS only earns Level 2 commission (2%) if it directly referred the clinic. If a clinic signs up organically or through a different channel, BrickOS earns nothing from that clinic's patient referrals. The platform that built, hosts, and maintains the entire system has no guaranteed participation in the referral economy it created.

### 2. The chain cuts off at patients

When a clinic (Level 1) refers a patient (Level 2), the chain is full. The patient receives an affiliate code on signup (every user does) but has no economic incentive to use it — their referrals would start a new chain where only they and their referrer (the clinic) earn. BrickOS gets nothing, and there's no room for deeper networks.

```
Current system (2 levels max):

BrickOS  →  Clinic  →  Patient  →  Patient's friend
  2%          20%        20%          (pays subscription)
                         ↑
                     Clinic gets 2% as parent
                     BrickOS gets NOTHING
```

### 3. No platform management fee

SaaS platforms that enable affiliate/referral programs universally take a platform cut. BrickOS provides the infrastructure (tracking, payouts, BTC rate locking, admin dashboard) but takes no guaranteed fee for operating it.

## Current System Summary

| Component | Current Implementation |
|---|---|
| Chain depth | 2 levels max (`referred_by` + `parent_referrer_id`) |
| Level 1 rate | 20% (2000 bps) — direct referrer |
| Level 2 rate | 2% (200 bps) — parent of referrer |
| Platform fee | None — BrickOS only earns if it's the direct parent |
| Code assignment | Automatic on signup (all users) |
| Affiliate eligibility | All users, no restrictions |
| Payout methods | EUR bank transfer, BTC on-chain |
| Minimum payout | €25.00 |
| Evaluation period | 30 days, then auto-approved |
| Key tables | `users.affiliate_code`, `users.referred_by`, `users.parent_referrer_id`, `affiliate_conversions`, `affiliate_payouts`, `affiliate_commission_rates` |

## Proposed Model: 3-Level Hierarchy + Platform Fee

### Commission structure

```
Level 0: BrickOS (Platform)     →  1% on ALL affiliate-driven subscriptions
Level 1: Clinic / Horizon org   →  20% direct referral commission
Level 2: Patient                →  Option A: disabled (no affiliate for patients)
                                   Option B: enabled at reduced rate (e.g., 10%)
```

### How it works

```
Scenario 1: Clinic refers Patient

  BrickOS (L0)  ←──  1% platform fee (always)
       │
  Clinic (L1)   ←── 20% commission
       │
  Patient (L2)  ←── pays subscription, earns nothing from this transaction
       │
  Patient uses affiliate? → See Option A vs B below
```

```
Scenario 2: Direct signup (no clinic)

  BrickOS (L0)  ←──  1% platform fee (if referred by anyone)
       │
  User A (L1)   ←── 20% commission (referred friend B)
       │
  User B (L2)   ←── pays subscription
```

### Level 0: BrickOS Platform Fee (1%)

BrickOS earns a **1% management fee** on every affiliate-driven subscription, regardless of who referred whom. This is not a referral commission — it's a platform fee for operating the affiliate infrastructure.

- Applied to every `affiliate_conversion` where a valid `referred_by` exists
- Always calculated, never zero
- Paid from the subscription revenue, not deducted from affiliate commissions
- BrickOS is identified by a reserved system affiliate code (e.g., `brickos0` or a special UUID)

**Revenue model:**
```
Patient pays €24.99/mo (Insight tier)
  → BrickOS platform fee: €0.25 (1%)
  → Clinic commission: €5.00 (20%)
  → BrickOS net from subscription: €24.99 - €0.25 - €5.00 = €19.74
```

### Level 1: Clinic / Referrer (20%)

Same as today's Level 1. The direct referrer earns 20% of the subscription amount. This is the primary incentive for clinics on Horizon/Horizon Enterprise tiers to recommend Sovereign Health to their patients.

### Level 2: Patient — Two Options

#### Option A: Disable affiliate for patients referred by clinics (recommended for MVP)

When a patient is referred by a clinic (Horizon/Enterprise org), their affiliate page is **hidden or shows "not available"**. The patient's `affiliate_code` still exists in the database (for potential future activation) but:

- Affiliate page shows: "Your account was set up through [Clinic Name]. The affiliate program is available for independent accounts."
- No referral link displayed
- No dashboard, no commission tracking

**Why this is simpler:**
- No 3+ level chain tracking needed
- No ambiguity about who earns what
- Clinics have clear ownership of their patient relationships
- Avoids the MLM perception that deep hierarchies create

**When to enable:** If a patient cancels their clinic relationship (unlinks from org) and becomes an independent user, their affiliate code activates.

#### Option B: Enable patient affiliates at reduced rate (future)

Patients can refer friends at a reduced commission rate:

```
BrickOS (L0)  ←── 1% platform fee
     │
Clinic (L1)   ←── 20% on patient subscription
     │
Patient (L2)  ←── 10% on friend's subscription
     │
Friend (L3)   ←── pays subscription, affiliate disabled (chain ends)
```

This requires:
- Extending the chain to 3 levels (`parent_referrer_id` → `grandparent_referrer_id` or a recursive table)
- Per-level commission rate configuration
- Clear UI showing the patient they earn 10% (not 20%)
- Decision: does the clinic (L1) also earn on the friend (L3)? If yes, at what rate?

**Complexity cost:** Higher. Requires recursive chain resolution, configurable per-level rates, and careful testing of edge cases (what if friend is already a user? what if friend was referred by someone else?).

## Recommended Approach: MVP + Future

| Phase | What | Effort |
|---|---|---|
| **MVP** | Platform fee (L0) + disable patient affiliates (Option A) | 3 pts |
| **Future** | Enable patient affiliates at reduced rate (Option B) | 5 pts |

### MVP scope (Option A)

1. Add BrickOS platform fee (1%) to every conversion
2. Add `affiliate_level` concept to conversions
3. Disable affiliate UI for users who belong to an org as `org_member` (not `org_owner` or `org_admin`)
4. Show explanation text on disabled affiliate page
5. Re-enable affiliate if user leaves org

## Data Model Changes

### Migration: Platform fee + level tracking

```sql
-- Add platform fee to every conversion
ALTER TABLE affiliate_conversions
    ADD COLUMN IF NOT EXISTS platform_fee_cents INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS affiliate_level SMALLINT NOT NULL DEFAULT 1;

-- Platform fee rate in commission rates table
INSERT INTO affiliate_commission_rates (level, rate_bps, description)
VALUES (0, 100, 'BrickOS platform management fee')
ON CONFLICT DO NOTHING;

-- Track whether a user's affiliate is active or org-suppressed
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS affiliate_active BOOLEAN NOT NULL DEFAULT true;
```

### For future Option B: Recursive chain table

If we later need 3+ levels, replace the flat `referred_by` + `parent_referrer_id` with a proper chain table:

```sql
-- Future: replace flat columns with recursive chain
CREATE TABLE affiliate_chain (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referrer_user_id UUID NOT NULL REFERENCES users(id),
    level SMALLINT NOT NULL,           -- 1 = direct, 2 = parent, 3 = grandparent
    affiliate_code VARCHAR(8) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, level)
);

-- Example data:
-- Patient signs up via Clinic, Clinic was referred by BrickOS partner
-- user_id=patient, referrer=clinic, level=1
-- user_id=patient, referrer=partner, level=2
```

This is **not needed for MVP** — the current flat columns work fine for 2 levels + platform fee.

## API Changes

### Modified endpoints

| Method | Endpoint | Change |
|---|---|---|
| GET | `/api/affiliate/me` | Return `affiliate_active: false` + reason if org-suppressed |
| POST | `/api/affiliate/click` | No change (still tracks clicks for inactive affiliates — useful for analytics) |

### Conversion creation logic change

In `create_affiliate_conversion()` (called from billing.rs / billing_btc.rs):

```
Current:
  1. Calculate L1 commission (20%)
  2. If parent exists, calculate L2 commission (2%)
  3. Create conversion record

Proposed:
  1. Calculate platform fee (1%) — ALWAYS
  2. Calculate L1 commission (20%)
  3. If parent exists, calculate L2 commission (2%)
  4. Create conversion with platform_fee_cents
```

### Affiliate page visibility

In frontend, the affiliate page/tab:

```
if (user.affiliate_active === false) {
  // Show disabled state with explanation
  // "Your account is managed through [Org Name]."
  // "The affiliate program is available for independent accounts."
} else {
  // Show normal affiliate dashboard
}
```

## Commission Rate Summary

### MVP (3 levels, patient disabled)

| Level | Who | Rate | Earns on |
|---|---|---|---|
| L0 | BrickOS (platform) | 1% (100 bps) | Every affiliate-driven subscription |
| L1 | Clinic / direct referrer | 20% (2000 bps) | Their direct referrals' subscriptions |
| L2 | Patient | disabled | — |

**Example: Clinic refers 10 patients on Insight (€24.99/mo)**

| Recipient | Per patient/mo | Monthly (10 patients) | Annual |
|---|---|---|---|
| BrickOS platform fee | €0.25 | €2.50 | €30.00 |
| Clinic commission | €5.00 | €50.00 | €600.00 |
| BrickOS net subscription | €19.74 | €197.40 | €2,368.80 |

### Future Option B (3 levels, patient enabled)

| Level | Who | Rate | Earns on |
|---|---|---|---|
| L0 | BrickOS (platform) | 1% (100 bps) | Every affiliate-driven subscription |
| L1 | Clinic / direct referrer | 20% (2000 bps) | Their direct referrals' subscriptions |
| L2 | Patient (referred by clinic) | 10% (1000 bps) | Their friend's subscription |
| L3 | Friend | disabled | Chain ends |

**Open question for Option B:** Does the clinic (L1) also earn on the friend (L3)? Options:
- **No** — clinic only earns on patients they directly referred. Clean but less incentive for clinics.
- **Yes, at reduced rate (2%)** — clinic earns on their entire downstream tree. More incentive but approaching MLM territory.

## Interaction with Tier Structure

| Tier | Affiliate role | Behavior |
|---|---|---|
| glimpse / focus / insight / clarity | Independent user | Full affiliate access (L1 referrer) |
| horizon | Clinic org_owner / org_admin | Full affiliate access (L1 referrer for patients) |
| horizon | org_member (practitioner) | Affiliate active — they can refer outside the org |
| horizon_enterprise | org_owner / org_admin | Full affiliate access (L1 referrer for patients) |
| horizon_enterprise | org_member (staff) | Affiliate suppressed — org manages referrals centrally |
| Any tier | Patient (referred by org) | Affiliate suppressed (MVP) or reduced rate (future) |

### Key distinction

The affiliate suppression is **not tier-based** — it's **relationship-based**:
- If you signed up independently → affiliate active
- If you were referred by a Horizon/Enterprise org AND you're their patient → affiliate suppressed
- If you leave the org → affiliate reactivates

This is tracked via `users.affiliate_active` and the presence of an `org_members` record with role `org_member` where the org is Horizon+.

## Edge Cases

### 1. Patient was an independent user first, then joins a clinic
- Affiliate stays active — they had it before the org relationship
- Only suppress if the org explicitly requests it (admin action)

### 2. Patient leaves clinic org
- `affiliate_active` set back to `true`
- Their existing referral code works immediately
- Any pending conversions from before deactivation: honor them (don't retroactively cancel)

### 3. Clinic downgrades from Horizon to Clarity
- Clinic loses org features but keeps affiliate (all users have it)
- Patients are no longer "org patients" — their affiliate reactivates
- Clinic's existing commissions: continue paying (earned while Horizon)

### 4. Two clinics try to refer the same patient
- First-touch attribution (30-day cookie) wins
- If patient already exists → `referred_by` is immutable (set at signup only)

### 5. BrickOS platform fee on BTC payouts
- Platform fee calculated in EUR cents
- If affiliate payout is BTC: platform fee stays in EUR (BrickOS doesn't need BTC payout)
- Platform fee deducted from subscription revenue before affiliate commission calculation? Or after?
- **Recommendation:** After — the affiliate earns 20% of the full subscription. Platform fee is BrickOS's operational cut, not a deduction from the affiliate.

### 6. Self-hosted / OSS (core tier)
- No affiliate system (no subscriptions to earn from)
- `affiliate_active` = false for `core` tier users

## Legal & Compliance

### Not an MLM
The system must stay clearly within referral program territory, not multi-level marketing:

| MLM characteristic | Our system |
|---|---|
| Unlimited depth | **No** — max 2-3 levels, hard cap |
| Earnings from recruitment | **No** — earnings only from actual subscriptions |
| Required purchases | **No** — affiliate is free, no buy-in |
| Inventory / product loading | **No** — SaaS, no physical product |
| Majority of revenue from recruits | **No** — BrickOS revenue is subscription-based |

### GDPR
- Affiliate relationships are personal data (who referred whom)
- Data export must include affiliate data
- Right to erasure: deleting a user must anonymize their affiliate chain (set `referred_by = NULL` on downstream users, keep conversion records with anonymized referrer for accounting)

### Tax
- Affiliate commissions are taxable income for the affiliate
- BrickOS must report payouts >€600/year (Germany: Mitteilungspflicht)
- BTC payouts: document EUR-equivalent at time of conversion (already done via `btc_eur_rate` snapshot)

## Implementation Phases

### Phase 1: Platform fee (MVP, 2 pts)
1. Add `platform_fee_cents` to `affiliate_conversions` table
2. Add Level 0 rate (1%) to `affiliate_commission_rates`
3. Update `create_affiliate_conversion()` to always calculate platform fee
4. Update admin payout dashboard to show platform fee totals

### Phase 2: Suppress patient affiliates (MVP, 1 pt)
1. Add `affiliate_active` column to `users`
2. When user joins a Horizon+ org as patient: set `affiliate_active = false`
3. When user leaves org: set `affiliate_active = true`
4. Frontend: show disabled state with explanation on affiliate page
5. API: `/affiliate/me` returns `active: false` with reason

### Phase 3: Patient affiliate activation (Future, 5 pts)
1. Design 3-level chain tracking (flat columns or `affiliate_chain` table)
2. Per-level commission rate configuration
3. Frontend: patient affiliate dashboard with reduced rate display
4. Decision on whether clinic earns on patient's downstream
5. Update admin dashboard for 3-level reporting

**MVP total: 3 pts | Future extension: 5 pts**

## Open Questions

- [ ] Platform fee: 1% or different rate? Should it be configurable per-org or global?
- [ ] Platform fee deducted before or after affiliate commission calculation? (Recommendation: after — affiliate earns on full subscription amount)
- [ ] Should org_owners/org_admins be able to suppress individual member affiliates, or is it automatic for all org_members?
- [ ] Patient affiliate (Option B): should the clinic also earn on the patient's downstream referrals? At what rate?
- [ ] Should there be a maximum chain depth even in Option B? (Recommendation: hard cap at 3 levels)
- [ ] BrickOS platform account: use a reserved affiliate code (`brickos0`) or a separate tracking mechanism?
- [ ] Should the platform fee apply to self-referrals within an org? (e.g., clinic refers their own staff member who subscribes independently)

## References

- [012-enterprise-sso.md](012-enterprise-sso.md) — Horizon tier structure and org model
- [001-oauth-social-login.md](001-oauth-social-login.md) — Social login (shared user identity)
- `api/src/handlers/affiliate.rs` — Current affiliate implementation (1005 lines)
- `api/migrations/20260319000094_hierarchical_affiliate_commissions.sql` — Two-tier chain migration
- `api/migrations/20260312000051_affiliate_system.sql` — Initial affiliate schema
