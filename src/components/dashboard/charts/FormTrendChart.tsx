"use client";

import { Line } from "react-chartjs-2";
import { CHART_COLORS, baseTooltip } from "@/lib/charts/register";
import type { RecentResultSummary } from "@/lib/supabase/queries";

interface FormTrendChartProps {
  homeLabel: string;
  awayLabel: string;
  homeResults: RecentResultSummary[];
  awayResults: RecentResultSummary[];
}

/** Chronological (oldest -> newest) goals-scored trend per team, from real stored recent-match history - not a fabricated "prediction over time" series (we don't snapshot those). */
export function FormTrendChart({ homeLabel, awayLabel, homeResults, awayResults }: FormTrendChartProps) {
  const home = [...homeResults].reverse();
  const away = [...awayResults].reverse();
  const points = Math.max(home.length, away.length, 1);
  const labels = Array.from({ length: points }, (_, i) => `#${i + 1}`);

  return (
    <div className="h-40">
      <Line
        data={{
          labels,
          datasets: [
            {
              label: homeLabel,
              data: home.map((r) => r.goalsFor),
              borderColor: CHART_COLORS.blue,
              backgroundColor: CHART_COLORS.blue,
              tension: 0.35,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
            {
              label: awayLabel,
              data: away.map((r) => r.goalsFor),
              borderColor: CHART_COLORS.orange,
              backgroundColor: CHART_COLORS.orange,
              tension: 0.35,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 700, easing: "easeOutQuart" },
          plugins: {
            legend: {
              position: "top",
              align: "start",
              labels: { color: CHART_COLORS.textSecondary, boxWidth: 10, boxHeight: 10, font: { size: 11 }, padding: 12 },
            },
            ...baseTooltip,
            tooltip: {
              ...baseTooltip?.tooltip,
              callbacks: {
                title: (items) => {
                  const idx = items[0].dataIndex;
                  const series = items[0].datasetIndex === 0 ? home : away;
                  const r = series[idx];
                  return r ? `vs ${r.opponent} (${r.date})` : "";
                },
                label: (ctx) => {
                  const series = ctx.datasetIndex === 0 ? home : away;
                  const r = series[ctx.dataIndex];
                  return r ? `${ctx.dataset.label}: ${r.goalsFor}-${r.goalsAgainst} (${r.result})` : "";
                },
              },
            },
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: CHART_COLORS.textTertiary, font: { size: 10 } } },
            y: {
              beginAtZero: true,
              grid: { color: CHART_COLORS.gridline },
              ticks: { color: CHART_COLORS.textTertiary, font: { size: 10 }, stepSize: 1 },
            },
          },
        }}
      />
    </div>
  );
}
