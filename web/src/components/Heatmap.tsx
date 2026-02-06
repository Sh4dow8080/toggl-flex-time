import { useState, useMemo } from "react";
import type { DailyData } from "../types";

interface HeatmapProps {
  daily: DailyData[];
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const COL_WIDTH = 16; // 13px cell + 3px gap

function fmtDate(d: Date): string {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function getCellClass(day: { data: DailyData | null }, reqH: number): string {
  if (!day.data) return "heatmap-cell empty";
  if (day.data.isWeekend && day.data.actualHours === 0) return "heatmap-cell weekend";
  if (day.data.isHoliday && day.data.actualHours === 0) return "heatmap-cell holiday";

  const actual = day.data.actualHours;
  const required = day.data.requiredHours || reqH;

  if (actual === 0) return "heatmap-cell level-0";
  if (actual < required * 0.75) return "heatmap-cell under-1";
  if (actual < required * 0.93) return "heatmap-cell under-2";
  if (actual < required) return "heatmap-cell near";
  if (actual < required * 1.07) return "heatmap-cell met";
  if (actual < required * 1.15) return "heatmap-cell slight-over";
  if (actual < required * 1.3) return "heatmap-cell over-1";
  return "heatmap-cell over-2";
}

export function Heatmap({ daily }: HeatmapProps) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const { weeks, monthLabels, reqH } = useMemo(() => {
    const dailyMap: Record<string, DailyData> = {};
    for (const d of daily) dailyMap[d.date] = d;

    const reqH = daily.find((d) => d.requiredHours > 0)?.requiredHours || 7;

    // Find the Monday on or before the first date
    const firstDate = new Date(daily[0]!.date + "T00:00:00");
    const dayOfWeek = firstDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startMonday = new Date(firstDate);
    startMonday.setDate(startMonday.getDate() + mondayOffset);

    // Build week columns
    const weeks: { date: string; data: DailyData | null }[][] = [];
    const cur = new Date(startMonday);
    while (true) {
      const week: { date: string; data: DailyData | null }[] = [];
      for (let i = 0; i < 7; i++) {
        const ds = fmtDate(cur);
        week.push({ date: ds, data: dailyMap[ds] || null });
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push(week);
      if (cur > new Date(daily[daily.length - 1]!.date + "T23:59:59")) break;
    }

    // Month labels
    let lastMonth = -1;
    const monthStarts: { month: number; weekIndex: number }[] = [];
    for (let wi = 0; wi < weeks.length; wi++) {
      const thu = weeks[wi]![3]!;
      if (thu.data) {
        const m = new Date(thu.date + "T00:00:00").getMonth();
        if (m !== lastMonth) {
          monthStarts.push({ month: m, weekIndex: wi });
          lastMonth = m;
        }
      }
    }

    const monthLabels: { type: "spacer" | "label"; label: string; width: number }[] = [];
    for (let i = 0; i < monthStarts.length; i++) {
      const ms = monthStarts[i]!;
      const nextStart = i + 1 < monthStarts.length ? monthStarts[i + 1]!.weekIndex : weeks.length;
      if (i === 0 && ms.weekIndex > 0) {
        monthLabels.push({ type: "spacer", label: "", width: ms.weekIndex * COL_WIDTH });
      }
      monthLabels.push({
        type: "label",
        label: MONTH_NAMES[ms.month]!,
        width: (nextStart - ms.weekIndex) * COL_WIDTH,
      });
    }

    return { weeks, monthLabels, reqH };
  }, [daily]);

  return (
    <div className="heatmap-container">
      {/* Month labels */}
      <div className="heatmap-months">
        {monthLabels.map((ml, i) =>
          ml.type === "spacer" ? (
            <div key={`spacer-${i}`} style={{ width: ml.width, flexShrink: 0 }} />
          ) : (
            <div
              key={`month-${i}`}
              className="heatmap-month-label"
              style={{ width: ml.width, flexShrink: 0 }}
            >
              {ml.label}
            </div>
          )
        )}
      </div>

      {/* Grid */}
      <div className="heatmap-grid">
        <div className="heatmap-day-labels">
          {DAY_NAMES.map((name, i) => (
            <div key={i} className="heatmap-day-label">
              {i % 2 === 0 ? name : ""}
            </div>
          ))}
        </div>
        <div className="heatmap-weeks">
          {weeks.map((week, wi) => (
            <div key={wi} className="heatmap-week">
              {week.map((day) => (
                <div
                  key={day.date}
                  className={getCellClass(day, reqH)}
                  data-hours={day.data ? day.data.actualHours.toFixed(1) : undefined}
                  onMouseEnter={(e) => {
                    if (!day.data) return;
                    const d = day.data;
                    let info = d.date + "\n" + d.actualHours.toFixed(1) + "h worked";
                    if (d.isHoliday) info += " (holiday)";
                    else if (d.isWeekend) info += " (weekend)";
                    else info += " / " + d.requiredHours.toFixed(1) + "h required";
                    const r = (e.target as HTMLElement).getBoundingClientRect();
                    setTooltip({
                      text: info,
                      x: r.left + r.width / 2,
                      y: r.top - 40,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="heatmap-legend">
        <span className="heatmap-legend-label">Under</span>
        <div className="heatmap-cell under-1" />
        <div className="heatmap-cell under-2" />
        <div className="heatmap-cell near" />
        <div className="heatmap-cell met" />
        <div className="heatmap-cell slight-over" />
        <div className="heatmap-cell over-1" />
        <div className="heatmap-cell over-2" />
        <span className="heatmap-legend-label">Over</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="tooltip"
          style={{
            display: "block",
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y,
            transform: "translateX(-50%)",
            whiteSpace: "pre",
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
