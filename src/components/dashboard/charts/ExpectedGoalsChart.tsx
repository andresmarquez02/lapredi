"use client";

import { Bar } from "react-chartjs-2";
import { CHART_COLORS, baseTooltip } from "@/lib/charts/register";

interface ExpectedGoalsChartProps {
  homeLabel: string;
  awayLabel: string;
  homeXg: number;
  awayXg: number;
}

export function ExpectedGoalsChart({ homeLabel, awayLabel, homeXg, awayXg }: ExpectedGoalsChartProps) {
  return (
    <div className="h-24">
      <Bar
        data={{
          labels: [homeLabel, awayLabel],
          datasets: [
            {
              data: [homeXg, awayXg],
              backgroundColor: [CHART_COLORS.blue, CHART_COLORS.orange],
              borderRadius: 6,
              barThickness: 22,
            },
          ],
        }}
        options={{
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 700, easing: "easeOutQuart" },
          plugins: {
            legend: { display: false },
            ...baseTooltip,
            tooltip: { ...baseTooltip?.tooltip, callbacks: { label: (ctx) => `${ctx.formattedValue} xG` } },
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: CHART_COLORS.gridline },
              ticks: { color: CHART_COLORS.textTertiary, font: { size: 10 } },
            },
            y: {
              grid: { display: false },
              ticks: { color: CHART_COLORS.textSecondary, font: { size: 12 } },
            },
          },
        }}
      />
    </div>
  );
}
