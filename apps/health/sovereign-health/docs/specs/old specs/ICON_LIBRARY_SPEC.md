# Icon Library Specification
**SVG Icons for 8 Health Zones**

---

## 🎯 Icon Strategy

**Why SVG Icons?**
- Scalable to any size (32px in headers, 16px in collapsed zones, 64px in hero sections)
- Crisp on all devices (retina-ready)
- Consistent with minimal, modern design
- Easy to customize (stroke width, color)
- Lightweight (no image download overhead)

**Rendering Style:**
- **Stroke-based** (not filled) for minimalist look
- **Stroke Width:** 1.5–2.0px (consistent with design system)
- **Color:** #F7931A (Bitcoin Orange — Primary Highlight Color)
- **Padding:** 4px around icon (safe zone, no text overlap)

**Why Bitcoin Orange for All Icons?**
- Single brand color creates cohesion (not "zone specific colors")
- Bitcoin orange (#F7931A) is warm, energetic, actionable (not neutral/gray)
- Stands out against white backgrounds (light theme) and dark backgrounds (dark theme)
- Consistent visual language across the app
- Pairs well with Ampel status colors (🟢🟡🔴) without competing
- Recognizable as premium/crypto-forward branding

---

## 8 Zone Icons with Specifications

### Zone 1: ⚡ Energy & Metabolic Power

**Icon:** Lightning Bolt (Zap)

**SVG (Heroicons / Feather Icon base):**
```xml
<svg width="40" height="40" viewBox="0 0 24 24" fill="none" 
     stroke="#F7931A" stroke-width="1.5" stroke-linecap="round" 
     stroke-linejoin="round">
  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
</svg>
```

**Semantics:**
- Lightning = speed, energy, electrical power
- Vertical orientation = upward/positive energy
- Sharp points = intensity, metabolism

**Sizes:**
- Large (hero): 64px
- Header: 40px
- Collapsed: 24px

---

### Zone 2: 💪 Structural Integrity & Building Blocks

**Icon:** Dumbbell or Muscle Arm

**SVG (Strength):**
```xml
<svg width="40" height="40" viewBox="0 0 24 24" fill="none" 
     stroke="#F7931A" stroke-width="1.5" stroke-linecap="round" 
     stroke-linejoin="round">
  <!-- Dumbbell representation -->
  <circle cx="6" cy="6" r="2.5"></circle>
  <line x1="6" y1="8.5" x2="6" y2="15.5"></line>
  <circle cx="6" cy="18" r="2.5"></circle>
  
  <line x1="4" y1="12" x2="20" y2="12"></line>
  
  <circle cx="18" cy="6" r="2.5"></circle>
  <line x1="18" y1="8.5" x2="18" y2="15.5"></line>
  <circle cx="18" cy="18" r="2.5"></circle>
</svg>
```

**Semantics:**
- Dumbbell = strength, structure, muscle
- Symmetrical = balance, structural integrity
- Heavy appearance = durability, solidity

---

### Zone 3: 🫀 Cardiovascular Resilience

**Icon:** Heartbeat (Heart with Pulse Line)

**SVG:**
```xml
<svg width="40" height="40" viewBox="0 0 24 24" fill="none" 
     stroke="#F7931A" stroke-width="1.5" stroke-linecap="round" 
     stroke-linejoin="round">
  <!-- Heart shape -->
  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  
  <!-- Pulse line -->
  <polyline points="6 12 8 12 10 8 12 12 14 12 16 12"></polyline>
</svg>
```

**Semantics:**
- Heart = cardiovascular, love, vitality
- Pulse line = heartbeat, rhythm, life
- Centered = core health marker

---

### Zone 4: 🧠 Cognitive & Nervous System

**Icon:** Brain

**SVG (Side Profile):**
```xml
<svg width="40" height="40" viewBox="0 0 24 24" fill="none" 
     stroke="#F7931A" stroke-width="1.5" stroke-linecap="round" 
     stroke-linejoin="round">
  <!-- Brain shape (side view) -->
  <path d="M2 12s0-7 3-8 4 0 4 0m0 0s2-2 3-2 2 1 2 1m0 0s1-3 2-3 1 2 1 2m0 0s0-1 2-1 2 0 2 0m6 10s4 0 5-2 0-8-3-8-4 2-4 2m0 0s-2 0-3-1-1-2-1-2m-6 5h6m-6 2h8"></path>
</svg>
```

**Alternative (Simpler, Heroon-style):**
```xml
<svg width="40" height="40" viewBox="0 0 24 24" fill="none" 
     stroke="#F7931A" stroke-width="1.5" stroke-linecap="round" 
     stroke-linejoin="round">
  <!-- Simplified brain (top view) -->
  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 0v20m-8-12h16m-10-6v4m6 0v-4"></path>
</svg>
```

**Semantics:**
- Brain = cognition, thought, neural function
- Organic, curved shape = neural networks
- Top-view = perspective, awareness

---

### Zone 5: 🛡️ Immune & Inflammatory Balance

**Icon:** Shield (Protective Geometry)

**SVG:**
```xml
<svg width="40" height="40" viewBox="0 0 24 24" fill="none" 
     stroke="#F7931A" stroke-width="1.5" stroke-linecap="round" 
     stroke-linejoin="round">
  <!-- Shield shape -->
  <path d="M12 2L2 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"></path>
  
  <!-- Check mark inside (defense/protection) -->
  <polyline points="9 13 11 15 15 11"></polyline>
</svg>
```

**Semantics:**
- Shield = protection, defense, immune system
- Check mark = all is well, balanced
- Geometric = structured immunity

---

### Zone 6: 🔄 Detoxification & Waste Clearance

**Icon:** Recycle / Refresh (Circular Arrows)

**SVG:**
```xml
<svg width="40" height="40" viewBox="0 0 24 24" fill="none" 
     stroke="#F7931A" stroke-width="1.5" stroke-linecap="round" 
     stroke-linejoin="round">
  <!-- Three circular arrows (recycle symbol) -->
  <path d="M1 4v6h6m22 12v-6h-6"></path>
  <path d="M20.49 9A9 9 0 0 0 5.64 5.64M3.51 15A9 9 0 0 0 18.36 18.36"></path>
</svg>
```

**Semantics:**
- Recycle symbol = cleaning, cycling, renewal
- Circular motion = continuous cleansing
- Three-part = liver, kidney, bile ducts

---

### Zone 7: 🎯 Hormonal Harmony

**Icon:** Target / Bullseye (Concentric Circles)

**SVG:**
```xml
<svg width="40" height="40" viewBox="0 0 24 24" fill="none" 
     stroke="#F7931A" stroke-width="1.5" stroke-linecap="round" 
     stroke-linejoin="round">
  <!-- Concentric circles (target) -->
  <circle cx="12" cy="12" r="1"></circle>
  <circle cx="12" cy="12" r="5"></circle>
  <circle cx="12" cy="12" r="9"></circle>
</svg>
```

**Semantics:**
- Target = precision, balance, hitting the right zone
- Concentric = harmony, nested levels
- Center point = hormonal center/pituitary

---

### Zone 8: 🌱 Nutritional Sufficiency

**Icon:** Leaf / Sprout (Growth)

**SVG:**
```xml
<svg width="40" height="40" viewBox="0 0 24 24" fill="none" 
     stroke="#F7931A" stroke-width="1.5" stroke-linecap="round" 
     stroke-linejoin="round">
  <!-- Leaf/sprout shape -->
  <path d="M21.17 2.25a9 9 0 1 0 0 12.73M18 9.5a2.5 2.5 0 0 1-5 0c0-3 2-5 2.5-6.5.5 1.5 2.5 3.5 2.5 6.5z"></path>
</svg>
```

**Alternative (Simpler Plant):**
```xml
<svg width="40" height="40" viewBox="0 0 24 24" fill="none" 
     stroke="#F7931A" stroke-width="1.5" stroke-linecap="round" 
     stroke-linejoin="round">
  <!-- Plant/leaf stem -->
  <line x1="12" y1="21" x2="12" y2="2"></line>
  <path d="M5 13s3-2 7-2 7 2 7 2"></path>
  <path d="M5 10s3-2 7-2 7 2 7 2"></path>
  <path d="M5 7s3-2 7-2 7 2 7 2"></path>
</svg>
```

**Semantics:**
- Leaf = growth, nutrition, vitality
- Organic curves = natural, nutritious
- Upward = positive, building health

---

## 📦 Icon Implementation (React)

### SVGIcon Component (Reusable)

```tsx
// components/SVGIcon.tsx

interface SVGIconProps {
  name: 'lightning' | 'dumbbell' | 'heart' | 'brain' | 'shield' | 'recycle' | 'target' | 'leaf';
  size?: 'sm' | 'md' | 'lg' | 'xl'; // 16px, 24px, 40px, 64px
  color?: string; // default: '#F7931A' (branded orange)
  strokeWidth?: number; // default: 1.5
}

export const SVGIcon: React.FC<SVGIconProps> = ({
  name,
  size = 'md',
  color = '#F7931A',  // Branded orange
  strokeWidth = 1.5
}) => {
  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 40,
    xl: 64
  };

  const dimension = sizeMap[size];

  const iconMap = {
    lightning: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
      </svg>
    ),
    dumbbell: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="2.5"></circle>
        <line x1="6" y1="8.5" x2="6" y2="15.5"></line>
        <circle cx="6" cy="18" r="2.5"></circle>
        <line x1="4" y1="12" x2="20" y2="12"></line>
        <circle cx="18" cy="6" r="2.5"></circle>
        <line x1="18" y1="8.5" x2="18" y2="15.5"></line>
        <circle cx="18" cy="18" r="2.5"></circle>
      </svg>
    ),
    heart: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>
    ),
    brain: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {/* Brain path */}
      </svg>
    ),
    shield: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"></path>
        <polyline points="9 13 11 15 15 11"></polyline>
      </svg>
    ),
    recycle: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {/* Recycle arrows */}
      </svg>
    ),
    target: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="1"></circle>
        <circle cx="12" cy="12" r="5"></circle>
        <circle cx="12" cy="12" r="9"></circle>
      </svg>
    ),
    leaf: (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="21" x2="12" y2="2"></line>
        <path d="M5 13s3-2 7-2 7 2 7 2"></path>
        <path d="M5 10s3-2 7-2 7 2 7 2"></path>
        <path d="M5 7s3-2 7-2 7 2 7 2"></path>
      </svg>
    )
  };

  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 24 24"
      className="svg-icon"
    >
      {iconMap[name]}
    </svg>
  );
};
```

### Usage in Components

```tsx
// In Dashboard.tsx
<SVGIcon name="lightning" size="lg" color="#888888" />

// In Zone Detail
<SVGIcon name="heart" size="md" />

// In Collapsed Card
<SVGIcon name="dumbbell" size="sm" />

// Large hero section
<SVGIcon name="brain" size="xl" />
```

---

## 📁 File Organization

```
/app
├── components/
│   ├── icons/
│   │   ├── SVGIcon.tsx           (Main component)
│   │   └── iconLibrary.tsx       (Icon definitions)
│   │
│   ├── zones/
│   │   ├── ZoneCard.tsx          (Uses SVGIcon)
│   │   └── ZoneDetail.tsx        (Uses SVGIcon)
│   │
│   └── dashboard/
│       └── Dashboard.tsx         (Uses SVGIcon)
│
└── styles/
    └── icons.css
```

---

## 🎨 CSS Styling

```css
/* styles/icons.css */

.svg-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}

/* Icon in zone headers */
.zone-header-icon {
  width: 40px;
  height: 40px;
  margin-right: 12px;
  color: #F7931A;  /* Branded orange */
  stroke: #F7931A;
}

/* Icon in collapsed zone cards */
.zone-card-icon {
  width: 24px;
  height: 24px;
  color: #F7931A;  /* Branded orange */
  stroke: #F7931A;
  margin-right: 8px;
}

/* Icon in hero section */
.zone-hero-icon {
  width: 64px;
  height: 64px;
  color: #F7931A;  /* Branded orange */
  stroke: #F7931A;
  margin-bottom: 16px;
}

/* On hover, icon brightens slightly (interactive feedback) */
.zone-card:hover .zone-card-icon {
  color: #E67E1A;  /* Darker orange */
  stroke: #E67E1A;
  transition: color 0.2s ease, stroke 0.2s ease;
}
```

---

## ✅ Icon Spec Checklist

- [ ] All 8 icons created (SVG format)
- [ ] Stroke width consistent (1.5–2.0px)
- [ ] Default color: #888888 (muted gray)
- [ ] Scalable (tested at 16px, 24px, 40px, 64px)
- [ ] SVGIcon React component built
- [ ] Icons tested in all screens (dashboard, zone detail, collapsed cards)
- [ ] CSS styling applied (sizing, spacing, hover effects)
- [ ] Performance verified (SVG inline, no network delay)

---

## 🔗 References

**Icon Libraries (for reference/inspiration):**
- [Heroicons](https://heroicons.com/) (open-source, MIT)
- [Feather Icons](https://feathericons.com/) (open-source, MIT)
- [Lucide Icons](https://lucide.dev/) (open-source, ISC)
- [Simple Icons](https://simpleicons.org/) (open-source, CC0)

**All icons in this spec are custom SVG, inspired by these libraries but unique to our app.**

---

_Icons are the visual anchors for each zone. They work with neutral backgrounds to keep Ampel colors (🟢🟡🔴) as the primary focus._
