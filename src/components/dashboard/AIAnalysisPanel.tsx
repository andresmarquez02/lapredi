import { IconSparkles, IconMoodEmpty } from "@tabler/icons-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface AIAnalysisPanelProps {
  reasoning: string | null;
  unavailableReason: string | null;
}

export function AIAnalysisPanel({ reasoning, unavailableReason }: AIAnalysisPanelProps) {
  const { t } = useLanguage();

  return (
    <div className="flex h-full flex-col rounded-3xl border border-border-subtle bg-surface p-6">
      <div className="mb-4 flex items-center gap-2">
        <IconSparkles size={16} className="text-accent-blue-soft" />
        <h3 className="text-sm font-semibold text-text-primary">{t("aiAnalysis")}</h3>
      </div>

      {reasoning ? (
        <p className="text-sm leading-relaxed text-text-secondary">{reasoning}</p>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
          <IconMoodEmpty size={28} className="text-text-tertiary" />
          <p className="text-sm leading-relaxed text-text-tertiary">
            {unavailableReason ? `${t("aiUnavailable")}: ${unavailableReason}` : t("aiNoAnalysis")}
          </p>
        </div>
      )}
    </div>
  );
}
