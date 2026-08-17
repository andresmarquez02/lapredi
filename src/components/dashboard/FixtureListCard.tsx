import { useEffect, useRef } from "react";
import { IconClock } from "@tabler/icons-react";
import gsap from "gsap";
import type { DashboardFixture } from "@/lib/supabase/queries";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { TRACKED_COMPETITIONS } from "@/lib/football/competitions";
import { LiveBadge } from "./LiveBadge";
import { ShareFavoriteControls } from "./ShareFavoriteControls";
import { FormStrip } from "./FormStrip";
import { CountUp } from "@/components/CountUp";

// Which of the model's several handicap/over-under lines to show in the
// compact card preview (the full market panel below still shows all of
// them) - -0.5 and 2.5 goals are the closest to "even" / most-referenced
// lines, matching what a betting-style card typically leads with.
const CARD_HANDICAP_INDEX = 1; // HANDICAP_LINES[1] === -0.5
const CARD_OVER_UNDER_INDEX = 2; // OVER_UNDER_LINES[2] === 2.5

function TeamCrest({ logoUrl, name }: { logoUrl: string | null | undefined; name: string }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        className="h-6 w-6 shrink-0 rounded-full bg-surface-raised object-contain"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    );
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-raised text-[10px] font-semibold text-text-tertiary">
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

function leagueLogo(leagueExternalId: number): string | null {
  return TRACKED_COMPETITIONS.find((c) => c.highlightlyLeagueId === leagueExternalId)?.logoUrl ?? null;
}

function LeagueBadge({ leagueExternalId, size = 16 }: { leagueExternalId: number; size?: number }) {
  const logo = leagueLogo(leagueExternalId);
  if (!logo) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full bg-surface-raised object-contain"
      style={{ width: size, height: size }}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}

const PILL_STYLES = {
  leading: "bg-accent-blue/15 text-accent-blue",
  trailing: "bg-accent-rose/15 text-accent-rose",
  neutral: "bg-surface-raised text-text-secondary",
} as const;

function QuickPill({ label, pct, variant }: { label: string; pct: number; variant: keyof typeof PILL_STYLES }) {
  return (
    <span className={`flex items-center justify-center gap-1 rounded-lg px-1.5 py-1 text-[10px] font-semibold tabular-nums ${PILL_STYLES[variant]}`}>
      {label} <CountUp value={pct * 100} suffix="%" duration={0.6} />
    </span>
  );
}

export type FixtureFilter = "all" | "predicted" | "pending";

interface FixtureListCardProps {
  fixtures: DashboardFixture[];
  filter: FixtureFilter;
  onFilterChange: (filter: FixtureFilter) => void;
  competitionFilter: number | "all";
  onCompetitionFilterChange: (id: number | "all") => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function FixtureListCard({
  fixtures,
  filter,
  onFilterChange,
  competitionFilter,
  onCompetitionFilterChange,
  selectedId,
  onSelect,
}: FixtureListCardProps) {
  const { t, locale } = useLanguage();
  const predictedCount = fixtures.filter((f) => f.prediction).length;
  const listRef = useRef<HTMLUListElement>(null);

  const filters: { id: FixtureFilter; label: string }[] = [
    { id: "all", label: t("filterAll") },
    { id: "predicted", label: t("filterPredicted") },
    { id: "pending", label: t("filterPending") },
  ];

  function formatKickoff(iso: string): string {
    return new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  // Plain mount-time stagger, not scroll-gated: this list scrolls in its own
  // `overflow-y-auto` box, not the window, and react-bits' AnimatedContent
  // (GSAP ScrollTrigger watching `window` scroll by default) never fired for
  // rows below the initial fold as a result - they stayed at opacity 0
  // forever. Re-fires whenever the visible fixture set changes (filtering).
  useEffect(() => {
    if (!listRef.current) return;
    const rows = listRef.current.querySelectorAll("[data-fixture-row]");
    gsap.fromTo(rows, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", stagger: 0.04 });
  }, [fixtures]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Only this header/filter card keeps color+border - the fixture rows
          below live outside it now, flat on the canvas, so the only thing
          reading as "colored" in this whole section is an active filter or
          the one selected fixture, not a wall of identical boxes. */}
      <div className="rounded-3xl border border-border-subtle bg-surface p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium text-text-secondary">{t("upcomingFixtures")}</h2>
            <p className="mt-1 text-4xl font-semibold tracking-tight text-text-primary">
              {fixtures.length}
              <span className="ml-2 text-base font-normal text-text-tertiary">
                {t("tracked")} · {predictedCount} {t("predicted")}
              </span>
            </p>
          </div>

          <div className="flex rounded-full bg-surface-raised p-1">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onFilterChange(f.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  filter === f.id ? "bg-white text-black" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-4">
          <button
            type="button"
            onClick={() => onCompetitionFilterChange("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              competitionFilter === "all" ? "bg-accent-blue text-white" : "bg-surface-raised text-text-secondary hover:text-text-primary"
            }`}
          >
            {t("allCompetitions")}
          </button>
          {TRACKED_COMPETITIONS.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => onCompetitionFilterChange(c.highlightlyLeagueId)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                competitionFilter === c.highlightlyLeagueId
                  ? "bg-accent-blue text-white"
                  : "bg-surface-raised text-text-secondary hover:text-text-primary"
              }`}
            >
              <LeagueBadge leagueExternalId={c.highlightlyLeagueId} size={14} />
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {fixtures.length === 0 ? (
        <p className="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-border-subtle p-10 text-center text-sm text-text-tertiary">
          {t("noFixturesMatch")}
        </p>
      ) : (
        <ul ref={listRef} className="flex flex-1 flex-col gap-3 pt-2">
          {fixtures.map((fixture) => {
            const isSelected = fixture.id === selectedId;
            const homeLabel = fixture.home_team?.name ?? "TBD";
            const awayLabel = fixture.away_team?.name ?? "TBD";
            const homeAbbr = homeLabel.slice(0, 3).toUpperCase();
            const awayAbbr = awayLabel.slice(0, 3).toUpperCase();
            const markets = fixture.prediction?.derived_markets;
            const handicap = markets?.handicaps?.[CARD_HANDICAP_INDEX];
            const overUnder = markets?.overUnder?.[CARD_OVER_UNDER_INDEX];

            return (
              <li key={fixture.id}>
                <div
                  data-fixture-row
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(fixture.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onSelect(fixture.id);
                  }}
                  className={`w-full cursor-pointer rounded-2xl border px-4 py-5 text-left transition-all ${
                    isSelected ? "border-accent-blue bg-surface-raised" : "border-border-subtle bg-surface hover:bg-surface-raised"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
                      <IconClock size={12} />
                      {formatKickoff(fixture.kickoff_at)}
                      <span className="text-text-tertiary/50">·</span>
                      <LeagueBadge leagueExternalId={fixture.league_external_id} size={13} />
                      {TRACKED_COMPETITIONS.find((c) => c.highlightlyLeagueId === fixture.league_external_id)?.name}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {(fixture.status === "live" || fixture.status === "finished") && (
                        <LiveBadge status={fixture.status} liveMinute={fixture.live_minute} />
                      )}
                      <ShareFavoriteControls fixtureId={fixture.id} />
                    </span>
                  </div>

                  <div className="mb-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <TeamCrest logoUrl={fixture.home_team?.logo_url} name={homeLabel} />
                        <span className="truncate text-sm font-medium text-text-primary">{homeLabel}</span>
                        <FormStrip results={fixture.home_team?.recentResults ?? []} />
                      </div>
                      {fixture.live_home_score !== null && <span className="text-sm font-bold tabular-nums text-text-primary">{fixture.live_home_score}</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <TeamCrest logoUrl={fixture.away_team?.logo_url} name={awayLabel} />
                        <span className="truncate text-sm font-medium text-text-primary">{awayLabel}</span>
                        <FormStrip results={fixture.away_team?.recentResults ?? []} />
                      </div>
                      {fixture.live_away_score !== null && <span className="text-sm font-bold tabular-nums text-text-primary">{fixture.live_away_score}</span>}
                    </div>
                  </div>

                  {fixture.prediction ? (
                    <div className="grid grid-cols-3 gap-1.5">
                      <QuickPill
                        label={homeAbbr}
                        pct={fixture.prediction.final_home_prob}
                        variant={fixture.prediction.final_home_prob >= fixture.prediction.final_away_prob ? "leading" : "trailing"}
                      />
                      {handicap ? (
                        <QuickPill
                          label={`${homeAbbr} ${handicap.line > 0 ? "+" : ""}${handicap.line}`}
                          pct={handicap.homeCovers}
                          variant={handicap.homeCovers >= 0.5 ? "leading" : "trailing"}
                        />
                      ) : (
                        <span />
                      )}
                      {overUnder ? (
                        <QuickPill label={`↑ ${overUnder.line}`} pct={overUnder.over} variant="leading" />
                      ) : (
                        <span />
                      )}

                      <QuickPill label={t("draw")} pct={fixture.prediction.final_draw_prob} variant="neutral" />
                      <span />
                      <span />

                      <QuickPill
                        label={awayAbbr}
                        pct={fixture.prediction.final_away_prob}
                        variant={fixture.prediction.final_away_prob > fixture.prediction.final_home_prob ? "leading" : "trailing"}
                      />
                      {handicap ? (
                        <QuickPill
                          label={`${awayAbbr} ${-handicap.line > 0 ? "+" : ""}${-handicap.line}`}
                          pct={handicap.awayCovers}
                          variant={handicap.awayCovers > 0.5 ? "leading" : "trailing"}
                        />
                      ) : (
                        <span />
                      )}
                      {overUnder ? (
                        <QuickPill label={`↓ ${overUnder.line}`} pct={overUnder.under} variant="trailing" />
                      ) : (
                        <span />
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
                      <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary" />
                      {t("noPredictionYet")}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
