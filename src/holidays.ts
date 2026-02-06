/**
 * Danish public holidays calculator.
 *
 * Fixed holidays:
 * - New Year's Day (January 1)
 * - Christmas Day (December 25)
 * - Second Christmas Day (December 26)
 *
 * Easter-based holidays (moveable):
 * - Maundy Thursday (3 days before Easter)
 * - Good Friday (2 days before Easter)
 * - Easter Sunday
 * - Easter Monday (1 day after Easter)
 * - Great Prayer Day (4th Friday after Easter) - abolished after 2023
 * - Ascension Day (39 days after Easter)
 * - Whit Sunday (49 days after Easter)
 * - Whit Monday (50 days after Easter)
 */

/**
 * Calculate Easter Sunday for a given year using the Anonymous Gregorian algorithm.
 * Returns a Date object for Easter Sunday.
 */
function calculateEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

/**
 * Add days to a date and return a new Date.
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

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
 * Get all Danish public holidays for a given year.
 * Returns an array of date strings in YYYY-MM-DD format.
 */
export function getDanishHolidays(year: number): string[] {
  const holidays: string[] = [];

  // Fixed holidays
  holidays.push(`${year}-01-01`); // New Year's Day
  holidays.push(`${year}-12-25`); // Christmas Day
  holidays.push(`${year}-12-26`); // Second Christmas Day

  // Calculate Easter-based holidays
  const easter = calculateEasterSunday(year);

  // Maundy Thursday (3 days before Easter)
  holidays.push(formatDate(addDays(easter, -3)));

  // Good Friday (2 days before Easter)
  holidays.push(formatDate(addDays(easter, -2)));

  // Easter Sunday
  holidays.push(formatDate(easter));

  // Easter Monday (1 day after Easter)
  holidays.push(formatDate(addDays(easter, 1)));

  // Great Prayer Day (Store Bededag) - 4th Friday after Easter
  // Abolished after 2023, so only include for years <= 2023
  if (year <= 2023) {
    holidays.push(formatDate(addDays(easter, 26)));
  }

  // Ascension Day (39 days after Easter)
  holidays.push(formatDate(addDays(easter, 39)));

  // Whit Sunday (Pentecost, 49 days after Easter)
  holidays.push(formatDate(addDays(easter, 49)));

  // Whit Monday (50 days after Easter)
  holidays.push(formatDate(addDays(easter, 50)));

  return holidays.sort();
}

/**
 * Get all holidays (Danish public + custom) for a given year.
 * Merges Danish public holidays with custom holidays from config.
 * Returns a deduplicated, sorted array of date strings in YYYY-MM-DD format.
 */
export function getAllHolidays(
  year: number,
  customHolidays: string[]
): string[] {
  const danishHolidays = getDanishHolidays(year);

  // Expand custom holidays for the given year
  // Supports both "YYYY-MM-DD" (specific year) and "*-MM-DD" (every year)
  const yearPrefix = `${year}-`;
  const customHolidaysForYear = customHolidays
    .filter((h) => h.startsWith(yearPrefix) || h.startsWith("*-"))
    .map((h) => (h.startsWith("*-") ? `${year}${h.slice(1)}` : h));

  // Merge and deduplicate
  const allHolidays = new Set([...danishHolidays, ...customHolidaysForYear]);

  return Array.from(allHolidays).sort();
}

/**
 * Check if a date string (YYYY-MM-DD) is a holiday.
 */
export function isHoliday(dateStr: string, holidays: string[]): boolean {
  return holidays.includes(dateStr);
}
