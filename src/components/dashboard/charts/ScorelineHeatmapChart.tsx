"use client";

import { Chart } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";
import { CHART_COLORS } from "@/lib/charts/register";

interface ScorelineHeatmapChartProps {
  grid: number[][]; // grid[home][away]
  homeLabel: string;
  awayLabel: string;
}

interface MatrixCell {
  x: number;
  y: number;
  v: number;
}

const RAMP = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];

function colorFor(p: number, max: number): string {
  if (max <= 0) return RAMP[0];
  const t = Math.min(1, p / max);
  return RAMP[Math.min(RAMP.length - 1, Math.round(t * (RAMP.length - 1)))];
}

export function ScorelineHeatmapChart({ grid, homeLabel, awayLabel }: ScorelineHeatmapChartProps) {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const max = Math.max(...grid.flat());

  const cells: MatrixCell[] = [];
  for (let h = 0; h < rows; h++) {
    for (let a = 0; a < cols; a++) {
      cells.push({ x: a, y: h, v: grid[h][a] });
    }
  }

  const data: ChartData<"matrix", MatrixCell[]> = {
    datasets: [
      {
        label: "Scoreline probability",
        data: cells,
        backgroundColor: (ctx) => colorFor((ctx.raw as MatrixCell).v, max),
        borderColor: CHART_COLORS.surfaceRaised,
        borderWidth: 2,
        borderRadius: 6,
        width: () => 34,
        height: () => 34,
      },
    ],
  };

  const options: ChartOptions<"matrix"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: "easeOutQuart" },
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
        callbacks: {
          title: (items) => {
            const c = items[0].raw as MatrixCell;
            return `${homeLabel} ${c.y} - ${c.x} ${awayLabel}`;
          },
          label: (item) => `${((item.raw as MatrixCell).v * 100).toFixed(1)}%`,
        },
      },
    },
    scales: {
      x: {
        type: "linear",
        position: "top",
        min: -0.5,
        max: cols - 0.5,
        ticks: { stepSize: 1, color: CHART_COLORS.textTertiary, font: { size: 10 } },
        grid: { display: false },
        title: { display: true, text: awayLabel, color: CHART_COLORS.textTertiary, font: { size: 10 } },
      },
      y: {
        type: "linear",
        reverse: false,
        min: -0.5,
        max: rows - 0.5,
        ticks: { stepSize: 1, color: CHART_COLORS.textTertiary, font: { size: 10 } },
        grid: { display: false },
        title: { display: true, text: homeLabel, color: CHART_COLORS.textTertiary, font: { size: 10 } },
      },
    },
  };

  return (
    <div style={{ height: 34 * rows + 60 }}>
      <Chart type="matrix" data={data} options={options} />
    </div>
  );
}
