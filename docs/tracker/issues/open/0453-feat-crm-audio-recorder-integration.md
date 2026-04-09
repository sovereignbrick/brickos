---
number: 453
title: "feat: CRM audio recorder integration into meeting detail page"
milestone: "Sovereign CRM MVP"
labels: [feature, frontend]
created: 2026-04-09
priority: P3
---

AudioRecorder component exists at `src/components/audio-recorder.tsx` but needs integration testing and wiring into meeting detail page. Requires Whisper transcription backend (brickos-ai audio support).

Components ready:
- AudioRecorder component (MediaRecorder API, WebM/Opus)
- Meeting detail page with transcribe/summarize buttons

Still needed:
- Wire AudioRecorder into meeting/[id] page
- Audio blob storage endpoint
- Whisper transcription via Ollama or cloud API
- Audio playback in meeting detail
