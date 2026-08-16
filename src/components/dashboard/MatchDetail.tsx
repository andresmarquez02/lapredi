"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { TRACKED_COMPETITIONS } from "@/lib/football/competitions";
import type { DashboardFixture } from "@/lib/supabase/queries";
import { MarketBoard } from "./MarketBoard";
import { AIAnalysisPanel } from "./AIAnalysisPanel";
import { MatchFactorsPanel } from "./MatchFactorsPanel";
import { NewsPanel } from "./NewsPanel";
import { FormTrendChart } from "./charts/FormTrendChart";
import { LiveBadge } from "./LiveBadge";

interface MatchDetailProps {
  fixture: DashboardFixture;
  headerExtra?: React.ReactNode;
}

/**
 * The full match-detail panel (header, markets, factors, form trend, news).
 * Shared between the main dashboard's in-place detail view and the
 * standalone /share/[id] read-only page so the two never drift apart.
 */
export function MatchDetail({ fixture, headerExtra }: MatchDetailProps) {
  const { t, locale } = useLanguage();

  const llmReasoning =
    fixture.prediction?.llm_factors && typeof fixture.prediction.llm_factors.reasoning === "string"
      ? fixture.prediction.llm_factors.reasoning
      : null;
  const llmUnavailable =
    fixture.prediction?.llm_factors && typeof fixture.prediction.llm_factors.unavailable === "string"
      ? fixture.prediction.llm_factors.unavailable
      : null;

  const logo = TRACKED_COMPETITIONS.find((c) => c.highlightlyLeagueId === fixture.league_external_id)?.logoUrl;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt=""
              className="h-5 w-5 shrink-0 rounded-full bg-surface-raised object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          <span>{fixture.home_team?.name ?? "Home"}</span>
          {fixture.live_home_score !== null && fixture.live_away_score !== null ? (
            <span className="tabular-nums">
              {fixture.live_home_score} - {fixture.live_away_score}
            </span>
          ) : (
            <span className="text-sm font-normal text-text-tertiary">{t("vs")}</span>
          )}
          <span>{fixture.away_team?.name ?? "Away"}</span>
          {(fixture.status === "live" || fixture.status === "finished") && (
            <LiveBadge status={fixture.status} liveMinute={fixture.live_minute} size="md" />
          )}
          {headerExtra}
        </h2>
        <span className="text-xs text-text-tertiary">
          {new Date(fixture.kickoff_at).toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          {fixture.venue ? ` · ${fixture.venue}` : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MarketBoard homeLabel={fixture.home_team?.name ?? "Home"} awayLabel={fixture.away_team?.name ?? "Away"} prediction={fixture.prediction} />
        </div>

        <div className="flex flex-col gap-6">
          <AIAnalysisPanel reasoning={llmReasoning} unavailableReason={llmUnavailable} />
          <MatchFactorsPanel
            kickoff={fixture.kickoff_at}
            venue={fixture.venue}
            referee={fixture.referee}
            temperatureCelsius={fixture.temperature_celsius}
            lineupHome={fixture.lineup_home}
            lineupAway={fixture.lineup_away}
            homeLabel={fixture.home_team?.name ?? "Home"}
            awayLabel={fixture.away_team?.name ?? "Away"}
            statisticalFactors={fixture.prediction?.statistical_factors ?? null}
          />
        </div>
      </div>

      {((fixture.home_team?.recentResults?.length ?? 0) > 0 || (fixture.away_team?.recentResults?.length ?? 0) > 0) && (
        <div className="mt-6 rounded-3xl border border-border-subtle bg-surface p-6">
          <h3 className="mb-1 text-sm font-semibold text-text-primary">{t("formTrend")}</h3>
          <p className="mb-4 text-xs text-text-tertiary">{t("formTrendNote")}</p>
          <FormTrendChart
            homeLabel={fixture.home_team?.name ?? "Home"}
            awayLabel={fixture.away_team?.name ?? "Away"}
            homeResults={fixture.home_team?.recentResults ?? []}
            awayResults={fixture.away_team?.recentResults ?? []}
          />
        </div>
      )}

      <div className="mt-6">
        <NewsPanel
          homeLabel={fixture.home_team?.name ?? "Home"}
          awayLabel={fixture.away_team?.name ?? "Away"}
          homeArticles={fixture.home_team?.news?.articles ?? []}
          awayArticles={fixture.away_team?.news?.articles ?? []}
        />
      </div>
    </div>
  );
}
