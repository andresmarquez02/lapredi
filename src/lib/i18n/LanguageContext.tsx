"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { translations, dateLocale, type Language, type TranslationKey } from "./translations";

const STORAGE_KEY = "lapredi:language";
const DEFAULT_LANGUAGE: Language = "es";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: <K extends TranslationKey>(key: K) => (typeof translations)["en"][K];
  locale: string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): Language {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "es" || stored === "en" ? stored : DEFAULT_LANGUAGE;
}

function getServerSnapshot(): Language {
  return DEFAULT_LANGUAGE;
}

function setLanguage(lang: Language) {
  window.localStorage.setItem(STORAGE_KEY, lang);
  listeners.forEach((l) => l());
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function t<K extends TranslationKey>(key: K): (typeof translations)["en"][K] {
    return translations[language][key] as (typeof translations)["en"][K];
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, locale: dateLocale[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
