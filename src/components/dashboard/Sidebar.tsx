import { IconHome, IconStar, IconBellCog } from "@tabler/icons-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export type SidebarView = "home" | "favorites" | "follows";

interface SidebarProps {
  view: SidebarView;
  onViewChange: (view: SidebarView) => void;
}

export function Sidebar({ view, onViewChange }: SidebarProps) {
  const { t } = useLanguage();

  const items: { id: SidebarView; icon: React.ReactNode; label: string }[] = [
    { id: "home", icon: <IconHome size={18} />, label: t("overview") },
    { id: "favorites", icon: <IconStar size={18} />, label: t("favorites") },
    { id: "follows", icon: <IconBellCog size={18} />, label: t("followsTitle") },
  ];

  return (
    <aside className="hidden w-20 shrink-0 flex-col items-center gap-6 border-r border-border-subtle py-6 sm:flex">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-blue text-sm font-bold text-white">lp</div>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onViewChange(item.id)}
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
  );
}
