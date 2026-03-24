# Design 028: Sovereign Support & Ticket System

**Date:** 2026-03-24
**Status:** Draft
**Depends on:** Design 027 (Multi-Region Infrastructure), Design 039 (AI Model Agnostic), Issue #234 (Deploy Process)

## Problem

As BrickOS scales to more users and products, we need a support system that:
1. Provides AI-first support that resolves most issues without human intervention
2. Generates structured tickets when human escalation is needed
3. Integrates with our existing GitHub issue tracker
4. Differentiates support by tier (standard vs premium)
5. Stays sovereign — minimal external dependencies

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Layer 1: IN-APP CHAT WIDGET                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Sovereign Health App (client)                           │    │
│  │ in-app chat widget  ·  standard tier  ·  premium tier   │    │
│  └──────────────────────────┬──────────────────────────────┘    │
│                             │                                   │
│                             ▼                                   │
│  Layer 2: AI SUPPORT GATEWAY (provider-agnostic)                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ .md schema as handoff standard                          │    │
│  │ swap provider without breaking anything                 │    │
│  │                                                         │    │
│  │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌───────┐ │    │
│  │ │ Claude │ │ GPT-4o │ │ Gemini │ │Mistral │ │ Llama │ │    │
│  │ └────────┘ └────────┘ └────────┘ └────────┘ └───────┘ │    │
│  └──────────┬────────────────────────┬─────────────────────┘    │
│             │ resolved               │ escalate                 │
│             ▼                        ▼                          │
│  ┌──────────────────┐  ┌──────────────────────────────────┐    │
│  │ Auto-response    │  │ Layer 3: TICKET SYSTEM            │    │
│  │ back to client   │  │                                    │    │
│  └──────────────────┘  │  .md ticket file generated         │    │
│                        │  ┌──────────┐  ┌────────────────┐  │    │
│                        │  │ Mode A:  │  │ Mode B:        │  │    │
│                        │  │ Direct   │  │ Local + Sync   │  │    │
│                        │  │ gh issue │  │ git push cron  │  │    │
│                        │  └──────────┘  └────────────────┘  │    │
│                        └──────────────────┬─────────────────┘    │
│                                           │                     │
│                                           ▼                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Support VPS                                             │    │
│  │                                                         │    │
│  │  ┌────────────────┐  ┌────────────────────────────────┐ │    │
│  │  │ CC Investigator│  │ tickets/                       │ │    │
│  │  │ (read-only     │  │ ├── open/                      │ │    │
│  │  │  codebase)     │  │ │   └── 2026-03-24-T001.md     │ │    │
│  │  └────────────────┘  │ ├── resolved/                  │ │    │
│  │                      │ └── escalated/                 │ │    │
│  │                      └────────────────────────────────┘ │    │
│  └──────────────────────────┬──────────────────────────────┘    │
│                             │ GitHub issue / webhook            │
│                             ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Dev VPS                                                 │    │
│  │                                                         │    │
│  │  ┌────────────────┐  ┌────────────────────────────────┐ │    │
│  │  │ CC Reviewer    │  │ CC Developer                   │ │    │
│  │  │ (read-only)    │  │ (full write)                   │ │    │
│  │  │                │  │                                │ │    │
│  │  │ Reviews issue  │  │ Fixes issue                    │ │    │
│  │  │ Traces code    │  │ Runs tests                     │ │    │
│  │  │ Raises finding │  │ Pushes PR                      │ │    │
│  │  └────────────────┘  └────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  Notifications: ntfy.sh → Telegram                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ • Ticket created        → ntfy → Telegram               │    │
│  │ • Investigation complete → ntfy → Telegram               │    │
│  │ • GitHub issue/PR raised → GitHub webhook → Telegram     │    │
│  │ • Client reply sent      → ntfy → Telegram               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Layer 1: In-App Chat Widget

The chat widget lives inside the Sovereign Health app and triggers the AI gateway. Tier differentiation happens here:

| Tier | Support Level |
|------|--------------|
| Glimpse/Focus | Standard: AI-only, 24h response time SLA for escalations |
| Insight | Standard+ : AI with longer context window, 12h escalation SLA |
| Clarity | Premium: AI + human escalation option, 4h SLA |
| Horizon | Dedicated: AI + priority human, 1h SLA, direct Telegram channel |
| Core | Community: forum + email, AI self-service via docs |

The widget is a thin stateless UI — all logic lives downstream.

### Implementation
- Reuse existing Dr. Alex chat component (`components/doctor-chat/`)
- New chat type: `support` (alongside `general`, `trends`, `labs`, etc.)
- Support context includes: user tier, app version, browser, recent errors from console
- Tier check: premium users see "Talk to a human" escalation button

## Layer 2: Provider-Agnostic AI Gateway

The key design shift: the **.md ticket schema becomes the contract** between the AI layer and everything below. The gateway doesn't care which model answers — it receives a conversation, queries the configured provider, and either resolves or generates a standardized `.md` ticket file downstream.

### .md Ticket Schema

```markdown
---
id: T-2026-03-24-001
created: 2026-03-24T15:30:00Z
user_id: uuid (hashed for privacy)
tier: clarity
severity: medium
status: open
category: bug | feature_request | question | account | billing
environment:
  app_version: 0.28.0
  browser: Chrome 131
  platform: Linux x86_64
  pwa: true
---

## Summary
User reports that measurement import from CSV fails with "column mismatch" error.

## Steps to Reproduce
1. Navigate to Dr. Alex > Smart Import > Measurement Table
2. Upload file "blood_work_march.csv"
3. AI extraction shows 0 columns matched

## Conversation Transcript
**User:** I tried to import my lab results from a CSV file but it says no columns matched.
**AI:** I can see you're trying to import a measurement table. Can you tell me...
**User:** It's a standard CSV from my Fora 6 device.
**AI:** I've checked the import logic and the Fora 6 CSV format...

## AI Analysis
The Fora 6 CSV uses semicolon delimiters instead of commas. The import parser
currently only handles comma-separated files. This is a known limitation
(see issue #197 — "bpm not recognized by table importer").

## Suggested Resolution
Extend CSV parser to detect delimiter (comma vs semicolon vs tab).
Related code: `api/src/handlers/import.rs:962`
```

### Provider Abstraction

```rust
// Same trait as proposed in issue #239
pub trait AiProvider: Send + Sync {
    async fn chat(&self, messages: Vec<Message>, config: AiConfig) -> Result<String>;
    fn name(&self) -> &str;
}

// Support-specific: generate ticket from conversation
pub async fn investigate_and_respond(
    provider: &dyn AiProvider,
    conversation: Vec<Message>,
    user_context: UserContext,
) -> SupportResult {
    // 1. Try to resolve with AI
    // 2. If unresolved after 3 exchanges, generate .md ticket
    // 3. Return either resolution or ticket path
}
```

Provider switching is a one-line config change:
```env
SUPPORT_AI_PROVIDER=claude      # or: gpt4o, gemini, mistral, llama, custom
SUPPORT_AI_MODEL=claude-sonnet-4-6
```

## Layer 3: Ticket Submission (Two Modes)

### Mode A: Direct GitHub Issue
The CC investigator calls `gh issue create` at the end of investigation:
```bash
gh issue create \
  --title "[Support] Fora 6 CSV import fails — semicolon delimiter" \
  --body "$(cat tickets/open/T-2026-03-24-001.md)" \
  --label "bug,support,import"
```
Requires GitHub token on the support VPS. Instant triage visibility.

### Mode B: Local + Sync (Recommended)
Tickets stay in the VPS folder structure. A cron job syncs to a private GitHub repo:
```bash
# Every hour
0 * * * * cd /opt/support/tickets && git add . && git commit -m "sync $(date +%H:%M)" && git push
```

For raising actual GitHub issues on the code repo, the CC agent calls the GitHub API only when it has a **confirmed finding**, not for every ticket.

**Recommendation:** Mode B as default, Mode A opt-in for premium tier tickets needing immediate triage.

### Folder Structure on Support VPS
```
/opt/support/
├── tickets/
│   ├── open/
│   │   └── T-2026-03-24-001.md
│   ├── investigating/
│   │   └── T-2026-03-24-002.md
│   ├── resolved/
│   │   └── T-2026-03-23-005.md
│   └── escalated/
│       └── T-2026-03-24-003.md
├── config/
│   ├── providers.yaml          # AI provider config
│   └── tiers.yaml              # SLA definitions
└── logs/
    └── 2026-03-24.log
```

## Dev VPS: Two Claude Code Instances

Two CC instances on the same machine, isolated via filesystem permissions:

### CC Reviewer (read-only)
- Unix user: `cc-reviewer`
- Read-only bind mounts over codebase
- Can: read code, run tests, trace call stacks, grep for patterns
- Cannot: write files, push commits, modify config
- Trigger: GitHub issue webhook or manual paste
- Output: investigation findings as comments on the GitHub issue

### CC Developer (full write)
- Unix user: normal dev user
- Full write access to repo
- Picks up GitHub issues reviewed by CC Reviewer
- Works through fix, runs tests, pushes PR
- Normal development workflow with CC agent doing heavy lifting

### Isolation
```bash
# CC Reviewer setup
useradd -r -s /bin/bash cc-reviewer
# Read-only bind mount
mount --bind -o ro /home/dev/Projects/brickos /home/cc-reviewer/brickos
# Run CC with restricted user
su - cc-reviewer -c "claude --model sonnet"
```

## Notifications (ntfy.sh → Telegram)

Four trigger points:

| Event | Channel | Method |
|-------|---------|--------|
| Ticket created | `support/new` | ntfy push → Telegram |
| CC investigation complete | `support/resolved` | ntfy push with summary |
| GitHub issue/PR raised | `devops/issues` | GitHub webhook → Telegram |
| Client reply sent | `support/reply` | ntfy confirmation |

Self-hosted ntfy.sh server on the support VPS:
```bash
docker run -d --name ntfy \
  -p 8090:80 \
  -v /opt/ntfy/cache:/var/cache/ntfy \
  binwiederhier/ntfy serve
```

Topics map to channels cleanly. Telegram forwarding via ntfy's built-in integration.

## Sovereignty Posture

**External dependencies:**
- GitHub (code hosting + issue tracking) — degrades gracefully (tickets accumulate locally)
- AI provider API (configurable) — swap with one-line config change

**Everything else on our hardware:**
- Ticket file system
- CC agents
- ntfy notification server
- Folder structure and sync cron

If GitHub goes down, tickets still accumulate on VPS and sync when it returns. If AI provider goes down, swap the config and restart the gateway.

## Implementation Phases

### Phase 1: Ticket Schema + Manual Triage (1 sprint)
- Define .md ticket schema
- Create `/opt/support/tickets/` folder structure on support VPS
- Manual: support emails generate .md files
- GitHub sync cron (Mode B)
- ntfy notifications for new tickets

### Phase 2: In-App Support Widget (1 sprint)
- Add `support` chat type to Dr. Alex
- Tier-aware escalation path
- Auto-generate .md ticket from conversation
- Client-side context injection (version, browser, errors)

### Phase 3: AI Investigation (1-2 sprints)
- CC Investigator on support VPS (read-only codebase)
- Automated code tracing from ticket description
- Investigation findings → GitHub issue comments
- CC Reviewer on dev VPS

### Phase 4: Full Automation (1 sprint)
- CC Developer picks up reviewed issues
- Automated fix + test + PR workflow
- Closed loop: ticket → investigate → fix → deploy → notify client

## Cost Estimate

| Item | Monthly |
|------|---------|
| Support VPS (Hetzner CPX21, 3 vCPU, 4 GB) | €8 |
| ntfy.sh (on support VPS, no extra cost) | €0 |
| AI provider costs (support queries) | ~€5-20 (depends on volume) |
| **Total** | **~€15-30/mo** |

## References

- Issue #234: Deploy process overhaul
- Issue #239: AI model agnostic — fallback switching
- Design 027: Multi-region infrastructure
- Existing: `docs/tracker/` local issue tracker (similar folder structure)
- Existing: ntfy integration in deploy.sh
- Architecture SVG: `/Downloads/sovereign_support_v2.svg`
