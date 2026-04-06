# EU-US Data Privacy Framework -- Compliance Assessment

**Status:** NOT APPLICABLE (partially relevant, no gaps)
**Last reviewed:** 2026-04-06
**Next review:** 2027-04-06 (annual)

## Applicability Assessment

The EU-US Data Privacy Framework governs transfers of personal data from the EU to the US. BrickOS uses two US-based processors: Anthropic (AI analysis via Claude API) and Stripe (payment processing). However, no user health data is stored in the US. Anthropic processes data under their DPA with Standard Contractual Clauses (SCCs). Stripe processes payment data under their own DPA and Privacy Shield successor certification. BrickOS infrastructure is EU-only (Hetzner, Germany).

## Conditions for Re-evaluation

- BrickOS begins storing user data on US-based infrastructure
- The EU-US Data Privacy Framework adequacy decision is invalidated (Schrems III scenario)
- New US-based sub-processors are added that store (not just process) personal data
- Anthropic or Stripe materially change their data processing locations or DPA terms
