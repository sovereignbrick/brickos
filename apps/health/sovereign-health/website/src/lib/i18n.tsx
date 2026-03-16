"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import en from "@/locales/en.json";
import de from "@/locales/de.json";

const translations = { en, de } as const;
export type Locale = keyof typeof translations;
export const locales: Locale[] = ["en", "de"];
export const localeNames: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
};

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object")
      return path;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : path;
}

function detectLocale(): Locale {
  if (typeof window === "undefined") return "en";
  // Check URL param
  const params = new URLSearchParams(window.location.search);
  const langParam = params.get("lang");
  if (langParam && locales.includes(langParam as Locale))
    return langParam as Locale;
  // Check localStorage (set when user explicitly picks a language)
  const stored = localStorage.getItem("shi-locale");
  if (stored && locales.includes(stored as Locale)) return stored as Locale;
  // Default to English  - users switch via the language selector
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(detectLocale());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = locale;
  }, [locale, mounted]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("shi-locale", l);
    // Update URL without reload
    const url = new URL(window.location.href);
    if (l === "en") {
      url.searchParams.delete("lang");
    } else {
      url.searchParams.set("lang", l);
    }
    window.history.replaceState({}, "", url.toString());
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      let value = getNestedValue(
        translations[locale] as unknown as Record<string, unknown>,
        key
      );
      if (value === key) {
        // Fallback to English
        value = getNestedValue(
          translations.en as unknown as Record<string, unknown>,
          key
        );
      }
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return value;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
