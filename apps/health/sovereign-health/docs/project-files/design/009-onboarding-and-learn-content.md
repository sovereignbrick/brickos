# Design: Onboarding Flow & Learn Page Content

**Issue:** [#19](https://github.com/sovereignbrick/brickos/issues/19), [#22](https://github.com/sovereignbrick/brickos/issues/22)
**Status:** Ready for content
**Date:** 2026-03-18

## Overview

Two interconnected systems guide new users:

1. **In-app onboarding checklist** — 6-step progress tracker on the dashboard
2. **Learn page** — Tutorial cards with screenshots and videos on the marketing website

Both are fully built. This document describes how to configure steps, add content, and customize the flow.

---

## 1. In-App Onboarding Checklist

### Architecture

- **Component:** `frontend/src/components/onboarding-checklist.tsx`
- **Rendered in:** `frontend/src/app/dashboard/page.tsx` (for authenticated non-demo users)
- **State storage:** `localStorage` (no backend required)
- **i18n keys:** `onboarding.*` in `frontend/src/i18n/messages/{en,de}.json`

### Current 6 Steps

| # | Key | Icon | Auto-detected? | Completion trigger | Link |
|---|-----|------|----------------|-------------------|------|
| 1 | `profile` | 👤 | Yes | `gender`, `height_cm`, or `default_weight_kg` set in profile | `/settings?tab=profile` |
| 2 | `device` | 🔬 | No (visit-based) | User visits `/settings?tab=devices` | `/settings?tab=devices` |
| 3 | `measurement` | 📊 | Yes | Any zone has `markers_with_data > 0` | `/measurements/new` |
| 4 | `marker` | 🧬 | No (visit-based) | User visits any `/markers/*` or `/zones/*` page | `/zones/energy_metabolic` |
| 5 | `trends` | 📈 | No (visit-based) | User visits `/trends` | `/trends` |
| 6 | `doctor` | 💬 | No (visit-based) | User visits `/doctor-chat` | `/doctor-chat` |

### How to Add a New Step

1. Add the step object to the `newSteps` array in `onboarding-checklist.tsx`:

```tsx
{
  key: 'your_step_key',
  icon: '🆕',
  completed: manual['your_step_key'] || false, // or auto-detect logic
  href: '/target-page',
}
```

2. Add the i18n key in both `en.json` and `de.json`:

```json
"onboarding": {
  "steps": {
    "your_step_key": "Your step label"
  }
}
```

3. If the step uses visit-based completion, add it to the `manualMappings` object:

```tsx
const manualMappings: Record<string, string> = {
  '/target-page': 'your_step_key',
}
```

### How to Change Step Order

Reorder the objects in the `newSteps` array. The array order determines display order.

### How to Change Auto-Detection Logic

Auto-detected steps fetch data from `api.settings.get()` and `api.zones.list()`. To add new auto-detection:

```tsx
// Example: auto-detect if user has sent a Dr. Alex message
const [settingsRes, zonesRes, chatRes] = await Promise.all([
  api.settings.get().catch(() => null),
  api.zones.list().catch(() => null),
  api.doctorChat.list().catch(() => null), // add this API call
])

// Then in the step:
{
  key: 'doctor',
  icon: '💬',
  completed: chatRes?.data?.length > 0, // auto-detect instead of manual
  href: '/doctor-chat',
}
```

### Dismissal Behavior

- Users can dismiss the checklist via the "Dismiss" button
- Dismissed state is stored in `localStorage` as `sh_onboarding_dismissed_{userId}`
- Checklist auto-dismisses when all steps are complete
- To reset for testing: clear `sh_onboarding_dismissed_*` and `sh_onboarding_manual_*` from localStorage

### Layout

The checklist renders as a card at the top of the dashboard, below the page heading and above the health zones grid. It uses a 2-column (mobile) / 3-column (desktop) grid for steps, with a progress bar.

---

## 2. Learn Page (Website)

### Architecture

- **Page:** `website/src/app/learn/page.tsx`
- **Layout:** `website/src/app/learn/layout.tsx` (metadata/SEO)
- **i18n keys:** `learn.*` in `website/src/locales/{en,de}.json`
- **Screenshots:** `website/public/screenshots/`
- **Lightbox:** `website/src/components/screenshot-lightbox.tsx`

### Current Tutorials

| # | Key | Icon | Has Screenshots | Has Video |
|---|-----|------|-----------------|-----------|
| 1 | `gettingStarted` | 🚀 | Yes (1) | Placeholder |
| 2 | `healthZonesExplained` | 🔬 | No | Placeholder |
| 3 | `usingDrAlex` | 💬 | Yes (1) | Placeholder |
| 4 | `selfHostedSetup` | 🖥️ | No | Placeholder |
| 5 | `customizingThresholds` | 🎯 | Yes (1) | Placeholder |

### How to Add a New Tutorial

1. Add to the `TUTORIALS` array in `website/src/app/learn/page.tsx`:

```tsx
{
  key: "yourTutorialKey",
  icon: "🆕",
  screenshots: [
    { base: "/screenshots/04-your-screenshot", key: "yourScreenshot" },
  ],
  videoUrl: "https://youtube.com/embed/VIDEO_ID", // optional
}
```

2. Add i18n keys in `website/src/locales/en.json` and `de.json`:

```json
"learn": {
  "tutorials": {
    "yourTutorialKey": {
      "title": "Your Tutorial Title",
      "description": "Description of what this tutorial covers."
    }
  }
}
```

### How to Add a Video

Set the `videoUrl` field on the tutorial. Supported formats:

| Provider | URL format |
|----------|-----------|
| YouTube | `https://youtube.com/embed/VIDEO_ID` |
| Vimeo | `https://player.vimeo.com/video/VIDEO_ID` |
| HeyGen | Use the embed URL from HeyGen's share dialog |
| Self-hosted | Direct URL to `.mp4` file |

Until a video URL is provided, the tutorial shows a "Video coming soon" placeholder.

### How to Add Screenshots

1. **Capture** the screenshot at 1920x1080 or 1280x720, dark theme
2. **Name** it following the convention: `{order}-{slug}-{LOCALE}.png`
   - Example: `04-trends-overview-EN.png`, `04-trends-overview-DE.png`
3. **Place** both locale versions in `website/public/screenshots/`
4. **Reference** in the tutorial's `screenshots` array:

```tsx
screenshots: [
  { base: "/screenshots/04-trends-overview", key: "trendsOverview" },
]
```

5. **Add caption** i18n key at `home.demo.screenshots.trendsOverview` in both locale files

The lightbox automatically falls back from locale-specific (`-DE.png`) to English (`-EN.png`) if the locale image is missing.

---

## 3. In-App Screenshot Gallery

### Architecture

- **Gallery component:** `frontend/src/components/screenshot-gallery.tsx`
- **Lightbox component:** `frontend/src/components/screenshot-lightbox.tsx`

### Usage

Import and use in any frontend page:

```tsx
import { ScreenshotGallery } from '@/components/screenshot-gallery'

const screenshots = [
  { src: '/screenshots/01-dashboard.png', alt: 'Dashboard', caption: 'Your health overview' },
  { src: '/screenshots/02-trends.png', alt: 'Trends', caption: 'Track changes over time' },
]

<ScreenshotGallery screenshots={screenshots} columns={3} />
```

Props:
- `screenshots` — array of `{ src, alt, caption? }`
- `columns` — `2 | 3 | 4` (default: 3)

### Placing Screenshots in the Frontend App

Screenshots for the frontend app go in `frontend/public/screenshots/`. The same naming convention applies.

---

## 4. Video Embed Component (In-App)

### Architecture

- **Component:** `frontend/src/components/video-embed.tsx`

### Usage

```tsx
import { VideoEmbed } from '@/components/video-embed'

<VideoEmbed
  src="https://youtube.com/watch?v=VIDEO_ID"
  title="Getting Started with Sovereign Health"
  poster="/screenshots/01-dashboard.png"  // optional thumbnail
/>
```

Props:
- `src` — YouTube/Vimeo URL or direct video file URL
- `title` — accessible title for the iframe/video
- `poster` — optional thumbnail image (click-to-play for embeds)
- `aspectRatio` — `'16/9'` (default) or `'4/3'`

---

## 5. Content Checklist

Screenshots and videos to produce for launch:

### Screenshots Needed

| # | Slug | Page to capture | Notes |
|---|------|----------------|-------|
| 01 | `add-your-devices` | Settings > Devices | Already exists (EN + DE) |
| 02 | `dr-alex-medication-import` | Dr. Alex chat | Already exists (EN + DE) |
| 03 | `your-influence-factors` | Settings > Medications | Already exists (EN + DE) |
| 04 | `dashboard-overview` | Dashboard | Health zones grid with data |
| 05 | `trends-chart` | Trends | Multi-marker trend chart |
| 06 | `health-zones-detail` | Zone detail page | Energy & Metabolic with markers |
| 07 | `measurement-entry` | New measurement | Form with marker values |
| 08 | `custom-thresholds` | Settings > Thresholds | Custom reference ranges |

### Videos Needed (HeyGen AI Avatar)

| # | Tutorial | Duration | Content |
|---|----------|----------|---------|
| 1 | Getting Started | 2-3 min | Account setup, first device, first measurement |
| 2 | Health Zones Explained | 2-3 min | 8 zones, what they mean, traffic light system |
| 3 | Using Dr. Alex | 2-3 min | Effective prompts, medication import, limitations |
| 4 | Self-Hosted Setup | 3-5 min | Docker setup, .env config, first login |
| 5 | Customizing Thresholds | 2-3 min | Why customize, how to set, protocol-based ranges |

### Production Steps

1. Capture screenshots in both EN and DE at 1920x1080
2. Place in `website/public/screenshots/` with naming convention
3. Record HeyGen videos (EN first, DE later)
4. Upload to YouTube (unlisted) or self-host
5. Add video URLs to `TUTORIALS` array in `learn/page.tsx`
6. Update screenshot references in tutorial cards

---

## 6. Connecting Onboarding to Learn Page

The in-app onboarding checklist and the website Learn page serve different audiences:

- **Onboarding checklist** — Guides logged-in users through first actions (doing)
- **Learn page** — Teaches visitors and users about features (learning)

To link them: each onboarding step can optionally link to its corresponding Learn page tutorial via the website URL (e.g., `https://sovereignhealth.io/learn/#getting-started`). This is not currently implemented but can be added by extending the step object with an optional `learnUrl` field.
