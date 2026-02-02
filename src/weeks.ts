/**
 * Shared utilities for week-based calculations.
 * Used by both the CLI (index.ts) and web dashboard (web.ts).
 */

import { calculateFlexTime } from "./calculator";
import type { SimplifiedEntry } from "./toggl";

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get the Monday of the week containing the given date.
 */
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get ISO week number for a date.
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export interface WeekData {
  weekNumber: number;
  year: number;
  startDate: Date;
  endDate: Date;
  entries: SimplifiedEntry[];
}

/**
 * Group entries by week and generate week ranges.
 */
export function getWeekRanges(startDate: Date, endDate: Date, entries: SimplifiedEntry[]): WeekData[] {
  const weeks: WeekData[] = [];

  // Start from the Monday of the first week
  let currentMonday = getMonday(startDate);

  while (currentMonday <= endDate) {
    const weekEnd = new Date(currentMonday);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Clamp to actual date range
    const effectiveStart = currentMonday < startDate ? startDate : currentMonday;
    const effectiveEnd = weekEnd > endDate ? endDate : weekEnd;

    // Filter entries for this week
    const weekStartStr = formatDate(effectiveStart);
    const weekEndStr = formatDate(effectiveEnd);
    const weekEntries = entries.filter(e => e.date >= weekStartStr && e.date <= weekEndStr);

    weeks.push({
      weekNumber: getWeekNumber(currentMonday),
      year: currentMonday.getFullYear(),
      startDate: effectiveStart,
      endDate: effectiveEnd,
      entries: weekEntries,
    });

    // Move to next Monday
    currentMonday = new Date(currentMonday);
    currentMonday.setDate(currentMonday.getDate() + 7);
  }

  return weeks;
}

export interface JsonSummaryOutput {
  period: { start: string; end: string };
  workdays: number;
  requiredHours: number;
  actualHours: number;
  flexBalance: number;
  config: { hoursPerDay: number; hoursPerWeek: number };
}

export interface JsonWeekOutput {
  weekNumber: number;
  year: number;
  period: { start: string; end: string };
  requiredHours: number;
  actualHours: number;
  flexBalance: number;
  cumulativeFlex: number;
}

export interface JsonTrendOutput {
  granularity: "weekly" | "monthly";
  periods: Array<{
    label: string;
    delta: number;
    cumulative: number;
  }>;
}

export function buildWeeklyJson(
  weeks: WeekData[],
  hoursPerDay: number,
  holidays: string[]
): JsonWeekOutput[] {
  let cumulativeFlex = 0;
  return weeks.map(week => {
    const result = calculateFlexTime(
      week.startDate,
      week.endDate,
      week.entries,
      hoursPerDay,
      holidays
    );
    cumulativeFlex += result.flexBalance;
    return {
      weekNumber: week.weekNumber,
      year: week.year,
      period: {
        start: formatDate(week.startDate),
        end: formatDate(week.endDate),
      },
      requiredHours: Math.round(result.requiredHours * 100) / 100,
      actualHours: Math.round(result.actualHours * 100) / 100,
      flexBalance: Math.round(result.flexBalance * 100) / 100,
      cumulativeFlex: Math.round(cumulativeFlex * 100) / 100,
    };
  });
}

export function buildTrendJson(
  weeks: WeekData[],
  hoursPerDay: number,
  holidays: string[],
  granularity: "weekly" | "monthly"
): JsonTrendOutput {
  // Calculate per-week data first
  const weeklyData = weeks.map(week => {
    const result = calculateFlexTime(
      week.startDate,
      week.endDate,
      week.entries,
      hoursPerDay,
      holidays
    );
    return {
      weekNumber: week.weekNumber,
      year: week.year,
      month: week.startDate.getMonth(),
      delta: result.flexBalance,
    };
  });

  if (granularity === "monthly") {
    // Aggregate by month
    const monthlyMap = new Map<string, { label: string; delta: number }>();
    const monthNames: Record<number, string> = {
      0: "Jan", 1: "Feb", 2: "Mar", 3: "Apr", 4: "May", 5: "Jun",
      6: "Jul", 7: "Aug", 8: "Sep", 9: "Oct", 10: "Nov", 11: "Dec"
    };

    for (const w of weeklyData) {
      const key = `${w.year}-${w.month}`;
      const existing = monthlyMap.get(key);
      if (existing) {
        existing.delta += w.delta;
      } else {
        monthlyMap.set(key, { label: monthNames[w.month] ?? "Unknown", delta: w.delta });
      }
    }

    let cumulative = 0;
    const periods = Array.from(monthlyMap.values()).map(m => {
      cumulative += m.delta;
      return {
        label: m.label,
        delta: Math.round(m.delta * 100) / 100,
        cumulative: Math.round(cumulative * 100) / 100,
      };
    });

    return { granularity, periods };
  }

  // Weekly granularity
  let cumulative = 0;
  const periods = weeklyData.map(w => {
    cumulative += w.delta;
    return {
      label: `W${w.weekNumber.toString().padStart(2, "0")}`,
      delta: Math.round(w.delta * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
    };
  });

  return { granularity, periods };
}
