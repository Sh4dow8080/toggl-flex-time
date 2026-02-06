import { Bar, Line } from "react-chartjs-2";
import type { JsonWeekOutput } from "../types";

interface WeeklyChartsProps {
  weekly: JsonWeekOutput[];
}

export function WeeklyCharts({ weekly }: WeeklyChartsProps) {
  const labels = weekly.map((w) => "W" + w.weekNumber);
  const flexData = weekly.map((w) => w.cumulativeFlex);
  const lastFlex = flexData[flexData.length - 1] ?? 0;
  const lineColor = lastFlex >= 0 ? "#22c55e" : "#ef4444";

  return (
    <div className="chart-row fade-up delay-4">
      <div className="chart-box">
        <div className="chart-title">Hours per Week</div>
        <div className="chart-wrap">
          <Bar
            data={{
              labels,
              datasets: [
                {
                  label: "Actual",
                  data: weekly.map((w) => w.actualHours),
                  backgroundColor: "#3b82f680",
                  borderRadius: 3,
                  barPercentage: 0.7,
                },
                {
                  label: "Required",
                  data: weekly.map((w) => w.requiredHours),
                  backgroundColor: "#ffffff10",
                  borderColor: "#ffffff20",
                  borderWidth: 1,
                  borderRadius: 3,
                  barPercentage: 0.7,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              aspectRatio: 1.6,
              plugins: {
                legend: {
                  display: true,
                  position: "top",
                  align: "end",
                  labels: {
                    boxWidth: 12,
                    boxHeight: 12,
                    borderRadius: 2,
                    useBorderRadius: true,
                    padding: 16,
                  },
                },
                tooltip: {
                  callbacks: {
                    label: (ctx) =>
                      ctx.dataset.label + ": " + ctx.parsed.y?.toFixed(1) + "h",
                  },
                },
              },
              scales: {
                x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
                y: { beginAtZero: true, ticks: { callback: (v) => v + "h" } },
              },
            }}
          />
        </div>
      </div>
      <div className="chart-box">
        <div className="chart-title">Cumulative Flex Balance</div>
        <div className="chart-wrap">
          <Line
            data={{
              labels,
              datasets: [
                {
                  label: "Cumulative Flex",
                  data: flexData,
                  borderColor: lineColor,
                  backgroundColor: lineColor + "10",
                  fill: true,
                  tension: 0.3,
                  pointRadius: 2,
                  pointHoverRadius: 5,
                  borderWidth: 2,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              aspectRatio: 1.6,
              plugins: {
                tooltip: {
                  callbacks: {
                    label: (ctx) =>
                      ((ctx.parsed.y ?? -1) >= 0 ? "+" : "") +
                      ctx.parsed.y?.toFixed(1) +
                      "h",
                  },
                },
              },
              scales: {
                x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
                y: {
                  ticks: {
                    callback: (v) =>
                      ((v as number) >= 0 ? "+" : "") +
                      parseFloat((v as number).toFixed(1)) +
                      "h",
                  },
                  grid: {
                    color: (ctx) => (ctx.tick.value === 0 ? "#ffffff20" : "#1e1e2e"),
                  },
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
