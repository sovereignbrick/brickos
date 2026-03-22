# Design: Licensing Strategy for BrickOS / Sovereign Health

**Status:** Draft
**Date:** 2026-03-21

## Problem

BrickOS needs a licensing strategy that balances two goals:

1. **Open-source credibility** -- align with sovereignty ethos, attract community contributions
2. **Business protection** -- prevent competitors from cloning our SaaS without contributing back, while preserving our ability to sell commercial licenses

This document compares AGPL-3.0, SSPL, and alternative models, and recommends an architecture-aware licensing approach.

---

## Part 1: License Comparison

### AGPL-3.0 (GNU Affero General Public License v3.0)

**What it does:** Standard copyleft + network-use clause. Anyone who modifies and hosts the software must share their full source code with users.

| Aspect | Detail |
|--------|--------|
| **Author** | Free Software Foundation (FSF) |
| **OSI approved** | Yes -- recognized as open source |
| **Copyleft scope** | The modified program and its source |
| **Network trigger** | If users interact over a network, source must be available |
| **Commercial use** | Allowed -- anyone can sell, host, charge |
| **Proprietary forks** | Not allowed -- all derivatives must be AGPL |
| **Patent grant** | Yes -- contributors grant patent rights |

**Pros:**

- Industry-standard, well-understood legally
- OSI-approved = accepted by enterprises, foundations, package registries
- Dual-licensing friendly (copyright holder can sell proprietary licenses)
- Strong community signal ("we're serious about openness")
- Network clause closes the GPL SaaS loophole

**Cons:**

- Does NOT prevent competition -- anyone compliant with AGPL can clone, rebrand, and compete
- Enforcement is the copyright holder's burden (no automatic mechanism)
- Does not cover "offering as a service" as broadly as SSPL
- Some enterprises avoid AGPL entirely (legal departments flag it)
- Requires CLA infrastructure to maintain dual-licensing rights

### SSPL (Server Side Public License v1)

**What it does:** Based on AGPL but with a much broader copyleft trigger. If you offer the software as a service, you must open-source your **entire service stack** -- not just the modified program, but all management, orchestration, monitoring, and infrastructure code.

| Aspect | Detail |
|--------|--------|
| **Author** | MongoDB, Inc. (2018) |
| **OSI approved** | No -- rejected; not considered open source |
| **Copyleft scope** | The entire service stack (all software used to make the program available as a service) |
| **Network trigger** | Offering functionality as a service to third parties |
| **Commercial use** | Allowed, but impractical without proprietary license |
| **Proprietary forks** | Effectively prevented (compliance cost is enormous) |
| **Patent grant** | Yes |

**Pros:**

- Strongest anti-SaaS-competitor protection available
- Practically impossible for AWS/GCP/Azure to offer as managed service without a deal
- Still allows self-hosting for internal use
- Clear signal: "use it, but don't compete with our hosting"

**Cons:**

- NOT open source (OSI rejected it) -- cannot claim "open source" branding
- Many Linux distributions refuse to package SSPL software (Debian, Fedora, Red Hat)
- Scares away contributors and enterprise adopters
- Legal ambiguity: "entire service stack" is vaguely defined
- No significant legal precedent (never tested in court)
- Community perception is negative ("source-available, not open source")
- Some package managers and foundations reject SSPL projects

### Side-by-Side Comparison

| Criteria | AGPL-3.0 | SSPL | MIT/Apache 2.0 | BSL (Business Source) | Elastic License 2.0 |
|----------|----------|------|----------------|----------------------|---------------------|
| OSI approved | Yes | No | Yes | No | No |
| Copyleft | Strong | Extreme | None | Time-delayed | None |
| SaaS protection | Moderate | Very strong | None | Strong | Strong |
| Can competitors clone + host? | Yes (if compliant) | Technically yes (practically no) | Yes freely | No (until change date) | No (as managed service) |
| Dual-licensing viable? | Yes | Yes | N/A (already permissive) | Yes | Yes |
| Enterprise adoption | Cautious | Avoided | Welcomed | Cautious | Moderate |
| Community perception | Respected | Controversial | Loved | Mixed | Mixed |
| Legal precedent | Strong (20+ years) | None | Very strong | Limited | Limited |
| Self-hosting allowed | Yes | Yes | Yes | Yes (non-production limits) | Yes |
| Requires CLA for dual-license | Yes | Yes | No | Yes | N/A |

### Other Notable Licenses

**BSL (Business Source License):**
Used by MariaDB, HashiCorp, Sentry. Code is source-available but not open source. After a "change date" (typically 3-4 years), it converts to a permissive license (usually Apache 2.0). Competitors cannot use it commercially until the change date passes.

**Elastic License 2.0 (ELv2):**
Used by Elastic after they left AGPL/Apache. Simple two restrictions: (1) cannot provide as a managed service, (2) cannot circumvent license key functionality. Otherwise permissive. Not OSI-approved.

**Fair Source:**
Emerging model. Source is available, free for limited use (e.g., <10 employees), paid for commercial/large-scale use. Converts to open source after a delay.

---

## Part 2: Your IP Concern -- Addressed Directly

### "If core and all apps are AGPL, is my IP gone?"

**No. Your IP is NOT gone. But it IS shared.** Here is the precise breakdown:

| What you retain | What you share |
|-----------------|---------------|
| Copyright ownership | Source code (publicly visible) |
| Right to dual-license | Right for others to use, modify, redistribute under AGPL |
| Right to sell commercial licenses | |
| Right to sue violators | |
| Trademark (BrickOS, Sovereign Health) | |
| Brand, domain, customer relationships | |
| Proprietary deployment configs, secrets | |

**The asymmetry that protects you:**

As copyright owner, you can offer the code under ANY license. A competitor who forks your AGPL code is locked into AGPL forever. They cannot:

- Offer a proprietary version
- Sell closed-source commercial licenses
- Offer "AGPL-free" versions to enterprises

Only YOU can do that. This is the dual-licensing business model.

### "Can I enforce this as a startup?"

**Yes, but enforcement is proportional to your resources.** Here is how it works:

1. **Copyright law is automatic.** You do not register AGPL. You own the copyright by authoring the code. Violation of AGPL is copyright infringement.

2. **Enforcement mechanisms available to a startup:**
   - Cease-and-desist letter (cheap, often effective)
   - DMCA takedown (free, works for GitHub/hosting providers)
   - Community reporting (AGPL violations are visible -- no source = violation)
   - Organizations like Software Freedom Conservancy or SFLC may assist

3. **Practical reality:**
   - Most AGPL violations are unintentional (companies not realizing they must share source)
   - A C&D letter resolves 90%+ of cases
   - Actual lawsuits are rare and expensive (USD 50k-500k+)
   - At startup scale, the bigger risk is obscurity, not IP theft

4. **Who enforces:**
   - **You** (the copyright holder) -- primary enforcer
   - **Software Freedom Conservancy** -- can enforce on behalf of member projects
   - **Community** -- open-source communities actively report violations
   - **No automatic enforcement exists** -- there is no "AGPL police"

### "What if AWS clones it?"

| License | AWS can host it? | AWS must open source? |
|---------|-----------------|----------------------|
| AGPL | Yes | Yes (their modifications) |
| SSPL | Technically yes | Yes (their ENTIRE stack -- practically impossible) |
| ELv2 | No (explicitly prohibited) | N/A |
| BSL | No (until change date) | N/A |

This is why MongoDB, Elastic, and Redis moved away from AGPL -- it did not stop cloud providers. SSPL/ELv2/BSL were created specifically for this threat.

**For BrickOS at current scale:** AWS cloning is not a realistic near-term threat. AGPL is sufficient. If BrickOS grows to a scale where cloud providers are interested, you can relicense (you own the copyright).

---

## Part 3: What is a CLA?

### CLA = Contributor License Agreement

A CLA is a legal document that external contributors sign before their code is merged. It grants the project maintainer (you) specific rights over their contributions.

### Why is it required?

Without a CLA, every contributor retains copyright over their code. This means:

- You CANNOT dual-license their contributions (only they can)
- You CANNOT change the license without their permission
- If a contributor disappears, their code is locked to AGPL forever
- Your commercial licensing program breaks

### Types of CLA

| Type | What it does | Used by |
|------|-------------|---------|
| **Copyright Assignment (CA)** | Contributor transfers copyright to you | FSF (GNU projects), Canonical |
| **CLA (broad license grant)** | Contributor keeps copyright but grants you unlimited rights (including relicensing) | Apache, Google, Meta, MongoDB |
| **DCO (Developer Certificate of Origin)** | Contributor certifies they have the right to submit the code; NO license grant beyond the project license | Linux kernel, GitLab |

### Recommendation for BrickOS: CLA with broad license grant

This is the industry standard for dual-licensed projects. The contributor:

- Keeps their copyright
- Grants BrickOS/Sovereign Brick an irrevocable, perpetual, worldwide license to use, modify, sublicense (including under proprietary terms) their contribution
- Certifies they have the right to make the contribution

**Implementation options:**

| Tool | How it works | Cost |
|------|-------------|------|
| [CLA Assistant](https://cla-assistant.io/) | GitHub integration, signs via PR comment | Free (open source) |
| [CLA Assistant Lite](https://github.com/contributor-assistant/github-action) | GitHub Action, stores signatures in repo | Free |
| Manual | PDF/form signed before first PR | Free but slow |

### CLA vs DCO

A DCO (used by Linux kernel) is NOT sufficient for dual-licensing. The DCO only certifies origin -- it does not grant relicensing rights. If you plan to sell commercial licenses, you need a proper CLA.

---

## Part 4: Recommended Strategy for BrickOS

### Architecture

```
+--------------------------------------------------+
|              BrickOS Platform (You)               |
|                                                   |
|  +------------------+  +----------------------+  |
|  | Core / Crates    |  | Apps (SaaS)          |  |
|  | (AGPL-3.0)       |  | (AGPL-3.0)           |  |
|  |                  |  |                       |  |
|  | - shared crates  |  | - sovereign-health    |  |
|  | - data models    |  | - frontend + API      |  |
|  | - health engine  |  | - billing integration |  |
|  +------------------+  +----------------------+  |
|                                                   |
|  +----------------------------------------------+ |
|  | Commercial License (sold separately)          | |
|  | - Same code, different license terms           | |
|  | - No AGPL obligations for buyer                | |
|  | - Enterprise support included                  | |
|  +----------------------------------------------+ |
+--------------------------------------------------+
```

### The dual-licensing play

1. **Community edition:** AGPL-3.0. Anyone can use, modify, host. Must share source.
2. **Commercial license:** Sold to enterprises who want to:
   - Embed BrickOS in proprietary products
   - Avoid AGPL source-sharing obligations
   - Get enterprise support, SLA, indemnification
3. **Your hosted SaaS:** You run it yourself. Since you own the copyright, AGPL does not constrain you. You charge for the service, not the license.

### Why this works for a startup

| Advantage | Explanation |
|-----------|-------------|
| Revenue stream 1 | SaaS subscriptions (your hosted version) |
| Revenue stream 2 | Commercial license sales (enterprises embedding your code) |
| Moat | Competitors must stay AGPL -- they cannot sell commercial licenses |
| Community | AGPL is respected; contributors will participate |
| Credibility | OSI-approved license; "real" open source |
| Future flexibility | You can relicense at any time (you own all copyright) |

### What you need to implement

1. **Add AGPL-3.0 LICENSE file** to repository root
2. **Add license headers** to all source files
3. **Set up CLA** (recommend CLA Assistant GitHub integration)
4. **Trademark BrickOS and Sovereign Health** (separately from copyright -- trademarks are NOT covered by AGPL)
5. **Create a commercial licensing page** on brickos.io
6. **Document the dual-licensing model** in README/CONTRIBUTING.md

---

## Part 5: Decision Matrix

Use this to pick the right license based on your priorities:

| Priority | Best license |
|----------|-------------|
| Maximum openness + community | AGPL-3.0 |
| Block cloud providers specifically | SSPL or ELv2 |
| Dual-licensing revenue | AGPL-3.0 + CLA |
| Maximum enterprise adoption | Apache 2.0 or MIT |
| Source-available but not open source | BSL or ELv2 |
| Sovereignty ethos alignment | AGPL-3.0 |
| Simplest legal compliance | MIT |

### Recommendation: AGPL-3.0 + CLA + Trademark Protection

This gives you:
- Genuine open-source credibility (OSI-approved)
- Dual-licensing revenue potential
- Community contributions with proper IP management
- Asymmetric advantage over any competitor who forks
- Alignment with the sovereignty brand
- Future flexibility to relicense if cloud providers become a threat

---

## Open Questions

- [ ] Should different components have different licenses (e.g., packages/ui under MIT for wider adoption)?
- [ ] Which CLA tool to integrate with GitHub?
- [ ] Timeline for trademark registration of BrickOS and Sovereign Health?
- [ ] At what revenue/scale threshold should we consider adding ELv2 for specific components?
- [ ] Do we need a separate "Community Edition" vs "Enterprise Edition" build, or same codebase with feature flags?

## References

- [AGPL-3.0 Full Text](https://www.gnu.org/licenses/agpl-3.0.html)
- [SSPL Full Text](https://www.mongodb.com/licensing/server-side-public-license)
- [CLA Assistant](https://cla-assistant.io/)
- [Open Core Model -- Commercial Open Source](https://en.wikipedia.org/wiki/Open-core_model)
- [MongoDB SSPL FAQ](https://www.mongodb.com/licensing/server-side-public-license/faq)
- [Elastic License 2.0](https://www.elastic.co/licensing/elastic-license)
- [Business Source License](https://mariadb.com/bsl-faq-adopting/)
- [Software Freedom Conservancy](https://sfconservancy.org/)
