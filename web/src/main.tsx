import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { App } from "./App";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend
);

// Chart.js global defaults (matching original dashboard)
ChartJS.defaults.color = "#8888a0";
ChartJS.defaults.borderColor = "#1e1e2e";
ChartJS.defaults.font.family = "'SF Mono', 'Cascadia Code', 'Fira Code', monospace";
ChartJS.defaults.font.size = 11;
ChartJS.defaults.plugins.legend.display = false;
ChartJS.defaults.plugins.tooltip.backgroundColor = "#1e1e2e";
ChartJS.defaults.plugins.tooltip.borderColor = "#2a2a3a";
ChartJS.defaults.plugins.tooltip.borderWidth = 1;
ChartJS.defaults.plugins.tooltip.cornerRadius = 6;
ChartJS.defaults.plugins.tooltip.padding = 10;
ChartJS.defaults.plugins.tooltip.titleFont = { family: "'SF Mono', monospace", size: 11, weight: "bold" };
ChartJS.defaults.plugins.tooltip.bodyFont = { family: "'SF Mono', monospace", size: 11 };
ChartJS.defaults.scale.grid = { color: "#1e1e2e", lineWidth: 1 };

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
