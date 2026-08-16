import { IconClock, IconMapPin, IconCloud, IconUserShield, IconShirtSport, IconAlertTriangle, IconChartBar } from "@tabler/icons-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { translateFactorKey } from "@/lib/i18n/statFactorLabels";
import type { LineupSummary } from "@/lib/supabase/queries";

interface MatchFactorsPanelProps {
  kickoff: string;
  venue: string | null;
  referee: string | null;
  temperatureCelsius: number | null;
  lineupHome: LineupSummary | null;
  lineupAway: LineupSummary | null;
  homeLabel: string;
  awayLabel: string;
  statisticalFactors: Record<string, unknown> | null;
}

export function MatchFactorsPanel({
  kickoff,
  venue,
  referee,
  temperatureCelsius,
  lineupHome,
  lineupAway,
  homeLabel,
  awayLabel,
  statisticalFactors,
}: MatchFactorsPanelProps) {
  const { t, locale, language } = useLanguage();
  const entries = Object.entries(statisticalFactors ?? {}).filter(([, v]) => v !== undefined && v !== null);
  const strengthEntries = entries.filter(([k]) => !k.endsWith("DataQuality"));
  const qualityWarnings = entries.filter(([k]) => k.endsWith("DataQuality"));

  return (
    <div className="flex h-full flex-col rounded-3xl border border-border-subtle bg-surface p-6">
      <h3 className="mb-4 text-sm font-semibold text-text-primary">{t("matchFactors")}</h3>

      <div className="grid grid-cols-2 gap-4">
        <FactCell
          icon={<IconClock size={16} />}
          label={t("kickoff")}
          value={new Date(kickoff).toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
        />
        <FactCell icon={<IconMapPin size={16} />} label={t("venue")} value={venue ?? t("notReported")} />
        <FactCell
          icon={<IconCloud size={16} />}
          label={t("weather")}
          value={temperatureCelsius !== null ? `${temperatureCelsius}°C` : t("notReported")}
        />
        <FactCell icon={<IconUserShield size={16} />} label={t("referee")} value={referee ?? t("notReported")} />
      </div>

      <div className="mt-5 border-t border-border-subtle pt-4">
        <SectionLabel icon={<IconShirtSport size={14} />} text={t("lineups")} />
        <div className="grid grid-cols-2 gap-4 text-sm">
          <LineupColumn label={homeLabel} lineup={lineupHome} notYetLabel={t("lineupNotYet")} />
          <LineupColumn label={awayLabel} lineup={lineupAway} notYetLabel={t("lineupNotYet")} />
        </div>
      </div>

      {strengthEntries.length > 0 && (
        <div className="mt-4 border-t border-border-subtle pt-4">
          <SectionLabel icon={<IconChartBar size={14} />} text={t("statFactorsIntro")} />
          <dl className="space-y-2 text-sm">
            {strengthEntries.map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4">
                <dt className="text-text-tertiary">{translateFactorKey(key, language)}</dt>
                <dd className="text-right font-semibold tabular-nums text-text-primary">
                  {typeof value === "number" ? value.toFixed(2) : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {qualityWarnings.length > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-400">
          <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div>
            {qualityWarnings.map(([key, value]) => (
              <p key={key}>
                {translateFactorKey(key, language)}: {String(value)}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FactCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-text-tertiary">
        {icon}
        <span className="text-[11px] tracking-wide uppercase">{label}</span>
      </div>
      <p className="text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-text-tertiary">
      {icon}
      <h4 className="text-xs font-medium tracking-wide uppercase">{text}</h4>
    </div>
  );
}

function LineupColumn({ label, lineup, notYetLabel }: { label: string; lineup: LineupSummary | null; notYetLabel: string }) {
  const confirmed = lineup && lineup.formation !== "Unknown" && lineup.initialLineup.length > 0;
  return (
    <div>
      <p className="text-text-secondary">{label}</p>
      {confirmed ? (
        <>
          <p className="mb-1 font-semibold text-text-primary">{lineup.formation}</p>
          <ul className="space-y-0.5 text-xs text-text-secondary">
            {lineup.initialLineup.map((p, i) => (
              <li key={i}>
                {p.number !== undefined ? `${p.number}. ` : ""}
                {p.name}
                {p.position ? ` (${p.position})` : ""}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="font-medium text-text-primary">{notYetLabel}</p>
      )}
    </div>
  );
}
