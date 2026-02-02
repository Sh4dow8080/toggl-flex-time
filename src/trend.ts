/**
 * Trend chart visualization for flex time.
 * Renders ASCII dual-charts showing delta per period and cumulative balance.
 */

import { calculateFlexTime, type FlexCalculationResult } from "./calculator";
import type { SimplifiedEntry } from "./toggl";

// ANSI color codes
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

export interface WeekData {
  weekNumber: number;
  year: number;
  startDate: Date;
  endDate: Date;
  entries: SimplifiedEntry[];
}

interface PeriodData {
  label: string;      // "W01" or "Jan"
  delta: number;      // This period's flex change
  cumulative: number; // Running total
}

/**
 * Scale a value to a bar representation.
 * Uses full blocks for positive, light shade for negative.
 */
function scaleBar(value: number, maxAbsValue: number, width: number): string {
  if (maxAbsValue === 0) return "";

  const barLength = Math.round((Math.abs(value) / maxAbsValue) * width);
  const char = value >= 0 ? "█" : "░";
  return char.repeat(barLength);
}

/**
 * Format hours with sign and color.
 */
function formatHours(hours: number): string {
  const sign = hours >= 0 ? "+" : "";
  return `${sign}${hours.toFixed(1)}h`;
}

function coloredHours(hours: number, padWidth = 0): string {
  const formatted = formatHours(hours);
  const padded = padWidth > 0 ? formatted.padStart(padWidth) : formatted;
  if (hours > 0) {
    return `${colors.green}${padded}${colors.reset}`;
  } else if (hours < 0) {
    return `${colors.red}${padded}${colors.reset}`;
  }
  return padded;
}

function coloredBar(bar: string, value: number): string {
  if (value > 0) {
    return `${colors.green}${bar}${colors.reset}`;
  } else if (value < 0) {
    return `${colors.red}${bar}${colors.reset}`;
  }
  return bar;
}

/**
 * Render the dual chart (delta + cumulative).
 */
function renderDualChart(periods: PeriodData[], granularity: "weekly" | "monthly"): string {
  const lines: string[] = [];
  const barWidth = 15;

  // Find max absolute values for scaling
  const maxDelta = Math.max(...periods.map(p => Math.abs(p.delta)), 0.1);
  const maxCumulative = Math.max(...periods.map(p => Math.abs(p.cumulative)), 0.1);

  // Headers
  lines.push(`  Delta per ${granularity === "weekly" ? "Week" : "Month"}                    Cumulative Balance`);
  lines.push(`  ${"─".repeat(18)}                    ${"─".repeat(18)}`);

  for (const period of periods) {
    // Delta bar (left side)
    const deltaBar = scaleBar(period.delta, maxDelta, barWidth);
    const deltaBarColored = coloredBar(deltaBar, period.delta);

    // Cumulative bar (right side)
    const cumBar = scaleBar(period.cumulative, maxCumulative, barWidth);
    const cumBarColored = coloredBar(cumBar, period.cumulative);

    // Format: label │ bar value    label │ bar value
    const label = period.label.padEnd(3);

    // For delta: positive bars go right, negative go right with different char
    const deltaBarPadded = period.delta >= 0
      ? `│${deltaBarColored}${" ".repeat(barWidth - deltaBar.length)}`
      : `│${" ".repeat(barWidth - deltaBar.length)}${deltaBarColored}`;

    // For cumulative: always show bar going right from the edge
    const cumBarPadded = `│${cumBarColored}${" ".repeat(barWidth - cumBar.length)}`;

    const deltaValuePadded = coloredHours(period.delta, 7);
    const cumValuePadded = coloredHours(period.cumulative, 8);

    const deltaSection = `${label} ${deltaBarPadded} ${deltaValuePadded}`;
    const cumSection = `${label} ${cumBarPadded} ${cumValuePadded}`;

    lines.push(`  ${deltaSection}           ${cumSection}`);
  }

  return lines.join("\n");
}

/**
 * Get month abbreviation from month number (0-11).
 */
function getMonthAbbrev(month: number): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months[month] ?? "???";
}

/**
 * Aggregate weeks into months.
 */
function aggregateByMonth(
  weeks: WeekData[],
  hoursPerDay: number,
  holidays: string[]
): PeriodData[] {
  // Group weeks by month
  const monthMap = new Map<string, { weeks: WeekData[]; month: number; year: number }>();

  for (const week of weeks) {
    // Use the start date's month for grouping
    const month = week.startDate.getMonth();
    const year = week.startDate.getFullYear();
    const key = `${year}-${month}`;

    if (!monthMap.has(key)) {
      monthMap.set(key, { weeks: [], month, year });
    }
    monthMap.get(key)!.weeks.push(week);
  }

  // Convert to periods with cumulative calculation
  const periods: PeriodData[] = [];
  let cumulative = 0;

  // Sort by year and month
  const sortedKeys = Array.from(monthMap.keys()).sort();

  for (const key of sortedKeys) {
    const { weeks: monthWeeks, month } = monthMap.get(key)!;

    // Calculate total delta for the month
    let monthDelta = 0;
    for (const week of monthWeeks) {
      const result = calculateFlexTime(
        week.startDate,
        week.endDate,
        week.entries,
        hoursPerDay,
        holidays
      );
      monthDelta += result.flexBalance;
    }

    cumulative += monthDelta;

    periods.push({
      label: getMonthAbbrev(month),
      delta: monthDelta,
      cumulative,
    });
  }

  return periods;
}

/**
 * Calculate period data from weeks.
 */
function calculatePeriods(
  weeks: WeekData[],
  hoursPerDay: number,
  holidays: string[]
): PeriodData[] {
  const periods: PeriodData[] = [];
  let cumulative = 0;

  for (const week of weeks) {
    const result = calculateFlexTime(
      week.startDate,
      week.endDate,
      week.entries,
      hoursPerDay,
      holidays
    );

    cumulative += result.flexBalance;

    periods.push({
      label: `W${week.weekNumber.toString().padStart(2, "0")}`,
      delta: result.flexBalance,
      cumulative,
    });
  }

  return periods;
}

/**
 * Main entry point for rendering trend chart.
 */
export function renderTrendChart(
  weeks: WeekData[],
  hoursPerDay: number,
  holidays: string[],
  granularity: "weekly" | "monthly" = "weekly"
): string {
  const lines: string[] = [];

  // Calculate period data
  let periods: PeriodData[];
  if (granularity === "monthly") {
    periods = aggregateByMonth(weeks, hoursPerDay, holidays);
  } else {
    periods = calculatePeriods(weeks, hoursPerDay, holidays);
  }

  if (periods.length === 0) {
    return "No data for trend chart.";
  }

  // Header
  const title = granularity === "weekly" ? "Flex Trend (Weekly)" : "Flex Trend (Monthly)";
  lines.push(`${colors.bold}${title}${colors.reset}`);
  lines.push("═".repeat(60));
  lines.push("");

  // Render the dual chart
  lines.push(renderDualChart(periods, granularity));

  // Current balance
  const current = periods[periods.length - 1]!.cumulative;
  lines.push("");
  lines.push(`  ${colors.bold}Current: ${coloredHours(current)}${colors.reset}`);

  return lines.join("\n");
}
