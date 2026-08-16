"use client";

import { useEffect, useState } from "react";
import { IconX, IconBell, IconBellOff, IconStar, IconStarFilled } from "@tabler/icons-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { TRACKED_COMPETITIONS } from "@/lib/football/competitions";
import type { FollowRow } from "@/app/api/follows/route";

interface FollowsPanelProps {
  onClose: () => void;
}

interface TeamSearchResult {
  id: string;
  name: string;
  logo_url: string | null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function FollowsPanel({ onClose }: FollowsPanelProps) {
  const { t } = useLanguage();
  const [follows, setFollows] = useState<FollowRow[]>([]);
  // This panel only ever mounts client-side (it appears in response to a
  // sidebar click, never during the initial server render), so it's safe to
  // read Notification.permission directly in the lazy initializer instead of
  // an effect.
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    "Notification" in window ? Notification.permission : "unsupported"
  );
  const [teamQuery, setTeamQuery] = useState("");
  const [teamResults, setTeamResults] = useState<TeamSearchResult[]>([]);
  const trimmedQuery = teamQuery.trim();

  useEffect(() => {
    fetch("/api/follows")
      .then((r) => r.json())
      .then((body: { follows: FollowRow[] }) => setFollows(body.follows ?? []));
  }, []);

  useEffect(() => {
    if (trimmedQuery.length < 2) return;
    const handle = setTimeout(() => {
      fetch(`/api/teams/search?q=${encodeURIComponent(trimmedQuery)}`)
        .then((r) => r.json())
        .then((body: { teams: TeamSearchResult[] }) => setTeamResults(body.teams ?? []));
    }, 300);
    return () => clearTimeout(handle);
  }, [trimmedQuery]);

  const visibleTeamResults = trimmedQuery.length < 2 ? [] : teamResults;

  async function enableNotifications() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result !== "granted") return;

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });

    await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription) });
  }

  async function disableNotifications() {
    if (!("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    await subscription.unsubscribe();
  }

  async function addFollow(payload: { kind: "team" | "league"; teamId?: string; leagueExternalId?: number; displayName: string }) {
    await fetch("/api/follows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const res = await fetch("/api/follows");
    const body = (await res.json()) as { follows: FollowRow[] };
    setFollows(body.follows ?? []);
  }

  async function removeFollow(id: string) {
    await fetch(`/api/follows/${id}`, { method: "DELETE" });
    setFollows((prev) => prev.filter((f) => f.id !== id));
  }

  const followedLeagueIds = new Set(follows.filter((f) => f.kind === "league").map((f) => f.league_external_id));
  const followedTeams = follows.filter((f) => f.kind === "team");
  const followedTeamIds = new Set(followedTeams.map((f) => f.team_id));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label={t("followsClose")} />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border-subtle bg-surface p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">{t("followsTitle")}</h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary hover:bg-surface-raised hover:text-text-primary">
            <IconX size={16} />
          </button>
        </div>

        <section className="mb-6 rounded-2xl border border-border-subtle p-4">
          <h3 className="mb-2 text-xs font-medium text-text-tertiary uppercase">{t("notificationsSection")}</h3>
          {permission === "unsupported" && <p className="text-sm text-text-tertiary">{t("notificationsUnsupported")}</p>}
          {permission === "denied" && <p className="text-sm text-accent-rose">{t("notificationsDenied")}</p>}
          {permission === "default" && (
            <button
              type="button"
              onClick={enableNotifications}
              className="flex items-center gap-2 rounded-full bg-accent-blue px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <IconBell size={15} />
              {t("notificationsEnable")}
            </button>
          )}
          {permission === "granted" && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-accent-emerald">{t("notificationsEnabled")}</span>
              <button
                type="button"
                onClick={disableNotifications}
                className="flex items-center gap-1.5 rounded-full border border-border-subtle px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-raised"
              >
                <IconBellOff size={13} />
                {t("notificationsDisable")}
              </button>
            </div>
          )}
        </section>

        <section className="mb-6">
          <h3 className="mb-2 text-xs font-medium text-text-tertiary uppercase">{t("followLeaguesSection")}</h3>
          <ul className="space-y-1.5">
            {TRACKED_COMPETITIONS.map((c) => {
              const followed = followedLeagueIds.has(c.highlightlyLeagueId);
              const followRow = follows.find((f) => f.kind === "league" && f.league_external_id === c.highlightlyLeagueId);
              return (
                <li key={c.slug} className="flex items-center justify-between gap-2 rounded-xl bg-surface-raised px-3 py-2">
                  <span className="flex items-center gap-2 text-sm text-text-primary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.logoUrl} alt="" className="h-4 w-4 rounded-full object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
                    {c.name}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      followed && followRow
                        ? removeFollow(followRow.id)
                        : addFollow({ kind: "league", leagueExternalId: c.highlightlyLeagueId, displayName: c.name })
                    }
                    className="text-text-tertiary hover:text-accent-amber"
                  >
                    {followed ? <IconStarFilled size={16} className="text-accent-amber" /> : <IconStar size={16} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-medium text-text-tertiary uppercase">{t("followTeamsSection")}</h3>

          {followedTeams.length > 0 && (
            <ul className="mb-3 space-y-1.5">
              {followedTeams.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-raised px-3 py-2">
                  <span className="text-sm text-text-primary">{f.display_name}</span>
                  <button type="button" onClick={() => removeFollow(f.id)} title={t("followRemove")}>
                    <IconStarFilled size={16} className="text-accent-amber" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <input
            type="text"
            value={teamQuery}
            onChange={(e) => setTeamQuery(e.target.value)}
            placeholder={t("followTeamsSearch")}
            className="mb-2 w-full rounded-full border border-border-subtle bg-canvas px-4 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-blue focus:outline-none"
          />

          {trimmedQuery.length < 2 ? (
            <p className="text-xs text-text-tertiary">{t("followEmptyTeams")}</p>
          ) : (
            <ul className="space-y-1.5">
              {visibleTeamResults
                .filter((team) => !followedTeamIds.has(team.id))
                .map((team) => (
                  <li key={team.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-raised px-3 py-2">
                    <span className="flex items-center gap-2 text-sm text-text-primary">
                      {team.logo_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={team.logo_url} alt="" className="h-4 w-4 rounded-full object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
                      )}
                      {team.name}
                    </span>
                    <button type="button" onClick={() => addFollow({ kind: "team", teamId: team.id, displayName: team.name })} title={t("followAdd")}>
                      <IconStar size={16} className="text-text-tertiary hover:text-accent-amber" />
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
