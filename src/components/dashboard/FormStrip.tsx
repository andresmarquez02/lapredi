import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { RecentResultSummary } from "@/lib/supabase/queries";

interface FormStripProps {
  results: RecentResultSummary[];
  size?: "sm" | "md";
}

// Kept deliberately quiet (~10% fill, ~80% text opacity): repeated up to 10x
// per fixture row across the whole list, so at full accent-color strength
// (like OddsPill/QuickPill legitimately use) it read as a wall of color
// rather than a small per-team signal.
const RESULT_STYLES = {
  win: "bg-accent-emerald/10 text-accent-emerald/80",
  draw: "bg-accent-amber/10 text-accent-amber/80",
  loss: "bg-accent-rose/10 text-accent-rose/80",
} as const;

const RESULT_LETTER = { win: "W", draw: "D", loss: "L" } as const;

/**
 * Compact win/draw/loss strip for a team's last N stored results (newest
 * first, matching how `recentResults` is already sorted) - lets you compare
 * two teams' recent streaks at a glance (e.g. a favorite on paper coming off
 * 3 losses) without opening the LLM reasoning or the goals-trend chart.
 */
export function FormStrip({ results, size = "sm" }: FormStripProps) {
  const { t } = useLanguage();
  if (results.length === 0) return null;

  const resultLabel = { win: t("win"), draw: t("draw"), loss: t("loss") };
  const dimension = size === "sm" ? "h-4 w-4 text-[9px]" : "h-5 w-5 text-[10px]";

  return (
    <div className="flex shrink-0 items-center gap-1">
      {results.slice(0, 5).map((r, i) => (
        <span
          key={i}
          title={`${resultLabel[r.result]}: vs ${r.opponent} ${r.goalsFor}-${r.goalsAgainst} (${r.date})`}
          className={`flex shrink-0 items-center justify-center rounded-full font-bold tabular-nums ${dimension} ${RESULT_STYLES[r.result]}`}
        >
          {RESULT_LETTER[r.result]}
        </span>
      ))}
    </div>
  );
}
