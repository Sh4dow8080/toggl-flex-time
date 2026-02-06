import { test, expect, describe } from "bun:test";
import {
  countWorkdays,
  calculateRequiredHours,
  sumActualHours,
  calculateFlexBalance,
  calculatePartialWeekHours,
} from "../src/calculator";

describe("countWorkdays", () => {
  test("counts weekdays in a full week (Mon-Sun)", () => {
    // 2025-01-06 is a Monday, 2025-01-12 is a Sunday
    const start = new Date(2025, 0, 6);
    const end = new Date(2025, 0, 12);
    expect(countWorkdays(start, end, [])).toBe(5);
  });

  test("counts weekdays in a partial week (Mon-Wed)", () => {
    const start = new Date(2025, 0, 6); // Monday
    const end = new Date(2025, 0, 8); // Wednesday
    expect(countWorkdays(start, end, [])).toBe(3);
  });

  test("returns 0 for a weekend-only range", () => {
    const start = new Date(2025, 0, 11); // Saturday
    const end = new Date(2025, 0, 12); // Sunday
    expect(countWorkdays(start, end, [])).toBe(0);
  });

  test("excludes holidays", () => {
    // Mon-Fri week, but Wednesday is a holiday
    const start = new Date(2025, 0, 6); // Monday
    const end = new Date(2025, 0, 10); // Friday
    expect(countWorkdays(start, end, ["2025-01-08"])).toBe(4);
  });

  test("excludes multiple holidays", () => {
    const start = new Date(2025, 0, 6); // Monday
    const end = new Date(2025, 0, 10); // Friday
    expect(countWorkdays(start, end, ["2025-01-06", "2025-01-10"])).toBe(3);
  });

  test("holiday on a weekend does not reduce count", () => {
    const start = new Date(2025, 0, 6); // Monday
    const end = new Date(2025, 0, 12); // Sunday
    // Saturday is already excluded, so a holiday on Saturday doesn't change anything
    expect(countWorkdays(start, end, ["2025-01-11"])).toBe(5);
  });

  test("single day that is a workday", () => {
    const day = new Date(2025, 0, 6); // Monday
    expect(countWorkdays(day, day, [])).toBe(1);
  });

  test("single day that is a weekend", () => {
    const day = new Date(2025, 0, 11); // Saturday
    expect(countWorkdays(day, day, [])).toBe(0);
  });

  test("two full weeks", () => {
    const start = new Date(2025, 0, 6); // Monday
    const end = new Date(2025, 0, 19); // Sunday
    expect(countWorkdays(start, end, [])).toBe(10);
  });
});

describe("calculateRequiredHours", () => {
  test("multiplies workdays by hours per day", () => {
    // Mon-Fri = 5 workdays, 7 hours/day = 35 hours
    const start = new Date(2025, 0, 6);
    const end = new Date(2025, 0, 10);
    expect(calculateRequiredHours(start, end, 7, [])).toBe(35);
  });

  test("accounts for holidays", () => {
    const start = new Date(2025, 0, 6); // Monday
    const end = new Date(2025, 0, 10); // Friday
    // 4 workdays * 7 hours = 28
    expect(calculateRequiredHours(start, end, 7, ["2025-01-08"])).toBe(28);
  });

  test("works with non-standard hours per day", () => {
    const start = new Date(2025, 0, 6);
    const end = new Date(2025, 0, 10);
    expect(calculateRequiredHours(start, end, 8, [])).toBe(40);
  });
});

describe("sumActualHours", () => {
  test("sums durations and converts to hours", () => {
    const entries = [
      { date: "2025-01-06", durationSeconds: 3600 }, // 1 hour
      { date: "2025-01-07", durationSeconds: 7200 }, // 2 hours
      { date: "2025-01-08", durationSeconds: 1800 }, // 0.5 hours
    ];
    expect(sumActualHours(entries)).toBe(3.5);
  });

  test("returns 0 for empty array", () => {
    expect(sumActualHours([])).toBe(0);
  });

  test("handles a single entry", () => {
    const entries = [{ date: "2025-01-06", durationSeconds: 25200 }]; // 7 hours
    expect(sumActualHours(entries)).toBe(7);
  });
});

describe("calculateFlexBalance", () => {
  test("positive balance when ahead", () => {
    expect(calculateFlexBalance(40, 35)).toBe(5);
  });

  test("negative balance when behind", () => {
    expect(calculateFlexBalance(30, 35)).toBe(-5);
  });

  test("zero when exactly on target", () => {
    expect(calculateFlexBalance(35, 35)).toBe(0);
  });
});

describe("calculatePartialWeekHours", () => {
  test("Monday returns 1 day of hours", () => {
    const monday = new Date(2025, 0, 6); // Monday
    expect(calculatePartialWeekHours(monday, 7, [])).toBe(7);
  });

  test("Wednesday returns 3 days of hours (Mon-Wed)", () => {
    const wednesday = new Date(2025, 0, 8); // Wednesday
    expect(calculatePartialWeekHours(wednesday, 7, [])).toBe(21);
  });

  test("Friday returns 5 days of hours", () => {
    const friday = new Date(2025, 0, 10); // Friday
    expect(calculatePartialWeekHours(friday, 7, [])).toBe(35);
  });

  test("Saturday returns 5 days of hours (same as Friday)", () => {
    const saturday = new Date(2025, 0, 11); // Saturday
    // Mon-Sat: 5 workdays (Sat is weekend)
    expect(calculatePartialWeekHours(saturday, 7, [])).toBe(35);
  });

  test("Sunday returns 5 days of hours (full week, no weekend days)", () => {
    const sunday = new Date(2025, 0, 12); // Sunday
    // Mon of that week is Jan 6, Mon-Sun = 5 workdays
    expect(calculatePartialWeekHours(sunday, 7, [])).toBe(35);
  });

  test("accounts for holidays within the week", () => {
    const friday = new Date(2025, 0, 10); // Friday
    // Holiday on Wednesday means 4 workdays
    expect(calculatePartialWeekHours(friday, 7, ["2025-01-08"])).toBe(28);
  });
});
