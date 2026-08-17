"use client";

import { Doughnut } from "react-chartjs-2";
import { CHART_COLORS } from "@/lib/charts/register";

interface WinnerDoughnutChartProps {
  homeLabel: string;
  awayLabel: string;
  drawLabel: string;
  home: number;
  draw: number;
  away: number;
}

export function WinnerDoughnutChart({ homeLabel, awayLabel, drawLabel, home, draw, away }: WinnerDoughnutChartProps) {
  const leaderPct = Math.round(Math.max(home, draw, away) * 100);

  return (
    <div className="relative mx-auto h-36 w-36 shrink-0">
      <Doughnut
        data={{
          labels: [homeLabel, drawLabel, awayLabel],
          datasets: [
            {
              data: [home, draw, away],
              backgroundColor: [CHART_COLORS.blue, CHART_COLORS.yellow, CHART_COLORS.red],
              borderColor: "#00070a",
              borderWidth: 3,
              hoverOffset: 6,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: "72%",
          animation: { duration: 800, easing: "easeOutQuart" },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#00111a",
              borderColor: "#001824",
              borderWidth: 1,
              titleColor: CHART_COLORS.textPrimary,
              bodyColor: CHART_COLORS.textSecondary,
              padding: 10,
              cornerRadius: 8,
              callbacks: { label: (ctx) => `${Math.round((ctx.raw as number) * 100)}%` },
            },
          },
        }}
      />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold text-text-primary">{leaderPct}%</span>
      </div>
    </div>
  );
}
