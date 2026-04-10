---
number: 317
github_number: 443
title: "compliance: Formalize DPAs with Anthropic, Stripe, Strike"
labels: [compliance, gdpr, legal, priority-high]
milestone: pre-launch
---

## Description
GDPR Art. 28 requires Data Processing Agreements with all sub-processors handling personal data.

Current sub-processors:
- **Anthropic** (US): processes health data via Claude API for Dr. Alex analysis
- **Stripe** (US): processes billing data (email, payment method, tier)
- **Strike** (US): processes BTC payment data

## Action
- [ ] Review Anthropic's DPA (https://www.anthropic.com/dpa) and sign/accept
- [ ] Review Stripe's DPA and ensure it covers our processing activities
- [ ] Review Strike's terms for BTC payment processing
- [ ] Document all DPAs in docs/compliance/dpas/
- [ ] Update data-processing-records.md with DPA references

## Blocked By
Company founding (need legal entity to sign agreements)
