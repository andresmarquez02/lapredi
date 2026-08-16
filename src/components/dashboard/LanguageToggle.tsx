"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { Language } from "@/lib/i18n/translations";

const OPTIONS: { id: Language; label: string }[] = [
  { id: "es", label: "ES" },
  { id: "en", label: "EN" },
];

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex rounded-full bg-surface-raised p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => setLanguage(opt.id)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            language === opt.id ? "bg-white text-black" : "text-text-secondary hover:text-text-primary"
          }`}
          aria-pressed={language === opt.id}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
