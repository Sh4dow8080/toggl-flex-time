/**
 * Flex time calculator.
 * Calculates required hours, actual hours, and flex balance.
 */

import type { SimplifiedEntry } from "./toggl";
import { isHoliday } from "./holidays";

/**
 * Format a Date as YYYY-MM-DD string.
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Check if a date falls on a weekend (Saturday or Sunday).
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Get all dates between two dates (inclusive).
 */
function getDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Count workdays in a date range (excluding weekends and holidays).
 */
export function countWorkdays(
  startDate: Date,
  endDate: Date,
  holidays: string[]
): number {
  const dates = getDateRange(startDate, endDate);

  return dates.filter((date) => {
    if (isWeekend(date)) return false;
    if (isHoliday(formatDate(date), holidays)) return false;
    return true;
  }).length;
}

/**
 * Calculate required hours for a date range.
 *
 * @param startDate - Start of the period
 * @param endDate - End of the period
 * @param hoursPerDay - Hours required per workday
 * @param holidays - Array of holiday date strings (YYYY-MM-DD)
 * @returns Required hours for the period
 */
export function calculateRequiredHours(
  startDate: Date,
  endDate: Date,
  hoursPerDay: number,
  holidays: string[]
): number {
  const workdays = countWorkdays(startDate, endDate, holidays);
  return workdays * hoursPerDay;
}

/**
 * Sum actual hours worked from Toggl entries.
 *
 * @param entries - Array of simplified time entries
 * @returns Total hours worked
 */
export function sumActualHours(entries: SimplifiedEntry[]): number {
  const totalSeconds = entries.reduce(
    (sum, entry) => sum + entry.durationSeconds,
    0
  );
  return totalSeconds / 3600; // Convert seconds to hours
}

/**
 * Calculate flex balance (actual - required).
 *
 * @param actualHours - Hours actually worked
 * @param requiredHours - Hours required
 * @returns Flex balance (positive = surplus, negative = deficit)
 */
export function calculateFlexBalance(
  actualHours: number,
  requiredHours: number
): number {
  return actualHours - requiredHours;
}

/**
 * Calculate required hours for the current partial week.
 * Counts workdays from Monday of the current week through today.
 *
 * @param today - The current date
 * @param hoursPerDay - Hours required per workday
 * @param holidays - Array of holiday date strings (YYYY-MM-DD)
 * @returns Required hours for the partial week
 */
export function calculatePartialWeekHours(
  today: Date,
  hoursPerDay: number,
  holidays: string[]
): number {
  // Get Monday of the current week
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(today);
  monday.setDate(monday.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);

  // Count workdays from Monday through today
  return calculateRequiredHours(monday, today, hoursPerDay, holidays);
}

export interface FlexCalculationResult {
  startDate: Date;
  endDate: Date;
  requiredHours: number;
  actualHours: number;
  flexBalance: number;
  workdays: number;
}

/**
 * Calculate complete flex time information for a period.
 */
export function calculateFlexTime(
  startDate: Date,
  endDate: Date,
  entries: SimplifiedEntry[],
  hoursPerDay: number,
  holidays: string[]
): FlexCalculationResult {
  const workdays = countWorkdays(startDate, endDate, holidays);
  const requiredHours = workdays * hoursPerDay;
  const actualHours = sumActualHours(entries);
  const flexBalance = calculateFlexBalance(actualHours, requiredHours);

  return {
    startDate,
    endDate,
    requiredHours,
    actualHours,
    flexBalance,
    workdays,
  };
}
