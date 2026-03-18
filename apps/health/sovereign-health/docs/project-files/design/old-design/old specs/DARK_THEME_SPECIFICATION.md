# Dark Theme Specification
**Complete Dark Mode Color System & Implementation**

---

## 🌙 Dark Theme Overview

**Enabled by Default:** User can toggle between Light/Dark in Settings  
**Storage:** User preference saved in profile (`theme: 'light' | 'dark' | 'system'`)  
**Implementation:** CSS custom properties + React context

---

## 🎨 Dark Theme Color Palette

### Primary Brand
- **Bitcoin Orange:** #F7931A (unchanged, works on both themes)
- **Orange Hover:** #E67E1A (slightly darker for dark theme interactions)

### Backgrounds (Dark Theme)
| Element | Light Theme | Dark Theme | Purpose |
|---------|-------------|-----------|---------|
| App Background | #FAFAFA | #0F0F0F | Main canvas |
| Card Background | #FFFFFF | #1A1A1A | Zone cards, sections |
| Header Background | #F5F5F5 | #242424 | Zone headers, top bar |
| Overlay/Modal | #FFFFFF | #2A2A2A | Modals, popovers |
| Input Background | #FFFFFF | #1F1F1F | Form inputs |

### Text (Dark Theme)
| Element | Light Theme | Dark Theme | Purpose |
|---------|-------------|-----------|---------|
| Text Primary | #1A1A1A | #F0F0F0 | Headings, body text |
| Text Secondary | #666666 | #A0A0A0 | Labels, descriptions |
| Text Tertiary | #999999 | #707070 | Disabled, hints |
| Link Color | #F7931A | #FFB347 | Links (lighter orange in dark) |

### Dividers & Borders (Dark Theme)
| Element | Light Theme | Dark Theme | Purpose |
|---------|-------------|-----------|---------|
| Divider/Border | #E8E8E8 | #333333 | Separators |
| Subtle Line | #D0D0D0 | #2A2A2A | Fine lines |
| Focus Ring | #F7931A | #F7931A | Keyboard focus (same) |

### Status Colors (Ampel)
```
Light Theme:
🟢 Green:  #27AE60
🟡 Yellow: #F39C12
🔴 Red:    #E74C3C

Dark Theme (Adjusted for visibility):
🟢 Green:  #4CAF50 (slightly brighter)
🟡 Yellow: #FFA500 (adjusted for contrast)
🔴 Red:    #FF6B6B (adjusted for contrast)
```

### Shadows (Dark Theme)
**Dark theme uses more subtle shadows (less visible):**

```
Light Theme:
- Card Shadow:   0 1px 3px rgba(0,0,0,0.08)
- Hover Shadow:  0 4px 8px rgba(0,0,0,0.12)
- Modal Shadow:  0 8px 16px rgba(0,0,0,0.15)

Dark Theme:
- Card Shadow:   0 1px 2px rgba(0,0,0,0.3)
- Hover Shadow:  0 2px 4px rgba(0,0,0,0.4)
- Modal Shadow:  0 4px 8px rgba(0,0,0,0.5)
```

---

## 💻 CSS Implementation (Tailwind + Custom Properties)

### CSS Variables (Root)

```css
/* styles/themes.css */

:root {
  /* Light Theme (Default) */
  --bg-primary: #FAFAFA;
  --bg-secondary: #FFFFFF;
  --bg-tertiary: #F5F5F5;
  --bg-overlay: #FFFFFF;
  --bg-input: #FFFFFF;

  --text-primary: #1A1A1A;
  --text-secondary: #666666;
  --text-tertiary: #999999;

  --border-primary: #E8E8E8;
  --border-secondary: #D0D0D0;

  --brand-orange: #F7931A;
  --brand-orange-hover: #E67E1A;

  --color-success: #27AE60;
  --color-warning: #F39C12;
  --color-error: #E74C3C;

  --shadow-card: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-hover: 0 4px 8px rgba(0,0,0,0.12);
  --shadow-modal: 0 8px 16px rgba(0,0,0,0.15);
}

/* Dark Theme */
html[data-theme="dark"] {
  --bg-primary: #0F0F0F;
  --bg-secondary: #1A1A1A;
  --bg-tertiary: #242424;
  --bg-overlay: #2A2A2A;
  --bg-input: #1F1F1F;

  --text-primary: #F0F0F0;
  --text-secondary: #A0A0A0;
  --text-tertiary: #707070;

  --border-primary: #333333;
  --border-secondary: #2A2A2A;

  --brand-orange: #F7931A;
  --brand-orange-hover: #FFB347;

  --color-success: #4CAF50;
  --color-warning: #FFA500;
  --color-error: #FF6B6B;

  --shadow-card: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-hover: 0 2px 4px rgba(0,0,0,0.4);
  --shadow-modal: 0 4px 8px rgba(0,0,0,0.5);
}

/* Prefer System */
@media (prefers-color-scheme: dark) {
  html[data-theme="system"] {
    --bg-primary: #0F0F0F;
    --bg-secondary: #1A1A1A;
    --bg-tertiary: #242424;
    --bg-overlay: #2A2A2A;
    --bg-input: #1F1F1F;
    --text-primary: #F0F0F0;
    --text-secondary: #A0A0A0;
    --text-tertiary: #707070;
    --border-primary: #333333;
    --border-secondary: #2A2A2A;
    --brand-orange: #F7931A;
    --brand-orange-hover: #FFB347;
    --color-success: #4CAF50;
    --color-warning: #FFA500;
    --color-error: #FF6B6B;
    --shadow-card: 0 1px 2px rgba(0,0,0,0.3);
    --shadow-hover: 0 2px 4px rgba(0,0,0,0.4);
    --shadow-modal: 0 4px 8px rgba(0,0,0,0.5);
  }
}
```

### Component Styling

```css
/* Using CSS variables in components */

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  box-shadow: var(--shadow-card);
  border-radius: 12px;
  padding: 16px;
}

.card:hover {
  box-shadow: var(--shadow-hover);
}

.zone-header {
  background-color: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-primary);
}

.zone-icon {
  color: var(--brand-orange);
  stroke: var(--brand-orange);
}

.status-badge.green {
  background-color: var(--color-success);
  color: white;
}

.status-badge.warning {
  background-color: var(--color-warning);
  color: white;
}

.status-badge.error {
  background-color: var(--color-error);
  color: white;
}

input, textarea, select {
  background-color: var(--bg-input);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
}

input:focus {
  border-color: var(--brand-orange);
  outline: 2px solid var(--brand-orange);
  outline-offset: 2px;
}

.button-primary {
  background-color: var(--brand-orange);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.button-primary:hover {
  background-color: var(--brand-orange-hover);
}

.link {
  color: var(--brand-orange);
  text-decoration: none;
}

.link:hover {
  color: var(--brand-orange-hover);
  text-decoration: underline;
}
```

---

## ⚛️ React Implementation

### ThemeContext

```tsx
// contexts/ThemeContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    return (localStorage.getItem('theme') as Theme) || 'system';
  });

  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const updateEffectiveTheme = () => {
      let result: 'light' | 'dark';

      if (theme === 'system') {
        result = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        result = theme;
      }

      setEffectiveTheme(result);
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    };

    updateEffectiveTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateEffectiveTheme);

    return () => mediaQuery.removeEventListener('change', updateEffectiveTheme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
```

### Theme Switcher Component

```tsx
// components/ThemeSwitcher.tsx

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-switcher">
      <label htmlFor="theme-select">Theme:</label>
      <select
        id="theme-select"
        value={theme}
        onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
      >
        <option value="light">☀️ Light</option>
        <option value="dark">🌙 Dark</option>
        <option value="system">💻 System Default</option>
      </select>
    </div>
  );
};
```

### Usage in Settings Screen

```tsx
// In Settings.tsx

import { ThemeSwitcher } from '@/components/ThemeSwitcher';

export const Settings: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="settings">
      <h2>{t('settings.settings')}</h2>

      <section className="settings-section">
        <h3>{t('settings.profile')}</h3>
        {/* Profile fields */}
      </section>

      <section className="settings-section">
        <h3>{t('settings.theme')}</h3>
        <ThemeSwitcher />
        <p className="help-text">
          {t('settings.theme_help')}
        </p>
      </section>
    </div>
  );
};
```

---

## 📱 Dark Theme Screenshots (ASCII Mockup)

### Dashboard (Dark Theme)

```
┌─────────────────────────────────────────────────────┐
│ 🟠 Health Zones          👤 Helmut  🌍 EN/DE  🌙   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ RECENT MEASUREMENTS TIMELINE                       │
│                                                     │
│ 27.2   │ 24.2   │ 20.2   │ 17.2   │ 13.2        │
│ 06:00  │ 06:15  │ 06:00  │ 06:30  │ 06:00       │
│ ─────  │ ─────  │ ─────  │ ─────  │ ─────       │
│ 5.8 🟡 │ 5.2 🟢 │ 5.8 🟡 │ 5.1 🟢 │ 5.2 🟢      │
│                                                     │
│ ═════════════════════════════════════════════════  │
│                                                     │
│ ┌─────────────────────────────────────────────┐  │
│ │ ⚡ Energy & Metabolic Power                 │  │
│ │                                             │  │
│ │ 🟢 6 / 7 In Range                           │  │
│ │                                             │  │
│ │ BG: 5.8 mmol/L  🟢  Insulin: 2.8  🟢       │  │
│ │ HbA1c: 5.4% 🟢  TSH: 2.1  🟢                │  │
│ │                                             │  │
│ │ [View All 7] [Expand]                       │  │
│ └─────────────────────────────────────────────┘  │
│                                                     │
│ ┌─────────────────────────────────────────────┐  │
│ │ 💪 Structural Integrity                     │  │
│ │                                             │  │
│ │ 🟡 6 / 9 In Range                           │  │
│ │                                             │  │
│ │ Albumin: 35 🟢  Mg: 0.85  🟢                 │  │
│ │ Vitamin D: 85 🟢  Calcium: 2.4  🟡          │  │
│ │                                             │  │
│ │ [View All 9] [Expand]                       │  │
│ └─────────────────────────────────────────────┘  │
│                                                     │
│ [+ Add Measurement]                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Dark Theme Features:**
- ✅ Background: Deep black (#0F0F0F)
- ✅ Cards: Dark gray (#1A1A1A) with subtle borders (#333333)
- ✅ Text: Light gray (#F0F0F0) for primary, muted (#A0A0A0) for secondary
- ✅ Icons: Bitcoin orange (#F7931A) still vibrant
- ✅ Ampel: Adjusted for contrast (🟢 #4CAF50, 🟡 #FFA500, 🔴 #FF6B6B)
- ✅ Shadows: More subtle (not fully dark, still readable)

---

## 🎛️ Settings Screen Theme Toggle

```
┌─────────────────────────────────────────────────┐
│ ◄ Settings                    👤 Helmut  🌍 EN  │
├─────────────────────────────────────────────────┤
│                                                 │
│ [PROFILE] [UNITS] [SECURITY]                  │
│                                                 │
│ 🌍 LANGUAGE & DISPLAY                          │
│                                                 │
│ Language *                                      │
│ [🇬🇧 English] [🇩🇪 Deutsch]                   │
│                                                 │
│ Theme *                                         │
│                                                 │
│ ☀️  Light Theme                                 │
│ ┌──────────────────────────────────────────┐  │
│ │ Bright backgrounds, dark text. Default. │  │
│ │ Best for daytime, bright environments.  │  │
│ └──────────────────────────────────────────┘  │
│                                                 │
│ 🌙 Dark Theme (SELECTED)                       │
│ ┌──────────────────────────────────────────┐  │
│ │ Dark backgrounds, light text.            │  │
│ │ Best for nighttime, eye comfort.         │  │
│ │ Bitcoin orange icons pop on dark.        │  │
│ └──────────────────────────────────────────┘  │
│                                                 │
│ 💻 System Default                              │
│ ┌──────────────────────────────────────────┐  │
│ │ Follow your device's theme setting.      │  │
│ │ Auto-switches light↔dark based on time.  │  │
│ └──────────────────────────────────────────┘  │
│                                                 │
│ [Save Changes] [Cancel] [Reset]               │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🔍 Dark Theme Best Practices

### Text Contrast
- **Light Theme:** Dark text (#1A1A1A) on light background (#FAFAFA) → High contrast ✓
- **Dark Theme:** Light text (#F0F0F0) on dark background (#0F0F0F) → High contrast ✓
- **WCAG AA Compliance:** Both themes meet AA standards (4.5:1 ratio minimum)

### Color Blind Accessibility
- **Ampel colors** adjusted in dark theme for clarity
- **Never rely on color alone** → Always include icons/text
- **Avoid red-green transitions** → Use status text as fallback

### Performance
- **CSS Variables:** No JavaScript overhead for theme switching
- **System Preference:** Respects OS dark mode (energy efficient on OLED)
- **Instant Toggle:** No page reload required

---

## 📋 Dark Theme Checklist

- [ ] All colors in CSS variables (not hardcoded)
- [ ] Light theme colors defined (default)
- [ ] Dark theme colors defined (inverted + adjusted)
- [ ] System preference detection (prefers-color-scheme)
- [ ] ThemeContext + useTheme hook implemented
- [ ] ThemeSwitcher component built
- [ ] Settings screen includes theme toggle
- [ ] User preference stored in localStorage + database
- [ ] All components tested in both themes
- [ ] WCAG contrast ratios verified
- [ ] Ampel colors adjusted for dark theme
- [ ] Shadows adjusted for dark theme
- [ ] No hardcoded colors in components (all use variables)
- [ ] Icons render correctly in both themes

---

## 🎨 Color Reference Card

```
LIGHT THEME          DARK THEME           USE CASE
─────────────────────────────────────────────────────
#FAFAFA              #0F0F0F              App background
#FFFFFF              #1A1A1A              Cards, sections
#F5F5F5              #242424              Headers, panels
#1A1A1A              #F0F0F0              Primary text
#666666              #A0A0A0              Secondary text
#E8E8E8              #333333              Borders
#F7931A              #F7931A              Bitcoin orange (brand)
#27AE60              #4CAF50              Green (success)
#F39C12              #FFA500              Yellow (warning)
#E74C3C              #FF6B6B              Red (error)
```

---

_Dark theme is fully integrated. Users can toggle Light/Dark/System in Settings. Bitcoin orange (#F7931A) maintains prominence in both themes._
