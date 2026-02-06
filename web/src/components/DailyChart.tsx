import { Bar } from "react-chartjs-2";
import type { DailyData } from "../types";

interface DailyChartProps {
  daily: DailyData[];
}

export function DailyChart({ daily }: DailyChartProps) {
  const last30 = daily.slice(-30);
  const labels = last30.map((d) => {
    const dt = new Date(d.date + "T00:00:00");
    return dt.getDate() + "/" + (dt.getMonth() + 1);
  });

  return (
    <div className="chart-wrap">
      <Bar
        data={{
          labels,
          datasets: [
            {
              label: "Actual",
              data: last30.map((d) => Math.round(d.actualHours * 100) / 100),
              backgroundColor: last30.map((d) =>
                d.isWeekend || d.isHoliday ? "#8b5cf640" : "#3b82f680"
              ),
              borderRadius: 3,
              barPercentage: 0.7,
            },
            {
              label: "Required",
              data: last30.map((d) => d.requiredHours),
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
          aspectRatio: 3,
          plugins: {
            legend: {
              display: true,
              position: "top",
              align: "end",
              labels: { boxWidth: 12, boxHeight: 12, borderRadius: 2, useBorderRadius: true, padding: 16 },
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ctx.dataset.label + ": " + ctx.parsed.y.toFixed(1) + "h",
              },
            },
          },
          scales: {
            x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 15 } },
            y: { beginAtZero: true, ticks: { callback: (v) => v + "h" } },
          },
        }}
      />
    </div>
  );
}
