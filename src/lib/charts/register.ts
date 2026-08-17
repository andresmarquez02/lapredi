import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  LineController,
  PointElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { MatrixController, MatrixElement } from "chartjs-chart-matrix";

// Registered eagerly at module-evaluation time, not inside a component
// effect: react-chartjs-2 constructs the underlying Chart.js instance during
// its own mount effect, which can run before a separate registration effect
// fires - that race produced a real "arc is not a registered element" crash
// on first paint. A top-level call runs once, synchronously, before any
// chart component using this module's exports even mounts.
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  LineController,
  PointElement,
  Tooltip,
  Legend,
  MatrixController,
  MatrixElement
);

// Shared dark-theme defaults, matching src/app/globals.css's design tokens
// (navy ramp - kept as raw hex here since Chart.js config isn't CSS and
// can't read custom properties directly; update alongside globals.css).
export const CHART_COLORS = {
  textPrimary: "#f4f4f5",
  textSecondary: "#a1a1aa",
  textTertiary: "#6b6b73",
  gridline: "#00141f",
  surfaceRaised: "#00111a",
  blue: "#3987e5",
  orange: "#d95926",
  aqua: "#199e70",
  yellow: "#c98500",
  magenta: "#d55181",
  green: "#008300",
  violet: "#9085e9",
  red: "#e66767",
};

export const baseTooltip: ChartOptions["plugins"] = {
  tooltip: {
    backgroundColor: "#00111a",
    borderColor: "#001824",
    borderWidth: 1,
    titleColor: "#f4f4f5",
    bodyColor: "#a1a1aa",
    padding: 10,
    cornerRadius: 8,
    displayColors: true,
    boxPadding: 4,
  },
};
