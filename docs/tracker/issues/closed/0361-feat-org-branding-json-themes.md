---
github_number: 361
title: "feat: org branding with JSON theme templates"
milestone: platform-admin-gui
labels: [feat, P2]
---

## Overview

Org admins (tech admin/owner) can customize branding: logo, colors, theme template.

## Requirements

- Upload org logo (SVG/PNG, max 100KB)
- Color overrides (primary, accent, background)
- JSON theme template system with `extends` base theme
- Built-in presets: brickos-dark (default), brickos-light, clinical, minimal
- Upload custom JSON theme (validated against JSON Schema)
- Download default template
- Live preview before applying

## Blocked By

- #0346 (admin layout)
- #0351 (org roles -- tech admin access)
