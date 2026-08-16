import { IconNews, IconExternalLink } from "@tabler/icons-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { NewsArticleSummary } from "@/lib/supabase/queries";

interface NewsPanelProps {
  homeLabel: string;
  awayLabel: string;
  homeArticles: NewsArticleSummary[];
  awayArticles: NewsArticleSummary[];
}

export function NewsPanel({ homeLabel, awayLabel, homeArticles, awayArticles }: NewsPanelProps) {
  const { t, locale } = useLanguage();
  const hasAny = homeArticles.length > 0 || awayArticles.length > 0;

  return (
    <div className="rounded-3xl border border-border-subtle bg-surface p-6">
      <h3 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-text-primary">
        <IconNews size={16} className="text-accent-blue-soft" />
        {t("recentNews")}
      </h3>

      {!hasAny ? (
        <p className="text-sm text-text-tertiary">{t("noNews")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <NewsColumn label={homeLabel} articles={homeArticles} locale={locale} />
          <NewsColumn label={awayLabel} articles={awayArticles} locale={locale} />
        </div>
      )}
    </div>
  );
}

function NewsColumn({ label, articles, locale }: { label: string; articles: NewsArticleSummary[]; locale: string }) {
  if (articles.length === 0) return null;
  return (
    <div>
      <h4 className="mb-2 text-xs font-medium text-text-tertiary uppercase">{label}</h4>
      <ul className="space-y-2">
        {articles.slice(0, 4).map((a) => (
          <li key={a.url}>
            <a
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-2xl border border-transparent p-2 transition-colors hover:border-border-subtle hover:bg-surface-raised"
            >
              {a.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.image}
                  alt=""
                  className="h-14 w-20 shrink-0 rounded-xl bg-surface-raised object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-text-tertiary">
                  <IconNews size={20} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium text-text-secondary group-hover:text-text-primary">{a.title}</p>
                <span className="mt-1 flex items-center gap-1 text-xs text-text-tertiary">
                  {a.sourceName} · {new Date(a.publishedAt).toLocaleDateString(locale, { day: "2-digit", month: "short" })}
                  <IconExternalLink size={11} className="opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
