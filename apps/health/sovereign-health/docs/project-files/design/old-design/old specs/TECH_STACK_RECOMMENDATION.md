# Technology Stack Recommendation
**Status:** FINAL DECISION  
**Datum:** 2026-03-01  
**Focus:** Design First → Wireframes → Backend

---

## 🎯 DEINE ANFORDERUNGEN

```
Frontend:       Web + React Native
Backend:        Rust-based
Deployment:     Web (localhost/VPS)
Code:           Claude/AI writes, User does QA
Timeline:       Design FIRST (Wireframes), then Backend
Goal:           Open Source, Reproducible
```

---

## ⚡ TECHNOLOGY STACK RECOMMENDATION

### **🌐 WEB FRONTEND: Next.js + Tailwind + shadcn/ui**

**Why Next.js (vs React)?**
```
✅ Next.js is BETTER for this project:
   • Built-in TypeScript
   • API Routes (Backend-light, local dev)
   • Image Optimization
   • SSR/SSG ready (scaling later)
   • Deployment: Vercel or VPS (Docker-ready)
   • File-based routing (fast development)
   
vs bare React:
   ❌ Setup complexity (need Vite/Webpack)
   ❌ No built-in server (need separate Node.js)
   ❌ More boilerplate
   
Next.js WIN: 🚀 Faster to market, AI-friendly (code generation)
```

**Why Tailwind + shadcn/ui (vs Material UI / Styled Components)?**
```
✅ Tailwind + shadcn/ui is BETTER:
   • Design Tokens → CSS Variables (easy for Aware-inspired design)
   • shadcn/ui: Copy-paste components (AI generates fast)
   • Unstyled, fully customizable
   • Utility-first (match your design system perfectly)
   • Smaller bundle size
   • Works great with Aware-style aesthetic
   
vs Material UI:
   ❌ Opinionated design (harder to match Aware-like style)
   ❌ Heavier bundle
   ❌ More boilerplate
   
vs Styled Components:
   ❌ CSS-in-JS overhead
   ❌ Runtime cost
   ❌ Less suitable for Design Tokens
   
Tailwind + shadcn/ui WIN: 🎨 Design system integration + Speed
```

**Why Zustand (State Management)?**
```
✅ Zustand is SIMPLER than Redux/Context:
   • Minimal boilerplate
   • Perfect for small/medium apps
   • TypeScript support
   • Easy to test
   • No Provider Hell
   
Why NOT Redux:
   ❌ Overkill for MVP
   ❌ Lots of boilerplate (Actions, Reducers, Selectors)
   ❌ Slower to code
   
Zustand WIN: 🎯 Lean, perfect for MVP
```

**Why Recharts (Charts)?**
```
✅ Recharts is BEST for React:
   • React-native API (not D3)
   • Responsive out of box
   • Customizable (match Aware style easily)
   • Small bundle
   • Easy to implement Glucose/UA trends
   
Why NOT Chart.js:
   ❌ Not React-native, needs wrapper
   ❌ Less flexible for custom styling
   
Recharts WIN: 📈 React-first, clean API
```

---

### **📱 REACT NATIVE: React Native + Expo (Later, Phase 2)**

**Why Expo (vs React Native CLI)?**
```
✅ Expo is SIMPLER for MVP:
   • No Xcode/Android Studio setup needed
   • Instant preview on device (Expo Go)
   • Over-the-air updates (no App Store rebuild)
   • Less configuration
   • Perfect for fast iteration
   
vs React Native CLI:
   ❌ More setup (iOS/Android native code)
   ❌ Slower feedback loop
   ❌ More infrastructure
   
Expo WIN: 🚀 Faster development, better for AI coding
```

**Why NativeWind (for code sharing)?**
```
✅ NativeWind allows:
   • Tailwind in React Native
   • Shared styles with Web (same design tokens)
   • ~70% code sharing between Web + Mobile
   
Example:
   Web:  <div className="bg-green-500 p-4 rounded-lg">
   RN:   <View className="bg-green-500 p-4 rounded-lg">
   (Same className, different render target!)
```

---

### **🦀 BACKEND: Rust + Actix-web + PostgreSQL**

**Why Rust (vs Node.js / Python)?**
```
✅ Rust is BEST for this:
   • Type-safe (no surprises)
   • Memory-safe (no segfaults)
   • Performance (critical for health data)
   • Concurrency (easy with Tokio)
   • Open source (your requirement)
   • Secure by design (encryption, no null pointers)
   
Why NOT Node.js:
   ❌ Less type-safe
   ❌ Performance overhead
   ❌ Less suitable for cryptography
   
Why NOT Python:
   ❌ Slower (health data = many reads/writes)
   ❌ Threading complexity
   ❌ Deployment complexity
   
Rust WIN: 🔒 Safe, Fast, Perfect for health data
```

**Why Actix-web (vs Axum / Rocket)?**
```
✅ Actix-web is PRODUCTION-READY:
   • Fastest Rust web framework
   • Great async support (Tokio)
   • Middleware system (auth, logging, CORS)
   • Large community
   • Battle-tested (used in production)
   
vs Axum:
   ✅ Axum is newer, but:
      • Less ecosystem
      • Smaller community
      
vs Rocket:
   ❌ Slower
   ❌ Less suited for encryption/security
   
Actix-web WIN: 🚀 Fastest, most mature
```

---

## 📊 FULL TECH STACK DECISION MATRIX

| Layer | Choice | Why | Alternative | Why Not |
|-------|--------|-----|-------------|---------|
| **Web Frontend** | Next.js + TypeScript | File routing, API routes, SSR-ready | React + Vite | More setup, no built-in backend |
| **Web Styling** | Tailwind CSS | Utility-first, design token ready | Material UI | Too opinionated, harder to customize |
| **Web Components** | shadcn/ui | Copy-paste, headless, customizable | Radix + styled | More boilerplate |
| **State (Web)** | Zustand | Minimal, TypeScript, easy | Redux | Overkill for MVP |
| **Charts** | Recharts | React-native API, responsive | Chart.js | Not React-native |
| **DB** | PostgreSQL | ACID, open source, secure | MongoDB | Less suitable for health data |
| **Backend** | Rust + Actix-web | Type-safe, fast, secure | Node.js | Less safe, slower |
| **API** | REST + JSON | Simple, stateless, cacheable | GraphQL | Overkill for MVP |
| **Encryption** | AES-256 (ring crate) | Battle-tested, fast | libsodium | Good, but ring is simpler |
| **Mobile** | Expo + React Native | Fast iteration, OTA updates | RN CLI | Slower, more setup |
| **Mobile Styling** | NativeWind | Code sharing, Tailwind | Styled Components | Not mobile-friendly |
| **Deploy Web** | Docker + VPS | Self-hosted, control | Vercel | Less control, cloud lock-in |
| **Deploy Mobile** | EAS Build + App Store | Managed CI/CD, native apps | Manual | Complex, error-prone |

---

## 🏗️ ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────┐
│                    USER (Browser/Mobile)            │
└────────────┬────────────────────────────────┬───────┘
             │                                │
    ┌────────▼─────────┐        ┌──────────────▼──────────┐
    │   WEB (Next.js)  │        │  MOBILE (React Native)  │
    │  + Tailwind      │        │  + Expo + NativeWind    │
    │  + shadcn/ui     │        │  (Later, Phase 2)       │
    │  + Zustand       │        │                          │
    │  + Recharts      │        │                          │
    └────────┬─────────┘        └──────────────┬──────────┘
             │                                 │
             └────────────────┬────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   REST API (HTTP)  │
                    │   JSON + Encrypted │
                    └─────────┬──────────┘
                              │
        ┌─────────────────────┴──────────────────────┐
        │                                             │
    ┌───▼──────────────────────────────────────────┐ │
    │        BACKEND (Rust + Actix-web)           │ │
    │  ┌────────────────────────────────────────┐ │ │
    │  │ API Routes:                            │ │ │
    │  │ • /auth (signup, login)                │ │ │
    │  │ • /sessions (CRUD measurements)        │ │ │
    │  │ • /parameters (metadata)               │ │ │
    │  │ • /user/preferences (units, limits)    │ │ │
    │  │ • /knowledge-base (nutrition tips)     │ │ │
    │  └────────────────────────────────────────┘ │ │
    │  ┌────────────────────────────────────────┐ │ │
    │  │ Business Logic:                        │ │ │
    │  │ • User auth (JWT + bcrypt)             │ │ │
    │  │ • Data encryption (AES-256)            │ │ │
    │  │ • Unit conversion                      │ │ │
    │  │ • Threshold calculation                │ │ │
    │  └────────────────────────────────────────┘ │ │
    └─────────────────────┬──────────────────────┘ │
                          │                        │
                    ┌─────▼────────────┐           │
                    │  PostgreSQL      │◄──────────┘
                    │  (Encrypted)     │
                    │  + pgcrypto      │
                    └──────────────────┘
```

---

## 📁 PROJECT STRUCTURE (Next.js)

```
sovereign-health/
├── frontend/
│   ├── app/                    # Next.js 13+ App Router
│   │   ├── dashboard/          # Dashboard page
│   │   ├── sessions/           # Session history
│   │   ├── new-session/        # Data entry form
│   │   ├── knowledge-base/     # Nutrition tips
│   │   ├── settings/           # User settings
│   │   ├── api/                # API Routes (local endpoints)
│   │   └── layout.tsx          # Root layout
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   └── ...
│   │   ├── common/             # Custom components
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── MetricCard.tsx
│   │   │   ├── CircularScore.tsx
│   │   │   ├── HealthGridItem.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── TabBar.tsx
│   │   └── pages/
│   │       ├── DashboardPage.tsx
│   │       ├── SessionFormPage.tsx
│   │       └── ...
│   ├── lib/
│   │   ├── api.ts              # API client (fetch wrapper)
│   │   ├── types.ts            # TypeScript types
│   │   ├── constants.ts        # App constants
│   │   └── utils.ts            # Helpers
│   ├── styles/
│   │   ├── globals.css         # Tailwind + Design Tokens
│   │   └── variables.css       # CSS Variables
│   ├── store/
│   │   ├── authStore.ts        # Zustand (auth state)
│   │   ├── sessionStore.ts     # Sessions state
│   │   └── settingsStore.ts    # User settings state
│   ├── tailwind.config.ts      # Design tokens
│   ├── tsconfig.json
│   ├── package.json
│   └── next.config.js
│
├── backend/                    # Rust + Actix
│   ├── src/
│   │   ├── main.rs             # Entry point
│   │   ├── models/             # Data models
│   │   │   ├── user.rs
│   │   │   ├── session.rs
│   │   │   ├── parameter.rs
│   │   │   └── threshold.rs
│   │   ├── handlers/           # API handlers
│   │   │   ├── auth.rs
│   │   │   ├── sessions.rs
│   │   │   ├── parameters.rs
│   │   │   └── preferences.rs
│   │   ├── middleware/
│   │   │   ├── auth.rs         # JWT validation
│   │   │   ├── encryption.rs   # Data encryption
│   │   │   └── cors.rs         # CORS handling
│   │   ├── db/
│   │   │   ├── connection.rs
│   │   │   └── migrations/     # SQL migrations
│   │   ├── config.rs           # Configuration
│   │   └── lib.rs
│   ├── Cargo.toml
│   ├── Cargo.lock
│   ├── migrations/             # Database migrations
│   │   ├── 001_users.sql
│   │   ├── 002_sessions.sql
│   │   └── ...
│   ├── .env.example
│   └── docker/
│       └── Dockerfile
│
├── docker-compose.yml          # Local dev setup
├── README.md
└── .gitignore
```

---

## 🚀 DEVELOPMENT WORKFLOW (Design First)

```
PHASE 1: DESIGN (This Week)
═════════════════════════════
1. Create Wireframes (Low-Fi)
   • Dashboard (Aware-inspired 8/11 Score + Grid)
   • Data Entry Form
   • Settings (Units + Thresholds)
   • Knowledge Base
   
2. Design System Definition
   • Colors (JSON)
   • Typography
   • Spacing
   • Components Spec
   
3. Get Approval from Helmut
   ✅ "Looks good" → Move to Phase 2

PHASE 2: FRONTEND (Week 1-2)
═════════════════════════════
1. Setup Next.js Project
2. Install Tailwind + shadcn/ui
3. Implement Components (from wireframes)
4. Build Pages (Dashboard, Data Entry, Settings)
5. Integrate Zustand (state management)
6. Add Recharts (trends)
7. Responsive design (mobile-first)

PHASE 3: BACKEND (Week 3-4)
════════════════════════════
1. Setup Rust + Actix
2. PostgreSQL + Migrations
3. Implement API Routes
4. Auth (JWT + bcrypt)
5. Encryption (AES-256)
6. Unit conversion logic
7. Connect to Frontend

PHASE 4: TESTING (Week 5-6)
════════════════════════════
1. QA (You test every feature)
2. Bug fixes
3. Deployment (Docker, VPS)
4. Documentation

PHASE 5: REACT NATIVE (Week 7+, Later)
═════════════════════════════════════════
1. Setup Expo
2. Port Web components to RN
3. Use NativeWind (code sharing)
4. Publish to App Store
```

---

## 📦 DEPENDENCIES (Next.js Starter)

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.3.0",
    
    // State & Data
    "zustand": "^4.4.0",
    "axios": "^1.6.0",
    
    // UI Components
    "@radix-ui/react-*": "latest",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    
    // Charts
    "recharts": "^2.10.0",
    
    // Styling
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "eslint": "^8.50.0",
    "eslint-config-next": "^14.0.0"
  }
}
```

---

## 🔐 SECURITY CHECKLIST (MVP)

```
Backend (Rust):
✅ Password Hashing (bcrypt, work factor 12)
✅ JWT Tokens (short-lived 15min)
✅ HTTPS/TLS (enforce)
✅ CORS (configured for localhost/VPS)
✅ SQL Injection Prevention (Diesel ORM)
✅ Rate Limiting (per IP)
✅ Data Encryption (AES-256 for health data)
✅ HTTPS only (no HTTP)

Frontend (Next.js):
✅ CSRF Protection
✅ XSS Prevention (React auto-escaping)
✅ Secure Cookies (HttpOnly, Secure, SameSite)
✅ Environment Variables (.env.local)
✅ No sensitive data in localStorage
```

---

## ✅ SUMMARY: WHY THIS STACK?

**🌐 Next.js + Tailwind + shadcn/ui:**
- Fastest to MVP (file routing, built-in API routes)
- AI-friendly (code generation works great)
- Design system integration (perfect for Aware-style)
- Production-ready (scaling later easy)
- Responsive by default

**🦀 Rust + Actix:**
- Type-safe (no surprises)
- Fast (critical for health data)
- Secure (no null pointers, memory safe)
- Open source (your requirement)

**📱 Expo + React Native (later):**
- Code sharing (NativeWind)
- Fast iteration (OTA updates)
- Native feel (iOS/Android)

**✨ Overall:**
```
Design First    → Wireframes approved ✅
Frontend Fast   → Next.js MVP in 2 weeks
Backend Solid   → Rust security + speed
Mobile Later    → React Native 70% code sharing
```

---

## 🎯 NEXT ACTION

**→ Create DESIGN SYSTEM DOCUMENT (with Wireframes)**

Ich werde jetzt schreiben:
1. **WIREFRAMES_LOWFI.md**
   - Dashboard (8/11 Score + Grid)
   - Data Entry Form
   - Settings
   - Navigation Flow

2. **DESIGN_TOKENS.json**
   - Colors
   - Typography
   - Spacing
   - Components

3. **COMPONENT_SPECS.md**
   - StatusBadge Props
   - MetricCard Props
   - All reusable components

**Dann:** Du approves → Backend API Spec → Code Phase

---

_Ready to start Design Phase! 🎨_

