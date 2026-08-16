import { useLanguage } from "@/lib/i18n/LanguageContext";

interface LiveBadgeProps {
  status: string;
  liveMinute: string | null;
  size?: "sm" | "md";
}

export function LiveBadge({ status, liveMinute, size = "sm" }: LiveBadgeProps) {
  const { t } = useLanguage();
  const textSize = size === "md" ? "text-xs" : "text-[10px]";
  const padding = size === "md" ? "px-2.5 py-1" : "px-1.5 py-0.5";

  if (status === "live") {
    return (
      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-rose/15 ${padding} ${textSize} font-semibold text-accent-rose`}>
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-rose opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-rose" />
        </span>
        {t("live")}
        {liveMinute ? ` ${liveMinute}${liveMinute.endsWith("'") ? "" : t("minuteAbbr")}` : ""}
      </span>
    );
  }

  if (status === "finished") {
    return (
      <span className={`inline-flex shrink-0 items-center rounded-full bg-surface-raised ${padding} ${textSize} font-medium text-text-tertiary`}>
        {t("finished")}
      </span>
    );
  }

  return null;
}
