"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconRefresh } from "@tabler/icons-react";
import type { DashboardFixture } from "@/lib/supabase/queries";
import type { LiveFixtureUpdate } from "@/app/api/live-sync/route";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { Sidebar, type SidebarView } from "./Sidebar";
import { FixtureListCard, type FixtureFilter } from "./FixtureListCard";
import { FixtureCalendar } from "./FixtureCalendar";
import { MatchDetail } from "./MatchDetail";
import { ShareFavoriteControls } from "./ShareFavoriteControls";
import { FollowsPanel } from "./FollowsPanel";
import { LanguageToggle } from "./LanguageToggle";

interface DashboardProps {
  fixtures: DashboardFixture[];
}

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

const LIVE_POLL_MS = 60_000;
const LIVE_CANDIDATE_BEFORE_MS = 10 * 60 * 1000;
const LIVE_CANDIDATE_AFTER_MS = 3 * 60 * 60 * 1000;

function isLiveCandidate(f: DashboardFixture): boolean {
  if (f.status === "cancelled" || f.status === "postponed") return false;
  if (f.status === "finished") return false;
  const kickoff = new Date(f.kickoff_at).getTime();
  const now = Date.now();
  return kickoff - LIVE_CANDIDATE_BEFORE_MS <= now && now <= kickoff + LIVE_CANDIDATE_AFTER_MS;
}

export function Dashboard({ fixtures: initialFixtures }: DashboardProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const { favorites } = useFavorites();
  const [fixtures, setFixtures] = useState(initialFixtures);
  // Adjusts local state during render when the server component re-fetches
  // (see the manual refresh button below, which triggers router.refresh()):
  // useState only seeds from the prop on first mount, so without this a
  // refresh would produce a new server-side array that never reaches the
  // screen. Comparing + setState during render (rather than in an effect)
  // is the React-recommended way to sync state to a changed prop.
  const [prevInitialFixtures, setPrevInitialFixtures] = useState(initialFixtures);
  if (initialFixtures !== prevInitialFixtures) {
    setPrevInitialFixtures(initialFixtures);
    setFixtures(initialFixtures);
  }

  const firstWithPrediction = fixtures.find((f) => f.prediction) ?? fixtures[0] ?? null;

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FixtureFilter>("all");
  const [competitionFilter, setCompetitionFilter] = useState<number | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(firstWithPrediction?.id ?? null);
  const [sidebarView, setSidebarView] = useState<SidebarView>("home");
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await fetch("/api/refresh-all", { method: "POST" });
      router.refresh();
    } finally {
      setRefreshing(false);
    }
  }

  // Dependency is the derived boolean, not `fixtures` itself: each poll tick
  // calls setFixtures, which would otherwise re-trigger this effect and reset
  // the interval every tick. Restarting on the boolean flip (a match goes
  // live / finishes) is what we actually want.
  useEffect(() => {
    const hasCandidate = fixtures.some(isLiveCandidate);
    if (!hasCandidate) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/live-sync");
        if (!res.ok) return;
        const body = (await res.json()) as { updates: LiveFixtureUpdate[] };
        if (cancelled || !body.updates?.length) return;
        setFixtures((prev) =>
          prev.map((f) => {
            const update = body.updates.find((u) => u.id === f.id);
            if (!update) return f;
            return { ...f, status: update.status, live_minute: update.live_minute, live_home_score: update.live_home_score, live_away_score: update.live_away_score };
          })
        );
      } catch {
        // Silent - next tick retries; a missed live-score refresh isn't worth surfacing an error for.
      }
    };

    poll();
    const interval = setInterval(poll, LIVE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixtures.some(isLiveCandidate)]);

  const filtered = useMemo(() => {
    return fixtures.filter((f) => {
      if (sidebarView === "favorites" && !favorites.includes(f.id)) return false;
      if (filter === "predicted" && !f.prediction) return false;
      if (filter === "pending" && f.prediction) return false;
      if (competitionFilter !== "all" && f.league_external_id !== competitionFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const home = f.home_team?.name.toLowerCase() ?? "";
        const away = f.away_team?.name.toLowerCase() ?? "";
        if (!home.includes(q) && !away.includes(q)) return false;
      }
      return true;
    });
  }, [fixtures, filter, competitionFilter, search, sidebarView, favorites]);

  const selected = fixtures.find((f) => f.id === selectedId) ?? null;

  const fixtureDates = useMemo(() => new Set(filtered.map((f) => dateKey(f.kickoff_at))), [filtered]);
  const initialMonth = selected ? new Date(selected.kickoff_at) : new Date();

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar view={sidebarView} onViewChange={setSidebarView} />

      <div className="flex-1 px-4 py-6 sm:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            {sidebarView === "favorites" ? t("favorites") : t("overview")}
          </h1>
          <div className="flex items-center gap-3">
            <div className="relative w-full max-w-xs">
              <SearchIcon />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full rounded-full border border-border-subtle bg-surface py-2.5 pr-4 pl-10 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              title={t("refreshData")}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary disabled:opacity-50"
            >
              <IconRefresh size={16} className={refreshing ? "animate-spin" : ""} />
            </button>
            <LanguageToggle />
          </div>
        </header>

        <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
          <FixtureListCard
            fixtures={filtered}
            filter={filter}
            onFilterChange={setFilter}
            competitionFilter={competitionFilter}
            onCompetitionFilterChange={setCompetitionFilter}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <FixtureCalendar fixtureDates={fixtureDates} selectedDate={selected ? dateKey(selected.kickoff_at) : null} initialMonth={initialMonth} onSelectDate={(date) => {
            const match = filtered.find((f) => dateKey(f.kickoff_at) === date);
            if (match) setSelectedId(match.id);
          }} />
        </div>

        {selected ? (
          <div className="mb-6">
            <MatchDetail fixture={selected} headerExtra={<ShareFavoriteControls fixtureId={selected.id} />} />
          </div>
        ) : (
          <p className="rounded-3xl border border-dashed border-border-subtle p-10 text-center text-sm text-text-tertiary">
            {t("noFixturesYet")}
          </p>
        )}
      </div>

      {sidebarView === "follows" && <FollowsPanel onClose={() => setSidebarView("home")} />}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-tertiary"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
