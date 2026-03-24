# Design: Flatpak Desktop Deployment

**Issue:** TBD
**Status:** Draft
**Date:** 2026-03-24

## Problem

Sovereign Health is currently available as a web app (SaaS) and an installable PWA. However, Linux desktop users — especially on Pop!_OS, Fedora, and other modern distributions — discover and install applications primarily through their app stores (GNOME Software, Pop!_Shop, KDE Discover), all of which are backed by **Flathub**. Without a Flatpak package on Flathub, our app is invisible to this audience.

A Flatpak distribution would:
1. Give us presence in Pop!_Shop / GNOME Software / KDE Discover
2. Provide a sandboxed, auto-updating desktop experience
3. Align with our sovereignty philosophy — users install from a neutral store, not a Big Tech gatekeeper
4. Complement the existing PWA (PWA = mobile/Chromebook, Flatpak = Linux desktop)

## Current State

| Layer | What exists today | Relevance to Flatpak |
|-------|-------------------|----------------------|
| Frontend | Next.js 16, standalone output, Serwist service worker | Will be the app loaded inside the wrapper |
| PWA manifest | `manifest.json` with icons, `standalone` display | Can be reused for Flatpak metadata |
| Icons | 192x192, 512x512 PNG, apple-touch-icon | Need SVG for Flatpak (see requirements) |
| Docker | Multi-stage `Dockerfile` producing `node:22-alpine` runtime | Not directly usable — Flatpak ≠ Docker |
| Backend | Rust API at `api.sovereignhealth.io` | Flatpak app connects to SaaS API (no local backend) |

## Approach

### Architecture Decision: WebView Wrapper

Since Sovereign Health is a web application with an existing SaaS backend, the Flatpak will be a **thin native wrapper** that loads the production web app in a WebView. This is the standard approach for web-first apps (e.g., Spotify, Element, Todoist on Flathub).

**Options considered:**

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **A. Electron wrapper** | Full Chromium, mature ecosystem | ~150MB+ overhead, heavy RAM, Electron is a maintenance burden | Rejected |
| **B. Tauri wrapper** | Small binary (~5-15MB), Rust-native, WebKitGTK | Aligns with Rust stack, lightweight, good Flatpak support | **Selected** |
| **C. GNOME WebKitGTK app** | Smallest possible, pure GTK | No framework, manual plumbing, limited dev tooling | Backup option |
| **D. Firefox/Chromium `--app` mode** | Zero code | No custom icon in app store, no control over UX | Rejected |

**Tauri** is the best fit because:
- We already use Rust (our entire backend is Rust, Cargo workspace)
- Produces a ~5-15MB AppImage/binary vs ~150MB+ Electron
- Uses system WebKitGTK (required by Flatpak anyway — no bundled browser)
- Has first-class Flatpak support via `tauri-plugin-flatpak`
- Future path to Windows/macOS desktop if needed (Design 023, Phase 5)

### What the Flatpak App Does

```
┌──────────────────────────────────────────┐
│          io.brickos.SovereignHealth      │
│              (Flatpak sandbox)           │
│                                          │
│  ┌────────────────────────────────┐      │
│  │     Tauri Shell (Rust)         │      │
│  │  - Window management          │      │
│  │  - System tray (optional)     │      │
│  │  - Deep link handling         │      │
│  │  - Auto-update check          │      │
│  └────────────┬───────────────────┘      │
│               │                          │
│  ┌────────────▼───────────────────┐      │
│  │     WebKitGTK WebView          │      │
│  │  loads: app.sovereignhealth.io │      │
│  │  + service worker (offline)    │      │
│  │  + local storage / IDB         │      │
│  └────────────────────────────────┘      │
│                                          │
│  Permissions: network, notifications     │
└──────────────────────────────────────────┘
         │
         ▼ HTTPS
┌──────────────────────┐
│ api.sovereignhealth.io │
│  (existing SaaS API)  │
└──────────────────────┘
```

The Flatpak does **not** bundle the backend or database. It is a client that connects to the existing SaaS infrastructure, just like the PWA. Offline capabilities come from the existing service worker and IndexedDB layer (Design 023).

---

## Implementation

### Phase 1: Tauri Desktop App (foundation)

**New directory:** `apps/health/sovereign-health/desktop/`

```
desktop/
  src-tauri/
    Cargo.toml          # Tauri app crate
    src/
      main.rs           # Window creation, load URL
      lib.rs            # Version constant
    tauri.conf.json     # App config (window size, URL, permissions)
    icons/              # Generated from SVG via `tauri icon`
  flatpak/
    io.brickos.SovereignHealth.yml        # Flatpak manifest
    io.brickos.SovereignHealth.desktop    # Desktop entry
    io.brickos.SovereignHealth.metainfo.xml  # AppStream metadata
    io.brickos.SovereignHealth.svg        # App icon (SVG required)
```

**`src-tauri/Cargo.toml`** (minimal):
```toml
[package]
name = "sovereign-health-desktop"
version = "0.26.0"
edition = "2024"

[dependencies]
tauri = { version = "2", features = ["protocol-asset"] }
tauri-plugin-notification = "2"
tauri-plugin-shell = "2"

[build-dependencies]
tauri-build = "2"
```

**`src-tauri/src/main.rs`** (minimal):
```rust
#[cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**`src-tauri/tauri.conf.json`** (key fields):
```json
{
  "productName": "Sovereign Health Intelligence",
  "identifier": "io.brickos.SovereignHealth",
  "version": "0.26.0",
  "app": {
    "windows": [
      {
        "title": "Sovereign Health Intelligence",
        "url": "https://app.sovereignhealth.io",
        "width": 1280,
        "height": 800,
        "minWidth": 375,
        "minHeight": 667,
        "decorations": true,
        "resizable": true
      }
    ]
  },
  "bundle": {
    "icon": ["icons/icon.png"],
    "linux": {
      "deb": { "depends": ["libwebkit2gtk-4.1-0"] },
      "appimage": { "bundleMediaFramework": false }
    }
  }
}
```

### Phase 2: Flatpak Packaging

#### App ID

**`io.brickos.SovereignHealth`** — follows reverse-DNS convention. We own `brickos.io`, so this is valid.

#### Desktop Entry (`io.brickos.SovereignHealth.desktop`)

```ini
[Desktop Entry]
Name=Sovereign Health Intelligence
GenericName=Health Biomarker Tracker
Comment=Track blood work, biomarkers, and health trends with full data sovereignty
Comment[de]=Blutwerte, Biomarker und Gesundheitstrends mit voller Datenhoheit verfolgen
Exec=sovereign-health-desktop
Icon=io.brickos.SovereignHealth
Terminal=false
Type=Application
Categories=Science;MedicalSoftware;Health;
Keywords=health;blood;biomarker;lab;tracker;
Keywords[de]=Gesundheit;Blut;Biomarker;Labor;Tracker;
StartupWMClass=sovereign-health-desktop
```

#### AppStream Metadata (`io.brickos.SovereignHealth.metainfo.xml`)

This is what app stores display — description, screenshots, releases.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<component type="desktop-application">
  <id>io.brickos.SovereignHealth</id>
  <name>Sovereign Health Intelligence</name>
  <summary>Track blood work and biomarkers with full data sovereignty</summary>
  <summary xml:lang="de">Blutwerte und Biomarker mit voller Datenhoheit verfolgen</summary>

  <metadata_license>CC0-1.0</metadata_license>
  <project_license>AGPL-3.0-or-later</project_license>

  <developer id="io.brickos">
    <name>Sovereign Brick</name>
  </developer>

  <description>
    <p>
      Sovereign Health Intelligence helps you track blood work results,
      biomarkers, and health trends over time. Import lab results from PDF
      or CSV, visualize trends with interactive charts, and get AI-powered
      insights from Dr. Alex.
    </p>
    <p xml:lang="de">
      Sovereign Health Intelligence hilft Ihnen, Blutwerte, Biomarker und
      Gesundheitstrends zu verfolgen. Importieren Sie Laborergebnisse aus
      PDF oder CSV, visualisieren Sie Trends mit interaktiven Diagrammen
      und erhalten Sie KI-gestuetzte Einblicke von Dr. Alex.
    </p>
    <p>Key features:</p>
    <ul>
      <li>Import blood work from PDF, CSV, or manual entry</li>
      <li>Track 200+ biomarkers with reference ranges</li>
      <li>Interactive trend charts and health zone analysis</li>
      <li>AI health assistant (Dr. Alex)</li>
      <li>Multi-language support (English, German)</li>
      <li>Full data sovereignty — your data, your rules</li>
    </ul>
  </description>

  <url type="homepage">https://sovereignhealth.io</url>
  <url type="bugtracker">https://github.com/sovereignbrick/brickos/issues</url>

  <launchable type="desktop-id">io.brickos.SovereignHealth.desktop</launchable>

  <provides>
    <binary>sovereign-health-desktop</binary>
  </provides>

  <branding>
    <color type="primary" scheme_preference="dark">#09090b</color>
  </branding>

  <screenshots>
    <screenshot type="default">
      <caption>Dashboard with biomarker overview and health zones</caption>
      <image type="source" width="1280" height="800">
        https://sovereignhealth.io/screenshots/dashboard.png
      </image>
    </screenshot>
    <screenshot>
      <caption>Biomarker trend analysis</caption>
      <image type="source" width="1280" height="800">
        https://sovereignhealth.io/screenshots/trends.png
      </image>
    </screenshot>
  </screenshots>

  <content_rating type="oars-1.1">
    <content_attribute id="social-info">mild</content_attribute>
  </content_rating>

  <releases>
    <release version="0.26.0" date="2026-03-23">
      <description>
        <p>Initial Flatpak release</p>
      </description>
    </release>
  </releases>

  <requires>
    <internet>always</internet>
  </requires>
</component>
```

#### Flatpak Manifest (`io.brickos.SovereignHealth.yml`)

```yaml
app-id: io.brickos.SovereignHealth
runtime: org.gnome.Platform
runtime-version: "47"
sdk: org.gnome.Sdk
sdk-extensions:
  - org.freedesktop.Sdk.Extension.rust-stable
command: sovereign-health-desktop

finish-args:
  - --share=ipc
  - --share=network                    # Required: connects to SaaS API
  - --socket=fallback-x11
  - --socket=wayland
  - --device=dri                       # GPU acceleration for WebKitGTK
  - --talk-name=org.freedesktop.Notifications  # Desktop notifications

modules:
  - name: sovereign-health-desktop
    buildsystem: simple
    build-options:
      append-path: /usr/lib/sdk/rust-stable/bin
      env:
        CARGO_HOME: /run/build/sovereign-health-desktop/cargo
    build-commands:
      - cargo build --release
      - install -Dm755 target/release/sovereign-health-desktop /app/bin/sovereign-health-desktop
      - install -Dm644 flatpak/io.brickos.SovereignHealth.desktop /app/share/applications/io.brickos.SovereignHealth.desktop
      - install -Dm644 flatpak/io.brickos.SovereignHealth.metainfo.xml /app/share/metainfo/io.brickos.SovereignHealth.metainfo.xml
      - install -Dm644 flatpak/io.brickos.SovereignHealth.svg /app/share/icons/hicolor/scalable/apps/io.brickos.SovereignHealth.svg
    sources:
      - type: dir
        path: .
```

### Phase 3: Flathub Submission (getting into Pop!_Shop)

This is the critical step for app store visibility. Here's the exact process:

#### Prerequisites (must complete before submission)

| Requirement | Status | Action needed |
|-------------|--------|---------------|
| **App ID owns domain** | We own `brickos.io` | Verify via Flathub |
| **SVG icon** | Missing | Create from existing PNG or redesign |
| **Screenshots** (min 1, 1248x702+) | Missing | Capture from production app |
| **AppStream metainfo.xml** | Draft above | Finalize descriptions EN + DE |
| **OARS content rating** | Draft above | Verify at oars.freedesktop.org |
| **App builds with flatpak-builder** | Not started | Test locally first |
| **License: AGPL-3.0** | Already set | Include LICENSE file |

#### Flathub Submission Steps

1. **Fork `flathub/flathub`** on GitHub
2. **Create branch** `new-pr/io.brickos.SovereignHealth`
3. **Add manifest** `io.brickos.SovereignHealth.yml` to the repo root
4. **Open PR** to `flathub/flathub` — this triggers:
   - Automated build on Flathub's CI (BuildBot)
   - Review by Flathub maintainers (typically 1-2 weeks)
   - Checks: valid AppStream, valid desktop entry, no sandbox escapes, screenshots load
5. **Address review feedback** — common asks:
   - Tighten sandbox permissions (remove unnecessary `--filesystem` etc.)
   - Fix AppStream validation warnings (`appstreamcli validate`)
   - Ensure icon is truly SVG (not PNG renamed to .svg)
6. **Merge** — app appears on Flathub within hours
7. **Auto-publish** — subsequent releases: update the manifest in the Flathub repo with new source tag/commit

#### How App Stores Pick It Up

Once on Flathub, the app automatically appears in:

| Store | Distribution | How |
|-------|-------------|-----|
| **Pop!_Shop** | Pop!_OS | Pop!_Shop indexes Flathub by default (enabled since Pop!_OS 22.04) |
| **GNOME Software** | Ubuntu, Fedora, etc. | Reads Flathub if user has `flatpak` + Flathub remote configured |
| **KDE Discover** | KDE Plasma distros | Same — reads Flathub remote |
| **Flathub.org** | Web | Direct listing with install button |

**Pop!_OS specifically:** Pop!_Shop has Flathub as a default source since 22.04. Any app on Flathub automatically shows in Pop!_Shop — no additional registration needed. System76 curates a "Pop!_Picks" section, but the full Flathub catalog is searchable.

### Phase 4: CI/CD Integration

Add a GitHub Actions workflow to automate Flatpak builds:

```yaml
# .github/workflows/flatpak-build.yml
name: Flatpak Build
on:
  push:
    tags: ["v*"]
  pull_request:
    paths: ["apps/health/sovereign-health/desktop/**"]

jobs:
  flatpak:
    runs-on: ubuntu-latest
    container:
      image: bilelmoussaoui/flatpak-github-actions:gnome-47
    steps:
      - uses: actions/checkout@v4
      - uses: flatpak/flatpak-github-actions/flatpak-builder@v6
        with:
          manifest-path: apps/health/sovereign-health/desktop/flatpak/io.brickos.SovereignHealth.yml
          bundle: sovereign-health.flatpak
```

For Flathub releases, update the manifest in the `flathub/io.brickos.SovereignHealth` repo (auto-created after initial PR merge) with the new version tag.

---

## Icon Requirements

Flathub requires a **scalable SVG icon** (not PNG). The icon must:

- Be named `{app-id}.svg` → `io.brickos.SovereignHealth.svg`
- Be at least 128x128 logical pixels
- Not be a simple rectangle/screenshot
- Look good at 64x64 (app grid) and 128x128 (detail page)
- Have transparent background (for light/dark theme compatibility)

**Action:** Create an SVG version of the existing Sovereign Health logo/icon. The current `android-chrome-512x512.png` can be vectorized or a new SVG created.

---

## Self-Hosted Variant

For users running their own Sovereign Health instance (Design 022, self-host doc), the Tauri app can accept a custom backend URL:

```rust
// In main.rs — check for config file or env var
let api_url = std::env::var("SHI_API_URL")
    .unwrap_or_else(|_| "https://app.sovereignhealth.io".to_string());
```

Or via a first-run setup screen where the user enters their instance URL. This keeps the Flatpak useful for both SaaS and self-hosted users.

---

## Effort Estimate

| Phase | Effort | Dependencies |
|-------|--------|-------------|
| 1. Tauri desktop app | 5 pts | None — can start immediately |
| 2. Flatpak packaging + local testing | 3 pts | Phase 1 |
| 3. SVG icon + screenshots + Flathub submission | 3 pts | Phase 2, design assets |
| 4. CI/CD integration | 2 pts | Phase 3 accepted |
| **Total** | **13 pts** | |

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Flathub review rejection | Medium | Run `appstreamcli validate` + `flatpak-builder --force-clean` locally first |
| WebKitGTK rendering differences vs Chrome | Medium | Test on GNOME + KDE; our app already works on Firefox/WebKit (PWA) |
| Tauri 2.x breaking changes | Low | Pin exact version in Cargo.toml |
| Flathub review backlog (1-2 weeks) | Low | Submit early, iterate on feedback |
| Self-hosted URL configuration UX | Low | Start with env var, add settings UI later |

## Open Questions

- [ ] Do we want system tray integration (e.g., notification badge)?
- [ ] Should the Flatpak also bundle a local backend option (offline-first without SaaS)?
- [ ] Do we need Snap packaging in addition to Flatpak (for Ubuntu Software Center)?
- [ ] Should the Tauri crate live inside the existing Cargo workspace or standalone?

## References

- [Flathub submission guidelines](https://docs.flathub.org/docs/for-app-authors/submission)
- [Flathub app quality guidelines](https://docs.flathub.org/docs/for-app-authors/metainfo-guidelines)
- [AppStream metadata specification](https://www.freedesktop.org/software/appstream/docs/)
- [Tauri Flatpak guide](https://v2.tauri.app/distribute/flatpak/)
- [OARS content rating generator](https://hughsie.github.io/oars/)
- Design 023: Progressive Web App
- Design 022: Deployment Architecture & Scaling
