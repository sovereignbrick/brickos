---
number: 259
github_number: 431
title: "feat: create short demo videos — screen recording + AI transcription + voice rendering"
labels: [feat, marketing, docs, content]
milestone: ux-and-onboarding
---

## Description

Produce short (≤1 min) demo videos showcasing Sovereign Health features. Use a pipeline of open-source and AI tools.

## Toolchain

1. **SimpleScreenRecorder** — screen capture (free, Linux native)
2. **Whisper** (OpenAI) — AI transcription of narration/audio
3. **ElevenLabs.io** — AI voice rendering for professional narration

## Workflow

1. Record screen with SimpleScreenRecorder (1 min max per clip — free tier)
2. Write or transcribe narration script
3. Generate voice-over with ElevenLabs
4. Combine video + audio (ffmpeg or kdenlive)
5. Export as MP4 + generate thumbnail

## Video Ideas

- [ ] "Import your first lab result" — PDF upload → parsed markers
- [ ] "Your biomarker dashboard" — overview of trends and ranges
- [ ] "Ask Dr. Alex" — AI assistant answering health questions
- [ ] "Export your data" — JSON/CSV download, data sovereignty in action
- [ ] "Self-host Sovereign Health" — Docker compose up, done

## Requirements

- [ ] Install and test SimpleScreenRecorder on Pop!_OS
- [ ] Set up Whisper locally (or via API)
- [ ] ElevenLabs account + voice selection (EN + DE)
- [ ] Video template: intro card → demo → outro with CTA
- [ ] Store raw assets in `docs/media/videos/` (or external storage if large)
- [ ] Embed in README / website
