/**
 * Daily breakdown computation.
 * Iterates every calendar day in a range, maps entries by date,
 * and marks weekends/holidays.
 */

import { isHoliday } from "./holidays";
import { formatDate } from "./weeks";
import type { SimplifiedEntry } from "./toggl";

export interface DailyData {
  date: string;           // "YYYY-MM-DD"
  dayOfWeek: number;      // 0=Sun...6=Sat
  actualHours: number;
  requiredHours: number;  // hoursPerDay for workdays, 0 for weekends/holidays
  flexBalance: number;
  isWeekend: boolean;
  isHoliday: boolean;
}

export function buildDailyData(
  startDate: Date,
  endDate: Date,
  entries: SimplifiedEntry[],
  hoursPerDay: number,
  holidays: string[]
): DailyData[] {
  // Group entries by date for fast lookup
  const entriesByDate = new Map<string, number>();
  for (const entry of entries) {
    const existing = entriesByDate.get(entry.date) ?? 0;
    entriesByDate.set(entry.date, existing + entry.durationSeconds);
  }

  const days: DailyData[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    const dateStr = formatDate(current);
    const dayOfWeek = current.getDay();
    const weekend = dayOfWeek === 0 || dayOfWeek === 6;
    const holiday = isHoliday(dateStr, holidays);
    const isWorkday = !weekend && !holiday;

    const totalSeconds = entriesByDate.get(dateStr) ?? 0;
    const actualHours = totalSeconds / 3600;
    const requiredHours = isWorkday ? hoursPerDay : 0;

    days.push({
      date: dateStr,
      dayOfWeek,
      actualHours,
      requiredHours,
      flexBalance: actualHours - requiredHours,
      isWeekend: weekend,
      isHoliday: holiday,
    });

    current.setDate(current.getDate() + 1);
  }

  return days;
}
