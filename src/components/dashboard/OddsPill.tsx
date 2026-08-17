import { CountUp } from "@/components/CountUp";

interface OddsPillProps {
  label: string;
  value: number; // 0-1
  variant: "leading" | "default";
}

export function OddsPill({ label, value, variant }: OddsPillProps) {
  return (
    <div
      className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border px-3 py-2.5 text-center transition-colors ${
        variant === "leading" ? "border-accent-blue bg-accent-blue/15" : "border-border-subtle bg-surface-raised"
      }`}
    >
      <span className={`text-xs ${variant === "leading" ? "text-accent-blue-soft" : "text-text-tertiary"}`}>{label}</span>
      <span className={`text-base font-semibold tabular-nums ${variant === "leading" ? "text-text-primary" : "text-text-secondary"}`}>
        <CountUp value={value * 100} suffix="%" />
      </span>
    </div>
  );
}
