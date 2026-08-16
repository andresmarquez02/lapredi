"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { DashboardPrediction, DerivedMarketsSummary } from "@/lib/supabase/queries";
import { OddsPill } from "./OddsPill";
import { WinnerDoughnutChart } from "./charts/WinnerDoughnutChart";
import { ExpectedGoalsChart } from "./charts/ExpectedGoalsChart";
import { MarketLineBars } from "./charts/MarketLineBars";
import { ScorelineHeatmapChart } from "./charts/ScorelineHeatmapChart";
import { CHART_COLORS } from "@/lib/charts/register";

interface MarketBoardProps {
  homeLabel: string;
  awayLabel: string;
  prediction: DashboardPrediction | null;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function leadingKey(home: number, draw: number, away: number): "home" | "draw" | "away" {
  if (home >= draw && home >= away) return "home";
  if (draw >= away) return "draw";
  return "away";
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function MarketBoard({ homeLabel, awayLabel, prediction }: MarketBoardProps) {
  const { t } = useLanguage();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    const sections = rootRef.current.querySelectorAll("[data-market-section]");
    gsap.fromTo(
      sections,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.45, ease: "power2.out", stagger: 0.06 }
    );
  }, [prediction]);

  if (!prediction) {
    return (
      <div className="rounded-3xl border border-border-subtle bg-surface p-6">
        <p className="py-10 text-center text-sm text-text-tertiary">{t("noPredictionAvailable")}</p>
      </div>
    );
  }

  const leader = leadingKey(prediction.final_home_prob, prediction.final_draw_prob, prediction.final_away_prob);
  const markets: DerivedMarketsSummary | null = prediction.derived_markets;
  const homeXg = num(prediction.statistical_factors?.homeExpectedGoals);
  const awayXg = num(prediction.statistical_factors?.awayExpectedGoals);

  const comparisons: string[] = [];
  if (prediction.market_source && prediction.market_home_prob !== null) {
    comparisons.push(
      `${prediction.market_source}: ${pct(prediction.market_home_prob)} / ${pct(prediction.market_draw_prob!)} / ${pct(prediction.market_away_prob!)}`
    );
  }
  if (prediction.bookmaker_name && prediction.bookmaker_home_prob !== null) {
    comparisons.push(
      `${prediction.bookmaker_name}: ${pct(prediction.bookmaker_home_prob)} / ${pct(prediction.bookmaker_draw_prob!)} / ${pct(prediction.bookmaker_away_prob!)}`
    );
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-4 rounded-3xl border border-border-subtle bg-surface p-6">
      {/* Ganador */}
      <MarketSection title={t("winner")}>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <WinnerDoughnutChart
            homeLabel={homeLabel}
            awayLabel={awayLabel}
            drawLabel={t("draw")}
            home={prediction.final_home_prob}
            draw={prediction.final_draw_prob}
            away={prediction.final_away_prob}
          />
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex gap-2">
              <OddsPill label={homeLabel} value={prediction.final_home_prob} variant={leader === "home" ? "leading" : "default"} />
              <OddsPill label={t("draw")} value={prediction.final_draw_prob} variant={leader === "draw" ? "leading" : "default"} />
              <OddsPill label={awayLabel} value={prediction.final_away_prob} variant={leader === "away" ? "leading" : "default"} />
            </div>
            {comparisons.length > 0 ? (
              <p className="text-xs text-text-tertiary">{comparisons.join(" · ")}</p>
            ) : (
              <p className="text-xs text-text-tertiary">{t("noBookmakerOdds")}</p>
            )}
          </div>
        </div>
      </MarketSection>

      {homeXg !== null && awayXg !== null && (
        <MarketSection title={t("expectedGoals")}>
          <ExpectedGoalsChart homeLabel={homeLabel} awayLabel={awayLabel} homeXg={homeXg} awayXg={awayXg} />
        </MarketSection>
      )}

      {markets && (
        <>
          <MarketSection title={t("bothTeamsScore")}>
            <div className="flex gap-2">
              <OddsPill label={t("yes")} value={markets.btts.yes} variant={markets.btts.yes >= markets.btts.no ? "leading" : "default"} />
              <OddsPill label={t("no")} value={markets.btts.no} variant={markets.btts.no > markets.btts.yes ? "leading" : "default"} />
            </div>
          </MarketSection>

          <MarketSection title={t("handicap")} subtitle={t("handicapNote").replace("{home}", homeLabel)}>
            <MarketLineBars
              rows={markets.handicaps.map((h) => ({
                label: h.line > 0 ? `+${h.line}` : `${h.line}`,
                leftValue: h.homeCovers,
                rightValue: h.awayCovers,
              }))}
              leftLabel={homeLabel}
              rightLabel={awayLabel}
              leftColor={CHART_COLORS.violet}
              rightColor={CHART_COLORS.red}
            />
          </MarketSection>

          <MarketSection title={t("goalsOverUnder")} subtitle={t("overUnderNote")}>
            <MarketLineBars
              rows={markets.overUnder.map((m) => ({
                label: `${m.line} ${t("goalsUnit")}`,
                leftValue: m.over,
                rightValue: m.under,
              }))}
              leftLabel={t("over")}
              rightLabel={t("under")}
              leftColor={CHART_COLORS.orange}
              rightColor={CHART_COLORS.aqua}
            />
          </MarketSection>

          <MarketSection title={t("mostLikelyScores")}>
            {markets.scoreGrid && markets.scoreGrid.length > 0 ? (
              <ScorelineHeatmapChart grid={markets.scoreGrid} homeLabel={homeLabel} awayLabel={awayLabel} />
            ) : (
              <ul className="grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
                {markets.topScores.map((s, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg bg-surface-raised px-3 py-1.5">
                    <span className="text-text-secondary">
                      {s.home} - {s.away}
                    </span>
                    <span className="font-medium text-text-primary">{pct(s.probability)}</span>
                  </li>
                ))}
              </ul>
            )}
          </MarketSection>
        </>
      )}
    </div>
  );
}

function MarketSection({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div data-market-section className="border-b border-border-subtle pb-4 last:border-b-0 last:pb-0">
      <h4 className="text-xs font-medium text-text-tertiary uppercase">{title}</h4>
      {subtitle && <p className="mt-0.5 mb-2 text-[11px] leading-snug text-text-tertiary/80">{subtitle}</p>}
      {!subtitle && <div className="mb-2" />}
      {children}
    </div>
  );
}
