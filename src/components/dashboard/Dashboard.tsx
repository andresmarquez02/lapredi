"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { IconRefresh, IconX, IconMenu2 } from "@tabler/icons-react";
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

  // Only ever auto-select from today onward - `fixtures` is sorted ascending
  // by kickoff, so a plain "first fixture with a prediction" could (and did)
  // land on a finished match from days ago just because it happened to be
  // the earliest-scheduled fixture that already has a prediction.
  const todayKey = dateKey(new Date().toISOString());
  const upcoming = fixtures.filter((f) => dateKey(f.kickoff_at) >= todayKey);
  const firstWithPrediction = upcoming.find((f) => f.prediction) ?? upcoming[0] ?? fixtures[0] ?? null;

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FixtureFilter>("all");
  const [competitionFilter, setCompetitionFilter] = useState<number | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(firstWithPrediction?.id ?? null);
  const [sidebarView, setSidebarView] = useState<SidebarView>("home");
  const [refreshing, setRefreshing] = useState(false);
  // Gates the mobile full-screen detail overlay so it only opens on an
  // explicit tap - `selectedId` defaults to the first predicted fixture on
  // mount, which would otherwise drop a mobile visitor straight into the
  // detail view before they ever see the fixture list.
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  function selectFixture(id: string) {
    setSelectedId(id);
    setMobileDetailOpen(true);
  }

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
      // Finished matches only show under "Predichos" (reviewing how a past
      // prediction played out is useful); "Todos"/"Pendientes" are about
      // what's coming up, not a growing pile of already-decided results.
      if (filter !== "predicted" && f.status === "finished") return false;
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

  // The detail panel's content remounts on every selection change (see
  // `key={selected.id}` below), so this fires on every fixture switch, not
  // just first mount - the visible "something changed" cue the user asked
  // for on desktop, where the panel is always on-screen and static content
  // updating in place is otherwise easy to miss.
  useEffect(() => {
    if (!selected || !detailRef.current) return;
    gsap.fromTo(detailRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" });
  }, [selected]);

  return (
    <div className="flex min-h-screen bg-canvas lg:h-screen lg:overflow-hidden">
      <Sidebar
        view={sidebarView}
        onViewChange={setSidebarView}
        mobileNavOpen={mobileNavOpen}
        onMobileNavOpenChange={setMobileNavOpen}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <div className="flex-1 px-4 py-6 sm:px-8 lg:flex lg:h-full lg:flex-col lg:overflow-hidden">
        {/* Colored bar + the nav trigger as a normal flex child on mobile,
            not `position: fixed`: a fixed button lives in its own layout
            system and can only ever coincidentally line up with text laid
            out by flexbox - it doesn't actually share a baseline with it. */}
        {/* flex-nowrap deliberately, down to a 380px mobile floor: the left
            group (nav + title) and the right-side icon buttons are `shrink-0`
            (fixed touch targets, must never get squeezed), so the search
            input - the one element that degrades gracefully when narrow - is
            the only thing that shrinks (`min-w-0 flex-1`). */}
        <header className="mb-6 flex flex-nowrap items-center justify-between gap-8 rounded-2xl bg-surface px-3 py-3 sm:gap-6 sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0 lg:shrink-0">
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label={t("menu")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-subtle text-text-secondary hover:bg-surface-raised hover:text-text-primary sm:hidden"
            >
              <IconMenu2 size={18} />
            </button>
            <h1 className="text-lg font-semibold tracking-tight whitespace-nowrap text-text-primary sm:text-2xl">
              {sidebarView === "favorites" ? t("favorites") : t("overview")}
            </h1>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
            <div className="relative min-w-0 flex-1 sm:max-w-xs sm:flex-none">
              <SearchIcon />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full min-w-0 rounded-full border border-border-subtle bg-surface py-2.5 pr-3 pl-9 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              title={t("refreshData")}
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-subtle text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary disabled:opacity-50 sm:flex"
            >
              <IconRefresh size={16} className={refreshing ? "animate-spin" : ""} />
            </button>
            <div className="hidden shrink-0 sm:block">
              <LanguageToggle />
            </div>
          </div>
        </header>

        <div className="split-view-grid grid gap-6 lg:min-h-0 lg:flex-1 lg:items-start">
          <div className="custom-scrollbar flex flex-col gap-6 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-2">
            <FixtureCalendar
              fixtureDates={fixtureDates}
              selectedDate={selected ? dateKey(selected.kickoff_at) : null}
              initialMonth={initialMonth}
              onSelectDate={(date) => {
                const match = filtered.find((f) => dateKey(f.kickoff_at) === date);
                if (match) selectFixture(match.id);
              }}
            />
            <FixtureListCard
              fixtures={filtered}
              filter={filter}
              onFilterChange={setFilter}
              competitionFilter={competitionFilter}
              onCompetitionFilterChange={setCompetitionFilter}
              selectedId={selectedId}
              onSelect={selectFixture}
            />
          </div>

          {/* Desktop (lg+): fixed-height shell (see the two `lg:h-screen` /
              `lg:overflow-hidden` ancestors above) - the page itself never
              scrolls, and this pane gets its own independent scroll instead
              of the list's, so a tall stat/chart section is always fully
              reachable regardless of how long the fixture list is. Below lg
              there's no room for two panes, so this becomes a full-screen
              overlay instead (mobileDetailOpen), gated separately from
              `selectedId` so it doesn't open itself on first paint from the
              default auto-selected fixture. `lg:static` is required, not
              cosmetic: without it this pane stayed `position: fixed` (from
              the mobile-overlay branch) even at lg+, floating over the whole
              viewport instead of sitting in the grid as the right-hand pane. */}
          {selected ? (
            <div
              key={selected.id}
              ref={detailRef}
              className={`custom-scrollbar ${
                mobileDetailOpen ? "fixed inset-0 z-40 overflow-y-auto bg-canvas" : "hidden"
              } lg:static lg:z-auto lg:block lg:h-full lg:min-h-0 lg:overflow-y-auto lg:bg-transparent lg:pr-2`}
            >
              <div className="sticky top-0 z-10 mb-4 flex items-center justify-between bg-canvas/95 px-4 py-3 backdrop-blur-sm lg:hidden">
                <span className="text-sm font-medium text-text-secondary">{t("backToList")}</span>
                <button
                  type="button"
                  onClick={() => setMobileDetailOpen(false)}
                  aria-label={t("backToList")}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                >
                  <IconX size={16} />
                </button>
              </div>
              <div className="px-4 pb-4 lg:px-0 lg:pb-0">
                <MatchDetail fixture={selected} headerExtra={<ShareFavoriteControls fixtureId={selected.id} />} />
              </div>
            </div>
          ) : (
            <div className="lg:sticky lg:top-6">
              <p className="rounded-3xl border border-dashed border-border-subtle p-10 text-center text-sm text-text-tertiary">
                {t("noFixturesYet")}
              </p>
            </div>
          )}
        </div>
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
