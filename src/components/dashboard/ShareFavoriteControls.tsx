"use client";

import { useState } from "react";
import { IconLink, IconCheck, IconStar, IconStarFilled } from "@tabler/icons-react";
import { useFavorites } from "@/lib/hooks/useFavorites";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface ShareFavoriteControlsProps {
  fixtureId: string;
}

export function ShareFavoriteControls({ fixtureId }: ShareFavoriteControlsProps) {
  const { t } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [copied, setCopied] = useState(false);
  const favorite = isFavorite(fixtureId);

  async function handleShare() {
    const url = `${window.location.origin}/share/${fixtureId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard permission denied - nothing more we can do here.
    }
  }

  return (
    <span className="flex items-center gap-1">
      <button
        type="button"
        onClick={handleShare}
        title={t("copyShareLink")}
        className="flex h-7 w-7 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-surface-raised hover:text-text-primary"
      >
        {copied ? <IconCheck size={15} className="text-accent-emerald" /> : <IconLink size={15} />}
      </button>
      <button
        type="button"
        onClick={() => toggleFavorite(fixtureId)}
        title={favorite ? t("removeFromFavorites") : t("addToFavorites")}
        className="flex h-7 w-7 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-surface-raised hover:text-text-primary"
      >
        {favorite ? <IconStarFilled size={15} className="text-accent-amber" /> : <IconStar size={15} />}
      </button>
    </span>
  );
}
