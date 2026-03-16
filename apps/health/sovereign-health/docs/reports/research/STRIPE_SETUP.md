# Stripe Setup Guide

## 1. Create Stripe Account

Sign up at [stripe.com](https://stripe.com) and complete identity verification.

## 2. Get API Keys

Go to **Dashboard > Developers > API keys**

- Copy the **Secret key** (starts with `sk_test_` in test mode)
- Copy the **Publishable key** (starts with `pk_test_` in test mode)

Add to your `.env`:

```
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

## 3. Create Products and Prices

Go to **Dashboard > Products** and create the following:

| Product | Monthly Price | Annual Price |
|---------|-------------|-------------|
| Focus | EUR 9.99/month | EUR 99.90/year |
| Insight | EUR 24.99/month | EUR 249.90/year |
| Clarity | EUR 49.99/month | EUR 499.90/year |
| Horizon | EUR 99.99/month | EUR 999.90/year |

For each price, copy the price ID (starts with `price_`) and add to `.env`:

```
STRIPE_PRICE_FOCUS_MONTHLY=price_xxx
STRIPE_PRICE_FOCUS_ANNUAL=price_xxx
STRIPE_PRICE_INSIGHT_MONTHLY=price_xxx
STRIPE_PRICE_INSIGHT_ANNUAL=price_xxx
STRIPE_PRICE_CLARITY_MONTHLY=price_xxx
STRIPE_PRICE_CLARITY_ANNUAL=price_xxx
STRIPE_PRICE_HORIZON_MONTHLY=price_xxx
STRIPE_PRICE_HORIZON_ANNUAL=price_xxx
```

## 4. Set Up Webhook Endpoint

Go to **Dashboard > Developers > Webhooks** and add an endpoint:

- **URL:** `https://api.sovereignhealth.io/billing/webhook`
- **Events to listen for:**
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

Copy the **Signing secret** (starts with `whsec_`) and add to `.env`:

```
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## 5. Configure Billing Portal

Go to **Settings > Billing > Customer portal** and enable:

- Update payment method
- View invoices
- Cancel subscription

Set the redirect URL to: `https://app.sovereignhealth.io/billing`

## 6. Test Cards

| Card Number | Result |
|---|---|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Decline |
| 4000 0025 0000 3155 | 3D Secure required |

Use any future expiry date, any 3-digit CVC, and any billing address.

## 7. Go Live

When ready for production:

1. Complete Stripe account activation
2. Switch API keys from `sk_test_` to `sk_live_`
3. Update webhook endpoint URL to production
4. Update webhook signing secret

## OSS Mode

In OSS/self-hosted mode (`SHI_MODE=oss`), Stripe is fully disabled. All features are unlocked without payment. No Stripe configuration needed.
