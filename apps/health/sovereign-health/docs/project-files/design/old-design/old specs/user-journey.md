# User Journey — Sovereign Health Intelligence

## New User Flow

```
sovereignhealth.io          →  app.sovereignhealth.io
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. DISCOVER
   sovereignhealth.io → browse features, health zones, Dr. Alex chatbot

2. PRICING
   sovereignhealth.io/pricing → compare tiers → click "Get Started"

3. REGISTER
   app.sovereignhealth.io/register → email + password + name

4. EMAIL VERIFICATION
   Check inbox → click verification link → account confirmed

5. LOGIN
   app.sovereignhealth.io/login → email + password → dashboard

6. FREE EXPERIENCE (Glimpse tier)
   Dashboard → limited features → 3 Doctor Chat questions (30-day trial)
   → "Upgrade" prompts throughout the app

7. UPGRADE / SUBSCRIBE
   Click "Upgrade" → sovereignhealth.io/pricing
   → Choose tier + payment method (💳 Card or ⚡ Bitcoin)
   → Stripe Checkout (card) or Strike invoice (BTC)

8. PAYMENT COMPLETES
   Stripe/Strike webhook → tier activated in DB
   → Redirect to app → "Welcome to [Tier]!" confirmation

9. FULL EXPERIENCE
   Dashboard with tier features unlocked
   Doctor Chat quota per tier
   Full lab tracking, reports, exports
```

## Status per step

| Step | Status | Blocker |
|------|--------|---------|
| 1. Website | ✅ | — |
| 2. Pricing | ✅ | — |
| 3. Registration | ❌ Disabled | REGISTRATION_ENABLED=false |
| 4. Email verification | ❌ | Mailgun not configured (#33) |
| 5. Login | ✅ (existing users) | — |
| 6. Free experience | ✅ | — |
| 7a. Stripe Checkout | ❓ Untested | Needs e2e test |
| 7b. Strike BTC | ✅ Implemented | Needs e2e test |
| 8a. Stripe webhook | ❓ Untested | May not be in Stripe Dashboard |
| 8b. Strike webhook | ✅ Implemented | Needs e2e test |
| 9. Tier activation | ❓ Untested | Depends on webhooks |

## Test Cards (Stripe sandbox)

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires auth: `4000 0025 0000 3155`
- Expiry: any future date, CVC: any 3 digits

## Email Types Needed

| Email | Trigger | Priority |
|-------|---------|----------|
| Welcome | After registration | 🔴 Critical |
| Email verification | After registration | 🔴 Critical |
| Password reset | User request | 🔴 Critical |
| Subscription confirmed | After payment | 🟡 Important |
| Payment failed | Stripe event | 🟡 Important |
| Payment receipt | After payment | 🟡 Important |
| BTC renewal reminder | 30 days before expiry | 🟡 Important |
| Quota warning | 80%+ Doctor Chat used | 🟢 Nice-to-have |
| Health report | User export request | 🟢 Nice-to-have |
