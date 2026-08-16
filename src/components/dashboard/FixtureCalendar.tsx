"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface FixtureCalendarProps {
  fixtureDates: Set<string>; // "YYYY-MM-DD" in UTC
  selectedDate: string | null;
  initialMonth: Date;
  onSelectDate: (date: string) => void;
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function FixtureCalendar({ fixtureDates, selectedDate, initialMonth, onSelectDate }: FixtureCalendarProps) {
  const { t, locale } = useLanguage();
  const [cursor, setCursor] = useState(new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1));

  function monthLabel(date: Date): string {
    return date.toLocaleDateString(locale, { month: "long", year: "numeric" });
  }

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first

  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-3xl border border-border-subtle bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-surface-raised"
          aria-label={t("previousMonth")}
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-text-primary">{monthLabel(cursor)}</span>
        <button
          type="button"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-surface-raised"
          aria-label={t("nextMonth")}
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-text-tertiary">
        {t("weekdays").map((w, i) => (
          <span key={i} className="py-1">
            {w}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={i} />;
          const key = toDateKey(year, month, day);
          const hasFixture = fixtureDates.has(key);
          const isSelected = key === selectedDate;

          return (
            <button
              key={i}
              type="button"
              disabled={!hasFixture}
              onClick={() => onSelectDate(key)}
              className={`relative flex h-9 items-center justify-center rounded-full text-sm transition-colors ${
                isSelected
                  ? "bg-accent-blue font-semibold text-white"
                  : hasFixture
                    ? "text-text-primary hover:bg-surface-raised"
                    : "cursor-default text-text-tertiary/50"
              }`}
            >
              {day}
              {hasFixture && !isSelected && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-accent-blue" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
