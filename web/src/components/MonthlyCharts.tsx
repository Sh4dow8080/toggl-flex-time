import { useMemo } from "react";
import { Bar, Line } from "react-chartjs-2";
import type { JsonTrendOutput, JsonWeekOutput } from "../types";

interface MonthlyChartsProps {
  monthlyTrend: JsonTrendOutput;
  weekly: JsonWeekOutput[];
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function MonthlyCharts({ monthlyTrend, weekly }: MonthlyChartsProps) {
  const labels = monthlyTrend.periods.map((p) => p.label);

  const { monthlyActual, monthlyRequired } = useMemo(() => {
    const monthlyActual: Record<string, number> = {};
    const monthlyRequired: Record<string, number> = {};
    for (const w of weekly) {
      const dt = new Date(w.period.start + "T00:00:00");
      const m = dt.getMonth();
      const monthName = MONTH_NAMES[m];
      const shortYear = String(dt.getFullYear()).slice(-2);
      const key = monthName + " '" + shortYear;
      monthlyActual[key] = (monthlyActual[key] || 0) + w.actualHours;
      monthlyRequired[key] = (monthlyRequired[key] || 0) + w.requiredHours;
    }
    return { monthlyActual, monthlyRequired };
  }, [weekly]);

  const cumData = monthlyTrend.periods.map((p) => p.cumulative);
  const lastCum = cumData[cumData.length - 1] ?? 0;
  const lineColor = lastCum >= 0 ? "#22c55e" : "#ef4444";

  return (
    <>
      <div className="chart-row fade-up delay-4">
        <div className="chart-box">
          <div className="chart-title">Hours per Month</div>
          <div className="chart-wrap">
            <Bar
              data={{
                labels,
                datasets: [
                  {
                    label: "Actual",
                    data: labels.map(
                      (l) => Math.round((monthlyActual[l] || 0) * 100) / 100,
                    ),
                    backgroundColor: "#3b82f680",
                    borderRadius: 4,
                    barPercentage: 0.6,
                  },
                  {
                    label: "Required",
                    data: labels.map(
                      (l) => Math.round((monthlyRequired[l] || 0) * 100) / 100,
                    ),
                    backgroundColor: "#ffffff10",
                    borderColor: "#ffffff20",
                    borderWidth: 1,
                    borderRadius: 4,
                    barPercentage: 0.6,
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
                    data: cumData,
                    borderColor: lineColor,
                    backgroundColor: lineColor + "10",
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3,
                    pointHoverRadius: 6,
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
                        ((ctx.parsed.y ?? 0) >= 0 ? "+" : "") +
                        ctx.parsed.y?.toFixed(1) +
                        "h",
                    },
                  },
                },
                scales: {
                  y: {
                    ticks: {
                      callback: (v) =>
                        ((v as number) >= 0 ? "+" : "") +
                        parseFloat((v as number).toFixed(1)) +
                        "h",
                    },
                    grid: {
                      color: (ctx) =>
                        ctx.tick.value === 0 ? "#ffffff20" : "#1e1e2e",
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      <div className="chart-box full fade-up delay-5">
        <div className="chart-title">Monthly Summary</div>
        <table className="monthly-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Delta</th>
              <th>Cumulative</th>
            </tr>
          </thead>
          <tbody>
            {monthlyTrend.periods.map((p) => {
              const sign = p.delta >= 0 ? "+" : "";
              const csign = p.cumulative >= 0 ? "+" : "";
              return (
                <tr key={p.label}>
                  <td>{p.label}</td>
                  <td className={p.delta >= 0 ? "positive" : "negative"}>
                    {sign}
                    {p.delta.toFixed(1)}h
                  </td>
                  <td className={p.cumulative >= 0 ? "positive" : "negative"}>
                    {csign}
                    {p.cumulative.toFixed(1)}h
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
