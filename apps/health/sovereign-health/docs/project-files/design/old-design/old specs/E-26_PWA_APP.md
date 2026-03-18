# E-26 — PWA App: Progressive Web App for Desktop & Mobile

**Epic Owner:** Helmut
**Status:** PLANNING
**Phase:** Growth (post v1.0.0)
**Supersedes:** E-13 (Mobile App) — absorbs T-0191 through T-0195
**Created:** 2026-03-14

---

## Epic Summary

Build a Progressive Web App (PWA) layer on top of the existing Next.js frontend. One codebase serves desktop browsers, mobile browsers, and installable home-screen apps. Includes offline-first architecture with IndexedDB sync, push notifications, and optional native wrappers (Capacitor for mobile stores, Tauri for desktop) later.

**Why PWA first:**
- One codebase (React/Next.js) — no second app to maintain
- No app store gatekeepers — ship instantly
- Covers camera, file input, local storage, basic push
- Matches self-host philosophy (native apps expect cloud backend)
- Wrappers (Capacitor/Tauri) can be added later for store presence

**Known PWA limitations (accept for now):**
- iOS: no Web Bluetooth/NFC, push only on iOS 16.4+ (home screen only)
- No HealthKit/Google Fit integration (needs native wrapper)
- Tor: Stripe/Mailgun won't work over Tor (graceful degradation)

---

## User Stories

### S-040: As a user, I can install the app on my phone's home screen so I can access it like a native app.
**Tasks:** T-0203, T-0204

### S-041: As a user, I can view and add measurements offline so I don't lose data when I have no internet.
**Tasks:** T-0205, T-0206, T-0207

### S-042: As a user, my offline data syncs automatically when I reconnect so I never have to manually upload.
**Tasks:** T-0208, T-0209

### S-043: As a user, I receive push notifications for reminders (measurement, lab, subscription) so I stay on track.
**Tasks:** T-0210, T-0211

### S-044: As a user, I can use the app in Tor Browser for maximum privacy.
**Tasks:** T-0212

### S-045: As a user, I can download the app from the App Store / Play Store for convenience.
**Tasks:** T-0213, T-0214, T-0215

### S-046: As a user, I can use the app as a desktop application (Windows/macOS/Linux).
**Tasks:** T-0216

---

## Task Breakdown

### Phase 1: PWA Enablement (Weeks 1-2)

| ID | Task | Priority | Claude Code Effort | Risk |
|---|---|---|---|---|
| T-0203 | **Web App Manifest + Icons** | HIGH | 1 prompt, ~30 min | 🟢 LOW — additive, no existing code changes |
| | Add `manifest.json` with app name "Sovereign Health Intelligence", theme color, icons (192px, 512px, maskable). Add `<link rel="manifest">` to `_document` or layout. Set `display: "standalone"`, `start_url: "/dashboard"`, `scope: "/"`. Generate icons from existing logo. | | | |
| T-0204 | **Service Worker + Install Prompt** | HIGH | 1-2 prompts, ~1 hr | 🟡 MEDIUM — SW can break caching if misconfigured |
| | Use `next-pwa` or Workbox to generate a service worker. Cache static assets (JS/CSS/images) with stale-while-revalidate. Cache API responses (GET only) with network-first strategy. Add custom "Install App" banner/button for iOS (Safari doesn't auto-prompt). Add `beforeinstallprompt` handler for Chrome/Android. Test: app loads when offline (shows cached UI). | | | |

### Phase 2: Offline-First Data (Weeks 3-6)

| ID | Task | Priority | Claude Code Effort | Risk |
|---|---|---|---|---|
| T-0205 | **IndexedDB data layer** | HIGH | 2-3 prompts, ~2 hrs | 🟡 MEDIUM — new abstraction layer, must not break online flow |
| | Create an IndexedDB store (`sovereign-health-local`) with object stores: `measurements`, `sync_queue`, `cached_user`, `cached_markers`. On page load: read from IDB first, then fetch from API and update IDB. All reads go through IDB → UI renders fast from cache. | | | |
| T-0206 | **Offline measurement entry** | HIGH | 2 prompts, ~1.5 hrs | 🟡 MEDIUM — form submission path changes |
| | When offline: save new measurement to IDB `measurements` store + add to `sync_queue`. Show "Saved offline — will sync when online" toast. Measurement appears in dashboard immediately from IDB. Detect offline via `navigator.onLine` + `online`/`offline` events. | | | |
| T-0207 | **Offline UI indicators** | MEDIUM | 1 prompt, ~30 min | 🟢 LOW — UI-only |
| | Show persistent banner when offline: "You're offline. Data will sync when you reconnect." Grey out features that require network (payment, AI chat, email). Add network status to app context/state. | | | |
| T-0208 | **Sync engine** | HIGH | 3-4 prompts, ~3 hrs | 🔴 HIGH — core data integrity, conflict resolution |
| | Process `sync_queue` when back online. For each queued action: POST to API → on success, remove from queue → update IDB with server response (including server-assigned IDs). Handle conflicts: if server rejects (409), use last-write-wins with timestamp comparison. Retry with exponential backoff (max 3 retries). Use Background Sync API where supported (Chrome/Android). Log sync results for debugging. | | | |
| T-0209 | **Storage persistence + quota management** | LOW | 1 prompt, ~30 min | 🟢 LOW — additive |
| | Call `navigator.storage.persist()` on first install. Monitor storage usage via `navigator.storage.estimate()`. If usage > 80%, warn user. Show storage usage in Settings → Data & Privacy tab. | | | |

### Phase 3: Push Notifications (Weeks 7-8)

| ID | Task | Priority | Claude Code Effort | Risk |
|---|---|---|---|---|
| T-0210 | **Backend push infrastructure** | MEDIUM | 2 prompts, ~1.5 hrs | 🟡 MEDIUM — new backend service |
| | Add `web-push` crate to Rust backend. Generate VAPID keys. New endpoints: `POST /push/subscribe` (store subscription), `DELETE /push/unsubscribe`, `POST /push/send` (admin). Store push subscriptions in `push_subscriptions` table (user_id, endpoint, keys, created_at). | | | |
| T-0211 | **Frontend push registration + notification UI** | MEDIUM | 1-2 prompts, ~1 hr | 🟡 MEDIUM — permission UX matters |
| | Request notification permission (only after user action, not on page load). Register SW push subscription. Send subscription to backend. Handle incoming push events in SW (show notification). Notification types: measurement reminder, lab reminder, subscription expiry. Settings toggle to enable/disable per type. | | | |

### Phase 4: Tor Support (Week 9)

| ID | Task | Priority | Claude Code Effort | Risk |
|---|---|---|---|---|
| T-0212 | **Tor onion service + graceful degradation** | LOW | 1-2 prompts, ~1 hr | 🟢 LOW — server config, minimal code change |
| | Configure backend as Tor hidden service. Add `Onion-Location` header. In PWA: detect Tor Browser (via limited API surface), disable Stripe/Mailgun UI, show "Tor mode" badge. Queue emails for clearnet send. Document self-hosted Tor setup in docs. | | | |

### Phase 5: Native Wrappers (Weeks 10-14) — OPTIONAL

| ID | Task | Priority | Claude Code Effort | Risk |
|---|---|---|---|---|
| T-0213 | **Capacitor project setup + iOS build** | LOW | 2-3 prompts, ~2 hrs | 🟡 MEDIUM — iOS signing, provisioning |
| | Init Capacitor project wrapping the Next.js app. Configure iOS (requires Mac or cloud Mac). Add native plugins: camera, push, file, biometrics. Build IPA. Needs Apple Developer account ($99/yr). | | | |
| T-0214 | **Capacitor Android build** | LOW | 1-2 prompts, ~1 hr | 🟢 LOW — Android is simpler |
| | Configure Android project. Add plugins. Build APK/AAB. Test on device. Publish to Play Store ($25 one-time). | | | |
| T-0215 | **App Store submissions** | LOW | 1 prompt, ~30 min (code), weeks (review) | 🟡 MEDIUM — Apple review unpredictable |
| | Prepare store assets (screenshots, descriptions, privacy policy URL). Submit to App Store + Play Store. Handle review feedback. | | | |
| T-0216 | **Desktop app (Tauri)** | ICEBOX | 2-3 prompts, ~2 hrs | 🟡 MEDIUM — Tauri setup, cross-compile |
| | Wrap Next.js app in Tauri (Rust-based, lighter than Electron). Build for Windows, macOS, Linux. Auto-update mechanism. Sign binaries. | | | |

---

## Effort Summary

| Phase | Prompts | Claude Code Time | Calendar Weeks | Risk |
|---|---|---|---|---|
| **1. PWA Enablement** | 2-3 | ~1.5 hrs | 1-2 | 🟢 LOW |
| **2. Offline-First** | 9-11 | ~7.5 hrs | 3-4 | 🟡-🔴 MEDIUM-HIGH |
| **3. Push Notifications** | 3-4 | ~2.5 hrs | 1-2 | 🟡 MEDIUM |
| **4. Tor Support** | 1-2 | ~1 hr | 1 | 🟢 LOW |
| **5. Native Wrappers** | 6-9 | ~5.5 hrs | 3-4 | 🟡 MEDIUM |
| **TOTAL** | **21-29 prompts** | **~18 hrs** | **9-13 weeks** | |

---

## Risk Assessment

### Low Risk (won't break existing code):
- T-0203 Manifest + icons — purely additive
- T-0207 Offline UI indicators — new component, no changes to existing
- T-0209 Storage persistence — one API call
- T-0212 Tor — server config + UI badge

### Medium Risk (touches existing patterns):
- T-0204 Service Worker — can cause caching bugs (stale pages, failed updates). **Mitigation:** use Workbox with sensible defaults, add version-based cache busting.
- T-0205/T-0206 IndexedDB layer — introduces a data abstraction between UI and API. Must not break the current "fetch from API" flow. **Mitigation:** implement as a transparent cache layer, not a replacement.
- T-0210/T-0211 Push — new backend service + permissions. **Mitigation:** behind feature flag.
- T-0213/T-0214 Capacitor — wrapping a Next.js app in Capacitor has known edge cases (routing, SSR). **Mitigation:** use static export mode for the wrapped version.

### High Risk (data integrity):
- T-0208 Sync engine — **most dangerous task**. Conflicts between offline writes and server state can cause data loss or duplication. **Mitigation:** extensive testing, last-write-wins with conflict log visible to user, manual resolve option.

---

## Cost Estimate (OpenClaw prompt generation)

Based on current Claude Opus 4.6 usage for prompt creation:

| Item | Estimate |
|---|---|
| Prompts to generate | 21-29 |
| Avg tokens per prompt generation | ~8K input + ~4K output |
| Model | Claude Opus 4.6 |
| Cost per prompt (est.) | ~$0.30-0.50 |
| **Total OpenClaw cost for prompts** | **~$8-15** |
| Claude Code execution (on laptop) | Separate — depends on Anthropic plan |

This is the cost for ME (swickDoctor) to create the prompts. The actual Claude Code execution cost depends on your Anthropic subscription/API plan and is typically 10-20x more than prompt generation.

**Estimated Claude Code execution cost (rough):**
- 21-29 prompts × ~$2-5 per prompt execution = **~$50-150 total**
- Spread over 9-13 weeks = **~$5-15/week**

---

## Recommended Execution Order

1. **Phase 1 first** (T-0203, T-0204) — quick wins, app becomes installable
2. **Phase 2 next** (T-0205 → T-0206 → T-0207 → T-0208 → T-0209) — offline is the killer feature
3. **Phase 3** (T-0210, T-0211) — push notifications, nice to have
4. **Phase 4** (T-0212) — Tor, niche but on-brand
5. **Phase 5 only if needed** — native wrappers are expensive for marginal gain

**Recommendation:** Do Phase 1+2 before BTC Prague (June 11-13). That gives you an installable, offline-capable app to demo. Phases 3-5 are post-launch.

---

## Superseded Tasks from E-13

| Old ID | Old Title | Disposition |
|---|---|---|
| T-0191 | Spike: mobile dev options | → Absorbed by this spec (spike done) |
| T-0192 | PWA enhancements | → Replaced by T-0203, T-0204 |
| T-0193 | Linux phone testing | → Keep as-is in E-13, LOW priority |
| T-0194 | Apple App Store assessment | → Replaced by T-0213, T-0215 |
| T-0195 | Android Play Store listing | → Replaced by T-0214, T-0215 |
