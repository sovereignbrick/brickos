# BrickOS Dual-Track Roadmap

**Date:** 2026-04-06
**Context:** Sovereign Health Intelligence is stable (v0.37.0, 144 pts across 4 sprints, EU compliance documented). Time to shift from building to growing.

---

## Two Parallel Tracks

### Track 1: Marketing & Sales (Sovereign Health)
**Goal:** Attract early adopters, validate product-market fit, build community
**Owner:** You (with AI assistance for content)
**Timeline:** Ongoing, starts immediately
**No new engineering needed**

### Track 2: Distribution Platform (Sovereign Link)
**Goal:** Prove NOSTR login, packaging, and distribution patterns on a simple app
**Owner:** Engineering (sprints)
**Timeline:** 2-3 focused sprints
**Patterns port back to Sovereign Health**

---

## Track 1: Marketing Strategy

### Target Audiences (in priority order)

| Audience | Why | Channel | Message |
|---|---|---|---|
| **Biohackers / Quantified Self** | Already track blood markers, understand the value | Reddit r/Biohackers, r/QuantifiedSelf, Twitter/X | "Own your health data. No cloud lock-in." |
| **Keto / Carnivore community** | Track glucose, ketones, GKI daily. Protocol-aware reference ranges are unique. | Reddit r/keto, r/carnivore, Twitter/X, podcasts | "Finally, reference ranges that understand your diet." |
| **Bitcoin / Sovereignty community** | Values self-custody, privacy, open source. BTC payments. | NOSTR, Bitcoin Twitter, Stacker News, podcasts | "Proof of Blood. The sovereign health stack." |
| **Functional medicine practitioners** | Need patient data tools, frustrated with mainstream EHR | LinkedIn, practitioner forums, conferences | "Give your patients data sovereignty." |
| **Privacy-conscious Europeans** | GDPR-aware, want EU-hosted, open source | Hacker News, Privacy subreddits, NOSTR | "EU-hosted, encrypted, AGPL. Your data stays yours." |

### Content Strategy

| Content Type | Cadence | Platform | Purpose |
|---|---|---|---|
| Blog posts on sovereignhealth.io | 2/month | Website + social | SEO + thought leadership |
| Demo videos (from learn page) | 1/month | YouTube, Twitter | Show the product |
| NOSTR posts (health sovereignty) | 3/week | NOSTR relays | Build Bitcoin/sovereignty community |
| Reddit engagement | Daily | r/Biohackers, r/keto | Answer questions, mention SHI naturally |
| Podcast guest appearances | 1/month | Health + Bitcoin podcasts | Authority building |

### Metrics to Track
- Website visitors (Cloudflare analytics - privacy-preserving)
- Signups (ntfy notifications already track this)
- Demo profile views (existing demo endpoints)
- Conversion: signup -> first measurement
- Retention: users active after 7/30 days

### Marketing Pipeline (your existing system)
The `/home/dev-comp/Projects/marketing/` system is already well-structured:
- Strategy: positioning, messaging, USP library
- Targets: pipeline with research + fit analysis + outreach drafts
- Templates: cold email, influencer DM patterns
- Learnings: what worked, what didn't

**Recommendation:** Focus on 5-10 high-impact targets per week, not broad spray.

---

## Track 2: Sovereign Link Distribution

### Why Sovereign Link First

Sovereign Link is the ideal testbed because:
- **Tiny codebase** (~2K lines Rust vs ~30K for SHI)
- **No sensitive data** (URLs vs health records)
- **Fast builds** (30s vs 10 min)
- **Simple dependencies** (actix-web + sqlx vs + anthropic + stripe + sentry)
- **Low-risk iteration** (broken redirect vs corrupted health data)

### Sovereign Link v1.0 Specification

**Core features (already built):**
- URL shortening with custom codes
- QR code generation
- Click analytics (privacy-preserving: hashed IPs, no user agents)
- Vanity codes
- API: CRUD for links + stats

**New features for v1.0 distribution:**

| Feature | Purpose | Effort |
|---|---|---|
| NOSTR NIP-98 login | Passwordless auth via NOSTR keypair | 3 pts |
| NOSTR NIP-89 app listing | Discoverable on NOSTR app stores | 2 pts |
| SQLite mode (in addition to PostgreSQL) | Single-binary deployment, no DB server needed | 3 pts |
| Web UI (minimal) | Self-contained dashboard for managing links | 5 pts |
| Start9 package (.s9pk) | One-click install on Start9 sovereign servers | 3 pts |
| Docker single-container | docker run one-liner | 2 pts |
| Static binary release | Download + run, no Docker needed | 2 pts |

### Distribution Channels (complexity order)

| Channel | Complexity | Audience | Priority |
|---|---|---|---|
| **NOSTR NIP-89** | Low | NOSTR users discover app via relays, click to use | 1st |
| **Docker Hub** | Low | docker pull + docker run | 1st |
| **Static binary (GitHub Release)** | Low | Download, chmod +x, run | 1st |
| **Start9 marketplace** | Medium | Start9 sovereign server users | 2nd |
| **Flatpak** | High | Linux desktop users | 3rd (defer) |

### NOSTR Distribution vs Flatpak

You're right -- **NOSTR app distribution (NIP-89) is much simpler than Flatpak:**

| | NOSTR NIP-89 | Flatpak |
|---|---|---|
| What it is | A NOSTR event that says "this app exists at this URL" | A sandboxed Linux desktop package |
| Packaging effort | Write a JSON event, publish to relays | Build manifest, runtimes, desktop file, icon, sandbox permissions |
| Discovery | Users find it via NOSTR clients (Damus, Amethyst, etc.) | Users find it via Flathub or GNOME Software |
| Audience | Sovereignty / Bitcoin / NOSTR community | General Linux desktop users |
| Dependencies | None (just a NOSTR event) | Flatpak runtime, build system |
| Update mechanism | Update the NOSTR event | Submit to Flathub, CI pipeline |
| **Recommendation** | **Do first** | **Defer** |

### Implementation Order for Sovereign Link v1.0

```
Sprint A (2-3 days):
  1. NOSTR NIP-98 login (keypair auth, no passwords)
  2. SQLite mode (compile-time feature flag)
  3. Minimal web UI (dark theme, link management)
  4. Docker single-container image
  5. Static binary GitHub Release

Sprint B (1-2 days):
  6. NOSTR NIP-89 app listing (publish to relays)
  7. Start9 package (.s9pk)
  8. Documentation: self-hosting guide

Sprint C (port back):
  9. NOSTR NIP-98 login for Sovereign Health
  10. Start9 package for Sovereign Health (larger, more complex)
```

---

## Decision: What NOT to Build Now

| Item | Decision | Reasoning |
|---|---|---|
| More SHI features | STOP | Product is stable, need users not features |
| Flatpak packaging | DEFER | Complex, small audience, NOSTR is simpler |
| NOSTR relay | DEFER | Large effort, do after Link + Health have NOSTR login |
| Mobile app | DEFER | PWA works, native app is expensive to maintain |
| Multi-region infra | DEFER | Need users first, one VPS is fine |
| FHIR export | DEFER | Compliance checkbox, no user is asking for it |

---

## Suggested Next Steps

### This week:
1. **Start marketing outreach** using existing pipeline system
2. **Write 2 blog posts**: "Why your blood data should be sovereign" + "Building a health stack with Bitcoin"
3. **Post on NOSTR**: announce the platform, share demo link
4. **Identify 5 podcast targets** in health/Bitcoin space

### Next sprint (Track 2):
1. Sovereign Link v1.0 with NOSTR NIP-98 login
2. Docker + binary distribution
3. NIP-89 app listing

### After validation:
- Port NOSTR login to Sovereign Health
- Port Start9 packaging to Sovereign Health
- Scale marketing based on what resonated
