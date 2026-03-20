# ADR-013: Anthropic API (Claude) for Dr. Alex AI

**Status:** Accepted
**Date:** 2026-03-08

## Context
Dr. Alex is the AI health assistant that analyzes biomarkers, interprets lab results, extracts data from photos of supplement bottles, and provides personalized health recommendations. The quality of medical advice is critical — incorrect guidance could harm users.

## Decision
Use **Anthropic's Claude API** for all AI interactions. No self-hosted LLM.

- Vision API for lab result and supplement photo analysis
- Chat completions for health Q&A with biomarker context
- Usage tracked in `ai_usage_log` table (cost, tokens, model)
- Per-user quota enforcement via `chat_agent_quota` and `doctor_chat_quota` tables
- 60-second timeout for API calls

## Alternatives Considered
- **OpenAI (GPT-4):** Comparable quality but Anthropic's safety alignment better suited for health advice.
- **Self-hosted (Ollama + Llama 3):** Full sovereignty but medical knowledge quality significantly lower. Unacceptable risk for health recommendations.
- **No AI:** Users interpret lab results themselves. Defeats the product's core value proposition.

## Consequences
- **Easier:** Best available medical reasoning quality, vision capabilities for photo analysis, rapid iteration on prompts.
- **Harder:** Vendor dependency, per-request cost, API outages affect user experience, data sent to external service.
- **Mitigation:** Graceful fallback ("Dr. Alex is temporarily unavailable"), usage logging for cost control, tier-based quotas.
- **Future:** Re-evaluate self-hosted LLMs as open-source medical models improve.
