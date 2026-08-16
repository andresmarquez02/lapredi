interface MiniProbabilityBarProps {
  homeWin: number;
  draw: number;
  awayWin: number;
}

export function MiniProbabilityBar({ homeWin, draw, awayWin }: MiniProbabilityBarProps) {
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
      <div className="bg-accent-blue" style={{ width: `${homeWin * 100}%` }} />
      <div className="bg-accent-amber" style={{ width: `${draw * 100}%` }} />
      <div className="bg-accent-rose" style={{ width: `${awayWin * 100}%` }} />
    </div>
  );
}
