---
number: 244
title: "design: sovereign support & ticket system — AI-first with .md schema"
labels: [design, infrastructure, ai]
milestone: infrastructure
---

## Description

Design and implement a sovereign support ticket system with AI-first triage, provider-agnostic gateway, and GitHub integration.

Design doc: `docs/project-files/design/028-sovereign-support-ticket-system.md`

## Key Architecture

1. **In-app chat widget** — tier-aware support in Sovereign Health app
2. **AI gateway** — provider-agnostic, .md ticket schema as contract
3. **Ticket system** — .md files on VPS, git sync to GitHub (Mode B default)
4. **CC Investigator** — read-only codebase access, automated code tracing
5. **CC Developer** — picks up reviewed issues, fixes + PR
6. **Notifications** — ntfy.sh → Telegram at 4 trigger points

## Phases
- Phase 1: Ticket schema + manual triage (1 sprint)
- Phase 2: In-app support widget (1 sprint)
- Phase 3: AI investigation (1-2 sprints)
- Phase 4: Full automation (1 sprint)

## References
- Design 028: Sovereign Support & Ticket System
- Issue #239: AI model agnostic
- Design 027: Multi-region infrastructure
