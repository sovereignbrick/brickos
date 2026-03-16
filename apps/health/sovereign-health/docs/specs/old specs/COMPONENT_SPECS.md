# Component Specifications (MVP UI Kit)
**Status:** Ready for Implementation  
**Framework:** React + shadcn/ui + Tailwind  
**Date:** 2026-03-01

---

## 🧩 COMPONENT LIBRARY OVERVIEW

Each component is:
- ✅ Fully typed (TypeScript)
- ✅ Responsive (mobile-first)
- ✅ Accessible (WCAG 2.1)
- ✅ Customizable (props-based)
- ✅ Copy-paste ready (shadcn/ui style)

---

## 1️⃣ StatusBadge

**Purpose:** Display measurement status (Normal / Warning / Critical)

```typescript
interface StatusBadgeProps {
  status: 'normal' | 'warning' | 'critical';
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  icon?: boolean;
}

// Examples:
<StatusBadge status="normal" text="Normal" />
<StatusBadge status="warning" text="Attention" icon />
<StatusBadge status="critical" text="Warning" />
```

**Visual:**
```
🟢 Normal      🟡 Attention    🔴 Critical
(Green BG)     (Orange BG)     (Red BG)
```

**Design Tokens:**
```
normal:   bg=#ECFDF5, text=#10B981
warning:  bg=#FFFBEB, text=#F59E0B
critical: bg=#FEF2F2, text=#EF4444
```

---

## 2️⃣ MetricCard

**Purpose:** Display a single measurement (value + unit + status + range)

```typescript
interface MetricCardProps {
  icon: ReactNode;
  title: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  min: number;
  max: number;
  target?: string;
  compact?: boolean;
  onClick?: () => void;
}

// Example:
<MetricCard
  icon={<BloodIcon />}
  title="Blood Glucose"
  value={5.8}
  unit="mmol/L"
  status="normal"
  min={5.2}
  max={6.2}
  target="5.2—6.2"
/>
```

**Layout (Compact):**
```
┌──────────────────┐
│ 🩸 Glucose       │
│ 5.8 mmol/L       │
│ 🟢 Normal        │
└──────────────────┘
```

**Layout (Expanded - Detail View):**
```
┌───────────────────────────────────┐
│ Blood Glucose                     │
│                                   │
│ 5.8 mmol/L                        │
│                                   │
│ ┌─────────────────────────────┐  │
│ │ 🟢 ──5.2────•────6.2──🟢   │  │ (Range bar)
│ └─────────────────────────────┘  │
│                                   │
│ 🟢 Normal (Target: 5.2—6.2)       │
└───────────────────────────────────┘
```

---

## 3️⃣ CircularScore

**Purpose:** Display "X / Y In Range" with circular progress ring

```typescript
interface CircularScoreProps {
  value: number;
  max: number;
  label?: string;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Example:
<CircularScore
  value={8}
  max={11}
  label="In Range"
  message="Keep up the good work! 💪"
  size="lg"
/>
```

**Visual:**
```
        🟢
     8 / 11
   In Range

  ┌─────────┐
  │    8    │  (Circular ring: 75% green, 25% orange)
  │   / 11  │
  │In Range │
  └─────────┘

Keep up the good work! 💪
```

**Design:**
- Ring stroke width: 8–12px
- Green segment: % calculated from value/max
- Orange segment: remainder
- Inner text: centered, large

---

## 4️⃣ HealthGridItem

**Purpose:** Grid item for health categories (Glucose, UA, BP, etc.)

```typescript
interface HealthGridItemProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}

// Example:
<HealthGridItem
  icon={<BloodDropIcon />}
  label="Glucose"
  onClick={() => navigate('/metrics/glucose')}
/>
```

**Layout (3-column grid):**
```
┌─────────┐  ┌─────────┐  ┌─────────┐
│ 🩸      │  │ 🫀      │  │ 💎      │
│ Glucose │  │ Ketones │  │ UA      │
└─────────┘  └─────────┘  └─────────┘

┌─────────┐  ┌─────────┐  ┌─────────┐
│ 💓      │  │ ⚖️       │  │ 📊      │
│ BP      │  │ Weight  │  │ Chol.   │
└─────────┘  └─────────┘  └─────────┘
```

---

## 5️⃣ BiomarkerListItem

**Purpose:** List item for biomarkers (in Session Detail or Trends)

```typescript
interface BiomarkerListItemProps {
  icon: ReactNode;
  name: string;
  value: number;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
  status: 'normal' | 'warning' | 'critical';
  onClick?: () => void;
}

// Example:
<BiomarkerListItem
  icon={<BloodIcon />}
  name="Blood Glucose"
  value={5.8}
  unit="mmol/L"
  trend="stable"
  status="normal"
/>
```

**Visual:**
```
🩸 Blood Glucose    5.8 mmol/L    ↔️ 🟢
(Icon)              (Value+Unit)   (Trend) (Status)

🫀 Ketones          0.1 mmol/L    ↓ 🟡
💎 Uric Acid       321 µmol/L    ↑ 🟢
```

**Trend Indicators:**
- ↑ (Up): Parameter increased
- ↓ (Down): Parameter decreased  
- ↔️ (Stable): No change

---

## 6️⃣ AdviceListItem

**Purpose:** List item for nutrition tips / advice

```typescript
interface AdviceListItemProps {
  image?: string;
  title: string;
  description: string;
  impact?: string[];
  difficulty?: 'Easy' | 'Moderate' | 'Hard';
  timeline?: string;
  onClick?: () => void;
}

// Example:
<AdviceListItem
  title="Reduce Honey"
  description="Honey causes BG spikes and ketone suppression"
  impact={['BG↓', 'Ketones↑', 'UA↓']}
  difficulty="Easy"
  timeline="3–7 days"
  onClick={() => navigate('/kb/reduce-honey')}
/>
```

**Visual:**
```
┌───────────────────────────────────┐
│ 1. REDUCE HONEY                   │
│    Impact: BG↓ Ketones↑ UA↓       │
│    Difficulty: Easy ★☆☆           │
│    Timeline: 3–7 days             │
│    [Learn More →]                 │
└───────────────────────────────────┘
```

---

## 7️⃣ MetricInputField

**Purpose:** Input field for measurement entry (value + unit selector)

```typescript
interface MetricInputFieldProps {
  label: string;
  value: number | '';
  unit: string;
  units: string[];
  onChange: (value: number) => void;
  onUnitChange: (unit: string) => void;
  required?: boolean;
  hint?: string;
  status?: 'normal' | 'warning' | 'error';
  statusMessage?: string;
  min?: number;
  max?: number;
}

// Example:
<MetricInputField
  label="Blood Glucose"
  value={5.8}
  unit="mmol/L"
  units={['mmol/L', 'mg/dL']}
  onChange={(val) => setGlucose(val)}
  onUnitChange={(unit) => setGlucoseUnit(unit)}
  required
  hint="mmol/L = mg/dL: ×18"
  status="normal"
  statusMessage="Normal (Target: 5.2-6.2)"
/>
```

**Visual:**
```
Blood Glucose *
┌─────────────────────────┬──────┐
│ [5.8            ]  │mm  │     │
└─────────────────────────┴──────┘
Status: 🟢 Normal (Target: 5.2-6.2)
? mmol/L = mg/dL: ×18
```

---

## 8️⃣ RangeSlider / RangeDisplay

**Purpose:** Show measurement range (green/orange/red zones)

```typescript
interface RangeDisplayProps {
  value: number;
  greenMin: number;
  greenMax: number;
  yellowMin: number;
  yellowMax: number;
  unit: string;
  label?: string;
}

// Example:
<RangeDisplay
  value={5.8}
  greenMin={5.2}
  greenMax={6.2}
  yellowMin={4.8}
  yellowMax={6.7}
  unit="mmol/L"
  label="Blood Glucose"
/>
```

**Visual:**
```
Blood Glucose: 5.8 mmol/L

┌──────────────────────────────────────┐
│ 🟡 ─ 🟢 ──•── 🟢 ─ 🟡               │
│   4.8   5.2   5.8   6.2   6.7      │
└──────────────────────────────────────┘

Your value (•) is in the green zone ✓
```

---

## 9️⃣ TrendChart

**Purpose:** Line chart for trends (Glucose, Weight, UA, etc.)

```typescript
interface TrendChartProps {
  data: Array<{
    date: string;
    value: number;
  }>;
  metric: 'glucose' | 'weight' | 'ua' | 'bp' | 'ketones';
  greenMin?: number;
  greenMax?: number;
  unit: string;
  width?: number;
  height?: number;
}

// Example:
<TrendChart
  data={[
    { date: '2026-02-01', value: 5.3 },
    { date: '2026-02-08', value: 5.5 },
    { date: '2026-02-15', value: 5.8 },
    { date: '2026-02-22', value: 5.6 },
  ]}
  metric="glucose"
  greenMin={5.2}
  greenMax={6.2}
  unit="mmol/L"
/>
```

**Visual:**
```
Blood Glucose Trend (Last 30 Days)

7.0 mmol/L ┤          
           │    ╱╲    
6.0 mmol/L ├───╱──╲──  (Target: 5.2-6.2)
           │  ╱    ╲
5.0 mmol/L ├─╱──────
           ├──────────
Target     │
           └──────────
4.0 mmol/L │
           └──────────
            1  7 14 21 28 Feb
```

---

## 🔟 SectionCard

**Purpose:** Container for grouped content (with title, optional icon)

```typescript
interface SectionCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}

// Example:
<SectionCard
  title="Metabolic Markers"
  icon={<BeakerIcon />}
  action={<Button>Add</Button>}
>
  <MetricCard {...props} />
  <MetricCard {...props} />
</SectionCard>
```

**Visual:**
```
┌─────────────────────────────────┐
│ 🧪 Metabolic Markers     [+ Add]│
├─────────────────────────────────┤
│ ┌────────────┐  ┌────────────┐ │
│ │ 🩸 Glucose │  │ 🫀 Ketones │ │
│ │ 5.8 mmol/L │  │ 0.1 mmol/L │ │
│ │ 🟢 Normal  │  │ 🟡 Low     │ │
│ └────────────┘  └────────────┘ │
└─────────────────────────────────┘
```

---

## 📋 COMPONENT IMPLEMENTATION CHECKLIST

```
Styling:
[ ] Tailwind CSS classes
[ ] Design tokens (colors, spacing)
[ ] Dark mode support (optional)
[ ] Responsive breakpoints

Accessibility:
[ ] ARIA labels
[ ] Keyboard navigation
[ ] Focus states
[ ] Color contrast (WCAG AA)

Testing:
[ ] Unit tests (Jest)
[ ] Visual regression tests
[ ] Accessibility tests
[ ] Responsive tests

Documentation:
[ ] Storybook stories
[ ] Usage examples
[ ] Props documentation
[ ] Design pattern guide
```

---

## 🎨 TAILWIND USAGE EXAMPLE

```jsx
// Example: MetricCard component
<div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
  {/* Header */}
  <div className="flex items-center gap-3 mb-3">
    <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
      🩸
    </div>
    <h3 className="text-sm font-semibold text-gray-900">Blood Glucose</h3>
  </div>
  
  {/* Value */}
  <div className="mb-2">
    <div className="text-3xl font-semibold text-gray-900">5.8</div>
    <div className="text-sm text-gray-500">mmol/L</div>
  </div>
  
  {/* Status */}
  <div className="flex items-center gap-2">
    <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
    <span className="text-xs text-gray-600">Normal (Target: 5.2—6.2)</span>
  </div>
</div>
```

---

## ✅ APPROVAL CHECKLIST

```
[ ] All 10 components specified
[ ] Props interface clear
[ ] Visual examples provided
[ ] Responsive behavior documented
[ ] Accessibility requirements noted
[ ] Tailwind classes consistent
[ ] Ready for implementation (Claude Code)
```

---

_Ready to handoff to implementation phase_

