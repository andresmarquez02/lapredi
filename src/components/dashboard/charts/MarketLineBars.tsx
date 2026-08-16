interface MarketLineBarsProps {
  rows: { label: string; leftValue: number; rightValue: number }[];
  leftLabel: string;
  rightLabel: string;
  leftColor: string;
  rightColor: string;
}

/**
 * Horizontal split bar per line (one row per handicap/over-under line),
 * each bar always summing to 100% - replaces an earlier grouped vertical
 * Chart.js bar chart that users found unreadable: two near-mirrored columns
 * per line made it hard to tell at a glance which side leads. A single
 * split bar makes the leader and the margin obvious immediately.
 */
export function MarketLineBars({ rows, leftLabel, rightLabel, leftColor, rightColor }: MarketLineBarsProps) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-[11px] text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: leftColor }} />
          {leftLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: rightColor }} />
          {rightLabel}
        </span>
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          const leftPct = Math.round(row.leftValue * 100);
          const rightPct = 100 - leftPct;
          return (
            <div key={row.label} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-xs font-medium text-text-tertiary">{row.label}</span>
              <div className="flex h-6 flex-1 overflow-hidden rounded-lg bg-surface-raised">
                {leftPct > 0 && (
                  <div
                    className="flex items-center justify-start pl-2 text-[11px] font-semibold text-white"
                    style={{ width: `${leftPct}%`, backgroundColor: leftColor }}
                  >
                    {leftPct >= 12 && `${leftPct}%`}
                  </div>
                )}
                {rightPct > 0 && (
                  <div
                    className="flex items-center justify-end pr-2 text-[11px] font-semibold text-white"
                    style={{ width: `${rightPct}%`, backgroundColor: rightColor }}
                  >
                    {rightPct >= 12 && `${rightPct}%`}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
