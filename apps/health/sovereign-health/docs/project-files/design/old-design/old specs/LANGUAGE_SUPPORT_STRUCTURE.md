# Language Support Structure (EN + DE)
**i18n Architecture, User Settings, Translation Keys**

---

## 🌍 Design Principle

**One App, Two Languages (Fully Integrated)**
- English (EN) as default
- German (Deutsch, DE) as primary alternative
- Language preference stored in user profile (alongside gender, age, timezone)
- User can switch languages at any time (state updates immediately)
- All UI text, labels, KB articles, and marker names translated

**Why Parallel Translation?**
- German takes 15–25% more space (longer compound words)
- Font sizing, padding, line height must adjust per language
- German-speaking users expect full German UI, not partial

---

## 📋 i18n Architecture (Technical)

### File Structure

```
/app
├── locales/
│   ├── en.json          (English translations)
│   ├── de.json          (German translations)
│   └── locales.ts       (i18n initialization, type safety)
│
├── hooks/
│   └── useTranslation.ts    (React hook: useTranslation())
│
├── contexts/
│   └── LanguageContext.tsx  (Global language state)
│
└── components/
    ├── LanguageSwitcher.tsx (EN/DE toggle button)
    └── [all components use useTranslation()]
```

### Translation Key Naming Convention

Keys are **hierarchical**, dot-separated:

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "loading": "Loading...",
    "error": "Something went wrong"
  },
  
  "navigation": {
    "dashboard": "Dashboard",
    "zones": "Health Zones",
    "history": "Measurement History",
    "knowledge": "Knowledge Base",
    "settings": "Settings"
  },
  
  "zone": {
    "energy_metabolism": {
      "title": "Energy & Metabolic Power",
      "icon": "⚡",
      "question": "Can I have sustained energy throughout the day?",
      "description": "Glucose, insulin, and thyroid function are the engine...",
      "markers": {
        "blood_glucose": "Blood Glucose",
        "insulin_fasting": "Fasting Insulin",
        "hba1c": "HbA1c",
        "tsh": "Thyroid Stimulating Hormone",
        "free_t4": "Free T4 (Thyroxine)",
        "free_t3": "Free T3 (Triiodothyronine)",
        "dhea_s": "DHEA-S"
      }
    },
    "structural_building": {
      "title": "Structural Integrity & Building Blocks",
      "icon": "💪",
      "question": "Are my bones, muscles, and connective tissues strong?",
      "description": "Calcium, magnesium, potassium, proteins...",
      "markers": {
        "albumin": "Albumin",
        "total_protein": "Total Protein",
        "calcium": "Calcium",
        "magnesium": "Magnesium",
        "potassium": "Potassium",
        "creatinine": "Creatinine",
        "vitamin_d": "Vitamin D",
        "iron": "Iron",
        "phosphate": "Phosphate"
      }
    },
    // ... (repeat for all 8 zones)
  },
  
  "status": {
    "green": "Normal",
    "yellow": "Attention Needed",
    "red": "Out of Range",
    "in_range": "In Range",
    "out_of_range": "Out of Range"
  },
  
  "units": {
    "mmol_l": "mmol/L",
    "mg_dl": "mg/dL",
    "umol_l": "µmol/L",
    "kg": "kg",
    "lbs": "lbs",
    "mmhg": "mmHg",
    "percent": "%",
    "bpm": "bpm",
    "iU_l": "IU/L",
    "g_l": "g/L",
    "pmol_l": "pmol/L",
    "µg_l": "µg/L",
    "ng_ml": "ng/mL"
  },
  
  "measurement": {
    "new_measurement": "New Measurement",
    "date": "Date",
    "time": "Time",
    "device": "Device",
    "location": "Location",
    "home": "Home",
    "lab": "Laboratory",
    "add_parameter": "Add Parameter",
    "journal": "Journal Entry",
    "journal_placeholder": "What did you eat? How do you feel?",
    "tags": "Tags (Optional)",
    "preview": "Preview",
    "save": "Save Measurement",
    "cancel": "Cancel"
  },
  
  "dashboard": {
    "last_update": "Last Update",
    "device": "Device",
    "zone_score": "Zone Score",
    "in_range": "In Range",
    "expand": "Expand",
    "add_measurement": "Add Measurement",
    "no_data": "No measurements yet. Start by adding your first one."
  },
  
  "zone_detail": {
    "zone_score": "Zone Score",
    "last_updated": "Last Updated",
    "trend": "Trend",
    "view_trend": "View Trend",
    "download_report": "Download Report",
    "no_data": "No data for this zone yet."
  },
  
  "history": {
    "measurement_history": "Measurement History",
    "filter_by": "Filter by",
    "last_30_days": "Last 30 days",
    "last_90_days": "Last 90 days",
    "all_time": "All time",
    "device_filter": "Device",
    "all_devices": "All Devices",
    "no_measurements": "No measurements found.",
    "view": "View",
    "edit": "Edit",
    "delete": "Delete",
    "pagination": {
      "previous": "Previous",
      "next": "Next"
    }
  },
  
  "trends": {
    "select_metric": "Select Metric",
    "time_range": "Time Range",
    "stats": "Statistics",
    "mean": "Mean",
    "min": "Minimum",
    "max": "Maximum",
    "in_range_percent": "In Range",
    "download": "Download CSV",
    "share": "Share"
  },
  
  "knowledge_base": {
    "knowledge_base": "Knowledge Base",
    "quick_tips": "Quick Tips",
    "all_tips": "All Tips",
    "search": "Search tips...",
    "learn_more": "Learn More",
    "category": "Category",
    "difficulty": "Difficulty",
    "timeline": "Timeline",
    "impact": "Impact on Your Parameters",
    "why_it_works": "Why It Works",
    "what_to_do": "What to Do",
    "warning": "Warning",
    "example": "Real Example",
    "difficulty_easy": "Easy",
    "difficulty_medium": "Medium",
    "difficulty_hard": "Challenging",
    "print": "Print",
    "share_with_doctor": "Share with Doctor"
  },
  
  "settings": {
    "settings": "Settings",
    "profile": "Profile",
    "personal_info": "Personal Information",
    "name": "Name",
    "email": "Email",
    "gender": "Gender",
    "male": "Male",
    "female": "Female",
    "other": "Other",
    "prefer_not_to_say": "Prefer Not to Say",
    "age": "Age",
    "birthday": "Date of Birth",
    "timezone": "Timezone",
    "language": "Language",
    "english": "English",
    "deutsch": "Deutsch (German)",
    "units": "Unit Preferences",
    "glucose_unit": "Glucose Unit",
    "cholesterol_unit": "Cholesterol Unit",
    "uric_acid_unit": "Uric Acid Unit",
    "weight_unit": "Weight Unit",
    "blood_pressure_unit": "Blood Pressure Unit",
    "thresholds": "Personal Thresholds (Ampel-Logik)",
    "green": "Green (Normal)",
    "yellow": "Yellow (Attention)",
    "red": "Red (Warning)",
    "from": "From",
    "to": "To",
    "save_changes": "Save Changes",
    "reset_defaults": "Reset to Defaults",
    "confirm_delete": "Delete Account",
    "confirm_delete_message": "This action cannot be undone.",
    "danger_zone": "Danger Zone"
  },
  
  "auth": {
    "sign_in": "Sign In",
    "sign_up": "Sign Up",
    "email": "Email",
    "password": "Password",
    "confirm_password": "Confirm Password",
    "create_account": "Create Account",
    "already_have_account": "Already have an account?",
    "dont_have_account": "Don't have an account?",
    "forgot_password": "Forgot Password?",
    "sign_out": "Sign Out",
    "profile": "Profile"
  },
  
  "errors": {
    "required_field": "This field is required",
    "invalid_email": "Please enter a valid email address",
    "password_mismatch": "Passwords do not match",
    "password_too_short": "Password must be at least 8 characters",
    "user_not_found": "User not found",
    "invalid_credentials": "Invalid email or password",
    "email_already_registered": "This email is already registered",
    "network_error": "Network error. Please try again.",
    "value_out_of_range": "Value is out of range"
  }
}
```

### German Translation (de.json)

```json
{
  "common": {
    "save": "Speichern",
    "cancel": "Abbrechen",
    "delete": "Löschen",
    "edit": "Bearbeiten",
    "loading": "Wird geladen...",
    "error": "Ein Fehler ist aufgetreten"
  },
  
  "navigation": {
    "dashboard": "Übersicht",
    "zones": "Gesundheitszonen",
    "history": "Messverlauf",
    "knowledge": "Wissensdatenbank",
    "settings": "Einstellungen"
  },
  
  "zone": {
    "energy_metabolism": {
      "title": "Energie & Stoffwechselkraft",
      "icon": "⚡",
      "question": "Kann ich den ganzen Tag über stabil Energie haben?",
      "description": "Glucose, Insulin und Schilddrüsenfunktion sind das Energiemotor...",
      "markers": {
        "blood_glucose": "Blutglukose",
        "insulin_fasting": "Nüchtern-Insulin",
        "hba1c": "HbA1c",
        "tsh": "Thyroidea-stimulierendes Hormon (TSH)",
        "free_t4": "Freies T4 (Thyroxin)",
        "free_t3": "Freies T3 (Triiodothyronin)",
        "dhea_s": "DHEA-S"
      }
    },
    "structural_building": {
      "title": "Strukturelle Integrität & Bausteine",
      "icon": "💪",
      "question": "Sind meine Knochen, Muskeln und Bindegewebe stark?",
      "description": "Kalzium, Magnesium, Kalium, Proteine sind die Bausteine...",
      "markers": {
        "albumin": "Albumin",
        "total_protein": "Gesamtprotein",
        "calcium": "Kalzium",
        "magnesium": "Magnesium",
        "potassium": "Kalium",
        "creatinine": "Kreatinin",
        "vitamin_d": "Vitamin D",
        "iron": "Eisen",
        "phosphate": "Phosphat"
      }
    },
    // ... (repeat for all 8 zones)
  },
  
  "status": {
    "green": "Normal",
    "yellow": "Aufmerksamkeit erforderlich",
    "red": "Außerhalb des Bereichs",
    "in_range": "Im Bereich",
    "out_of_range": "Außerhalb des Bereichs"
  },
  
  "units": {
    "mmol_l": "mmol/L",
    "mg_dl": "mg/dL",
    "umol_l": "µmol/L",
    "kg": "kg",
    "lbs": "lbs",
    "mmhg": "mmHg",
    "percent": "%",
    "bpm": "Schläge/Min",
    "iU_l": "IE/L",
    "g_l": "g/L",
    "pmol_l": "pmol/L",
    "µg_l": "µg/L",
    "ng_ml": "ng/mL"
  },
  
  "measurement": {
    "new_measurement": "Neue Messung",
    "date": "Datum",
    "time": "Uhrzeit",
    "device": "Gerät",
    "location": "Ort",
    "home": "Zuhause",
    "lab": "Labor",
    "add_parameter": "Parameter hinzufügen",
    "journal": "Tagebucheintrag",
    "journal_placeholder": "Was hast du gegessen? Wie fühlst du dich?",
    "tags": "Tags (Optional)",
    "preview": "Vorschau",
    "save": "Messung speichern",
    "cancel": "Abbrechen"
  },
  
  "dashboard": {
    "last_update": "Letzte Aktualisierung",
    "device": "Gerät",
    "zone_score": "Zonenbewertung",
    "in_range": "Im Bereich",
    "expand": "Erweitern",
    "add_measurement": "Messung hinzufügen",
    "no_data": "Noch keine Messungen. Beginne mit deiner ersten."
  },
  
  "zone_detail": {
    "zone_score": "Zonenbewertung",
    "last_updated": "Zuletzt aktualisiert",
    "trend": "Trend",
    "view_trend": "Trend anzeigen",
    "download_report": "Bericht herunterladen",
    "no_data": "Keine Daten für diese Zone vorhanden."
  },
  
  "history": {
    "measurement_history": "Messverlauf",
    "filter_by": "Filtern nach",
    "last_30_days": "Letzte 30 Tage",
    "last_90_days": "Letzte 90 Tage",
    "all_time": "Gesamte Zeit",
    "device_filter": "Gerät",
    "all_devices": "Alle Geräte",
    "no_measurements": "Keine Messungen gefunden.",
    "view": "Anzeigen",
    "edit": "Bearbeiten",
    "delete": "Löschen",
    "pagination": {
      "previous": "Zurück",
      "next": "Weiter"
    }
  },
  
  "trends": {
    "select_metric": "Metrik wählen",
    "time_range": "Zeitraum",
    "stats": "Statistik",
    "mean": "Durchschnitt",
    "min": "Minimum",
    "max": "Maximum",
    "in_range_percent": "Im Bereich",
    "download": "CSV herunterladen",
    "share": "Teilen"
  },
  
  "knowledge_base": {
    "knowledge_base": "Wissensdatenbank",
    "quick_tips": "Schnelltipps",
    "all_tips": "Alle Tipps",
    "search": "Tipps durchsuchen...",
    "learn_more": "Mehr erfahren",
    "category": "Kategorie",
    "difficulty": "Schwierigkeit",
    "timeline": "Zeitrahmen",
    "impact": "Auswirkungen auf deine Parameter",
    "why_it_works": "Warum es funktioniert",
    "what_to_do": "Was zu tun ist",
    "warning": "Warnung",
    "example": "Echtes Beispiel",
    "difficulty_easy": "Einfach",
    "difficulty_medium": "Mittel",
    "difficulty_hard": "Herausfordernd",
    "print": "Drucken",
    "share_with_doctor": "Mit Arzt teilen"
  },
  
  "settings": {
    "settings": "Einstellungen",
    "profile": "Profil",
    "personal_info": "Persönliche Informationen",
    "name": "Name",
    "email": "E-Mail",
    "gender": "Geschlecht",
    "male": "Männlich",
    "female": "Weiblich",
    "other": "Sonstiges",
    "prefer_not_to_say": "Keine Angabe",
    "age": "Alter",
    "birthday": "Geburtsdatum",
    "timezone": "Zeitzone",
    "language": "Sprache",
    "english": "English",
    "deutsch": "Deutsch",
    "units": "Einheitseinstellungen",
    "glucose_unit": "Glukose-Einheit",
    "cholesterol_unit": "Cholesterin-Einheit",
    "uric_acid_unit": "Harnsäure-Einheit",
    "weight_unit": "Gewichtseinheit",
    "blood_pressure_unit": "Blutdruckeinheit",
    "thresholds": "Persönliche Schwellenwerte (Ampel-Logik)",
    "green": "Grün (Normal)",
    "yellow": "Gelb (Aufmerksamkeit)",
    "red": "Rot (Warnung)",
    "from": "Von",
    "to": "Bis",
    "save_changes": "Änderungen speichern",
    "reset_defaults": "Auf Standard zurücksetzen",
    "confirm_delete": "Konto löschen",
    "confirm_delete_message": "Diese Aktion kann nicht rückgängig gemacht werden.",
    "danger_zone": "Gefahrenzone"
  },
  
  "auth": {
    "sign_in": "Anmelden",
    "sign_up": "Registrieren",
    "email": "E-Mail",
    "password": "Passwort",
    "confirm_password": "Passwort bestätigen",
    "create_account": "Konto erstellen",
    "already_have_account": "Hast du bereits ein Konto?",
    "dont_have_account": "Hast du noch kein Konto?",
    "forgot_password": "Passwort vergessen?",
    "sign_out": "Abmelden",
    "profile": "Profil"
  },
  
  "errors": {
    "required_field": "Dieses Feld ist erforderlich",
    "invalid_email": "Bitte gib eine gültige E-Mail-Adresse ein",
    "password_mismatch": "Passwörter stimmen nicht überein",
    "password_too_short": "Das Passwort muss mindestens 8 Zeichen lang sein",
    "user_not_found": "Benutzer nicht gefunden",
    "invalid_credentials": "Ungültige E-Mail oder Passwort",
    "email_already_registered": "Diese E-Mail-Adresse ist bereits registriert",
    "network_error": "Netzwerkfehler. Bitte versuche es erneut.",
    "value_out_of_range": "Wert liegt außerhalb des Bereichs"
  }
}
```

---

## 🗂️ User Settings Schema (Profile + Language)

### Database Table: `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  
  -- Personal Information
  name VARCHAR(255),
  gender ENUM('male', 'female', 'other', 'prefer_not_to_say'),
  birthdate DATE,
  age INT,  -- Denormalized for quick queries; could compute from birthdate
  
  -- Preferences
  language_preference VARCHAR(5) DEFAULT 'en',  -- 'en' or 'de'
  timezone VARCHAR(50) DEFAULT 'Europe/Berlin',
  
  -- Unit Preferences
  glucose_unit VARCHAR(10) DEFAULT 'mmol_l',  -- 'mmol_l' or 'mg_dl'
  cholesterol_unit VARCHAR(10) DEFAULT 'mmol_l',
  uric_acid_unit VARCHAR(10) DEFAULT 'umol_l',
  weight_unit VARCHAR(5) DEFAULT 'kg',  -- 'kg' or 'lbs'
  blood_pressure_unit VARCHAR(5) DEFAULT 'mmhg',
  
  -- Ampel-Logik Thresholds (stored as JSON for flexibility)
  personal_thresholds JSONB DEFAULT '{
    "blood_glucose": {"green": [5.2, 6.2], "yellow": [4.8, 6.7], "red": [4.8, 6.7]},
    "uric_acid": {"green": [280, 360], "yellow": [360, 450], "red": 480},
    ...
  }',
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  
  -- Privacy & Status
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMP NULL  -- Soft delete
);
```

### Settings Page (Screen 9, Enhanced)

**Layout:** 3-column on desktop, single-column on mobile

```
┌──────────────────────────────────────────────────────────┐
│ ◄ Settings                                               │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ TAB 1: PROFILE                                           │
│ ──────────────────────────────────────────────────────   │
│                                                          │
│ 👤 Personal Information                                  │
│                                                          │
│ Name *                                                   │
│ ┌────────────────────────────────────────────────────┐  │
│ │ [Helmut                                         ]   │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Email *                                                  │
│ ┌────────────────────────────────────────────────────┐  │
│ │ [helmut@example.com                             ]   │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Gender                                                   │
│ ◉ Male   ○ Female   ○ Other   ○ Prefer Not to Say      │
│                                                          │
│ Date of Birth *                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ [15.05.1970                                     ]   │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Timezone *                                               │
│ ┌────────────────────────────────────────────────────┐  │
│ │ [Europe/Berlin                               ▼ ]   │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ───────────────────────────────────────────────────────│
│                                                          │
│ 🌍 Language & Preferences                               │
│                                                          │
│ Language *                                               │
│ [🇬🇧 English] [🇩🇪 Deutsch]  ← Toggle button           │
│ Current: Deutsch (German)                                │
│                                                          │
│ ? German requires more space (longer compound words)    │
│ ? You can switch anytime and the app will update.      │
│                                                          │
│ ───────────────────────────────────────────────────────│
│                                                          │
│ [Save Changes] [Cancel]                                 │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ TAB 2: UNITS & THRESHOLDS                               │
│ ──────────────────────────────────────────────────────   │
│ [See previous settings wireframe; now with language     │
│  awareness]                                             │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ TAB 3: SECURITY                                          │
│ ──────────────────────────────────────────────────────   │
│                                                          │
│ Change Password                                          │
│ Current Password: [____]                                │
│ New Password: [____]                                    │
│ Confirm New Password: [____]                            │
│ [Update Password]                                       │
│                                                          │
│ Active Sessions                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Current Session (This Device)                      │  │
│ │ Browser: Chrome | OS: macOS | Last Active: Now   │  │
│ │                                          [Revoke]  │  │
│ │                                                    │  │
│ │ Web Session (Signed in 2 hours ago)               │  │
│ │ Browser: Safari | OS: iOS | Last Active: 2h ago  │  │
│ │                                          [Revoke]  │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ─────────────────────────────────────────────────────── │
│ 🔴 DANGER ZONE                                           │
│                                                          │
│ Delete Account                                           │
│ [ ⚠️  This action cannot be undone ]                    │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ [Delete My Account]                                │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🔄 React Implementation Pattern

### LanguageContext (Global State)

```typescript
// contexts/LanguageContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'de';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultValue?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [translations, setTranslations] = useState<Record<string, any>>({});

  useEffect(() => {
    // Load translations from i18n files
    const loadTranslations = async () => {
      const langFile = language === 'en' ? '/locales/en.json' : '/locales/de.json';
      const response = await fetch(langFile);
      const data = await response.json();
      setTranslations(data);
      
      // Save preference to localStorage
      localStorage.setItem('language_preference', language);
    };

    loadTranslations();
  }, [language]);

  const t = (key: string, defaultValue: string = key): string => {
    const keys = key.split('.');
    let value: any = translations;
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return typeof value === 'string' ? value : defaultValue;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within LanguageProvider');
  }
  return context;
};
```

### Component Example (Dashboard)

```typescript
// components/Dashboard.tsx

import React from 'react';
import { useTranslation } from '@/contexts/LanguageContext';

export const Dashboard: React.FC = () => {
  const { t, language } = useTranslation();

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>{t('navigation.zones')}</h1>
        <div className="language-toggle">
          <span>{t('settings.language')}</span>
          <LanguageSwitcher />
        </div>
      </header>

      <section className="zones-container">
        <ZoneCard
          title={t('zone.energy_metabolism.title')}
          icon={t('zone.energy_metabolism.icon')}
          question={t('zone.energy_metabolism.question')}
          score="6/7"
          status="green"
        />
        <ZoneCard
          title={t('zone.structural_building.title')}
          icon={t('zone.structural_building.icon')}
          question={t('zone.structural_building.question')}
          score="7/9"
          status="yellow"
        />
        {/* ...repeat for other zones */}
      </section>

      <button className="cta-button">
        {t('dashboard.add_measurement')}
      </button>
    </div>
  );
};
```

### Language Switcher Component

```typescript
// components/LanguageSwitcher.tsx

import React from 'react';
import { useTranslation } from '@/contexts/LanguageContext';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useTranslation();

  return (
    <div className="language-switcher">
      <button
        className={`lang-btn ${language === 'en' ? 'active' : ''}`}
        onClick={() => setLanguage('en')}
        aria-label="Switch to English"
      >
        🇬🇧 EN
      </button>
      <button
        className={`lang-btn ${language === 'de' ? 'active' : ''}`}
        onClick={() => setLanguage('de')}
        aria-label="Switch to German"
      >
        🇩🇪 DE
      </button>
    </div>
  );
};
```

### CSS Adjustments for German

```css
/* styles/language.css */

/* When language is German, increase widths and padding */
html[lang="de"] {
  --text-multiplier: 1.15;  /* German is ~15% longer */
  --padding-horizontal: 20px;  /* Extra 4px per side */
  --line-height: 1.6;  /* More breathing room */
}

html[lang="en"] {
  --text-multiplier: 1;
  --padding-horizontal: 16px;
  --line-height: 1.5;
}

/* Buttons & inputs flex to accommodate longer text */
button, input, textarea {
  padding-left: var(--padding-horizontal);
  padding-right: var(--padding-horizontal);
  line-height: var(--line-height);
}

/* Card widths adjust */
.card {
  min-width: 280px;  /* Prevents squishing long German labels */
  flex: 1 1 100%;
}

/* Headers adjust font-size slightly for German */
h1 {
  word-wrap: break-word;
  overflow-wrap: break-word;
}
```

---

## 📊 API Endpoints (Backend)

### Update User Settings

```
PUT /api/users/:user_id/settings

Request Body:
{
  "name": "Helmut",
  "gender": "male",
  "birthdate": "1970-05-15",
  "timezone": "Europe/Berlin",
  "language_preference": "de",
  "glucose_unit": "mmol_l",
  "personal_thresholds": {
    "blood_glucose": {
      "green": [5.2, 6.2],
      "yellow": [4.8, 6.7],
      "red": [0, 4.8]
    }
  }
}

Response:
{
  "success": true,
  "user": { ...updated user object }
}
```

### Get User Settings

```
GET /api/users/:user_id/settings

Response:
{
  "name": "Helmut",
  "gender": "male",
  "birthdate": "1970-05-15",
  "timezone": "Europe/Berlin",
  "language_preference": "de",
  "glucose_unit": "mmol_l",
  "personal_thresholds": { ... }
}
```

---

## ✅ Localization Checklist

### Scope
- [ ] All UI labels (navigation, buttons, form fields)
- [ ] All zone names + descriptions (8 zones × 2 languages)
- [ ] All marker names (75+ markers × 2 languages)
- [ ] All error messages
- [ ] All tooltip texts
- [ ] All KB articles (tips, detailed explanations)
- [ ] All unit displays
- [ ] Settings page (personal info labels)

### Technical
- [ ] `en.json` complete (all keys)
- [ ] `de.json` complete (all keys, German translations accurate)
- [ ] LanguageContext + useTranslation hook implemented
- [ ] LanguageSwitcher component accessible on all screens
- [ ] localStorage persists language preference
- [ ] API returns user's language preference in auth response
- [ ] CSS media queries handle text expansion for German

### Quality
- [ ] German translations reviewed by native speaker
- [ ] No hardcoded English text in components
- [ ] Tooltips explain unit conversions (mmol/L ↔ mg/dL)
- [ ] Font sizes scale appropriately per language
- [ ] Mobile responsive (German takes more width)

---

## 🎬 Workflow (Adding New Text)

When adding a new feature, always:

1. **Add key to en.json**
   ```json
   "new_feature": {
     "title": "New Feature Title",
     "description": "Description here"
   }
   ```

2. **Add German translation to de.json**
   ```json
   "new_feature": {
     "title": "Neuer Merkmal Titel",
     "description": "Beschreibung hier"
   }
   ```

3. **Use in component**
   ```tsx
   const { t } = useTranslation();
   return <h1>{t('new_feature.title')}</h1>;
   ```

4. **Never hardcode English**
   ```tsx
   // ❌ Wrong
   return <h1>New Feature Title</h1>;
   
   // ✅ Right
   return <h1>{t('new_feature.title')}</h1>;
   ```

---

_This structure ensures EN + DE are maintained in parallel, with German given the space it needs. Language switching is instant and seamless._
