"use client";

import { IconHome, IconStar, IconBellCog, IconX, IconRefresh } from "@tabler/icons-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LanguageToggle } from "./LanguageToggle";

export type SidebarView = "home" | "favorites" | "follows";

interface SidebarProps {
  view: SidebarView;
  onViewChange: (view: SidebarView) => void;
  // Mobile drawer open state is owned by Dashboard now, not this component -
  // the trigger button lives inline in Dashboard's header (see there for why:
  // a `fixed` trigger here could never truly align with header content built
  // from a completely different layout system).
  mobileNavOpen: boolean;
  onMobileNavOpenChange: (open: boolean) => void;
  // Refresh and language live in the header on sm+ (room to spare there),
  // but on mobile they moved into this drawer instead - at a 380-400px
  // floor, keeping them in the header left too little room for the search
  // input (its whole purpose) to be usable.
  onRefresh: () => void;
  refreshing: boolean;
}

export function Sidebar({ view, onViewChange, mobileNavOpen, onMobileNavOpenChange, onRefresh, refreshing }: SidebarProps) {
  const { t } = useLanguage();

  const items: { id: SidebarView; icon: React.ReactNode; label: string }[] = [
    { id: "home", icon: <IconHome size={18} />, label: t("overview") },
    { id: "favorites", icon: <IconStar size={18} />, label: t("favorites") },
    { id: "follows", icon: <IconBellCog size={18} />, label: t("followsTitle") },
  ];

  function select(id: SidebarView) {
    onViewChange(id);
    onMobileNavOpenChange(false);
  }

  return (
    <>
      {/* Desktop/tablet icon rail */}
      <aside className="hidden w-20 shrink-0 flex-col items-center gap-6 border-r border-border-subtle py-6 sm:flex">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/android-chrome-192x192.png" alt="lapredi" className="h-10 w-10 shrink-0 rounded-2xl object-cover" />
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => select(item.id)}
            title={item.label}
            aria-current={view === item.id ? "page" : undefined}
            className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-colors ${
              view === item.id ? "bg-surface-raised text-text-primary" : "text-text-tertiary hover:bg-surface-raised hover:text-text-primary"
            }`}
          >
            {item.icon}
          </button>
        ))}
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex sm:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => onMobileNavOpenChange(false)}
            aria-label={t("followsClose")}
          />
          <div className="relative flex h-full w-64 flex-col gap-2 border-r border-border-subtle bg-surface p-4">
            <div className="mb-4 flex items-center justify-between">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/android-chrome-192x192.png" alt="lapredi" className="h-9 w-9 shrink-0 rounded-2xl object-cover" />
              <button
                type="button"
                onClick={() => onMobileNavOpenChange(false)}
                aria-label={t("followsClose")}
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-tertiary hover:bg-surface-raised hover:text-text-primary"
              >
                <IconX size={16} />
              </button>
            </div>
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => select(item.id)}
                aria-current={view === item.id ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  view === item.id ? "bg-surface-raised text-text-primary" : "text-text-tertiary hover:bg-surface-raised hover:text-text-primary"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}

            <div className="mt-auto flex flex-col gap-3 border-t border-border-subtle pt-4">
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-text-tertiary transition-colors hover:bg-surface-raised hover:text-text-primary disabled:opacity-50"
              >
                <IconRefresh size={18} className={refreshing ? "animate-spin" : ""} />
                {t("refreshData")}
              </button>
              <div className="px-3">
                <LanguageToggle />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
