import type { JsonSummaryOutput } from "../types";

interface StatsProps {
  summary: JsonSummaryOutput;
}

export function Stats({ summary }: StatsProps) {
  const avg = summary.workdays > 0 ? summary.actualHours / summary.workdays : 0;

  return (
    <div className="stats fade-up delay-2">
      <div className="stat-card">
        <div className="stat-label">Workdays</div>
        <div className="stat-value">
          {summary.workdays}<span className="stat-unit">days</span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Required</div>
        <div className="stat-value">
          {summary.requiredHours.toFixed(1)}<span className="stat-unit">hrs</span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Worked</div>
        <div className="stat-value">
          {summary.actualHours.toFixed(1)}<span className="stat-unit">hrs</span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Avg / Day</div>
        <div className="stat-value">
          {avg.toFixed(2)}<span className="stat-unit">hrs</span>
        </div>
      </div>
    </div>
  );
}
