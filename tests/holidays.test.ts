import { test, expect, describe } from "bun:test";
import { getDanishHolidays, getAllHolidays, isHoliday } from "../src/holidays";

describe("getDanishHolidays", () => {
  test("includes fixed holidays", () => {
    const holidays = getDanishHolidays(2025);
    expect(holidays).toContain("2025-01-01"); // New Year's Day
    expect(holidays).toContain("2025-12-25"); // Christmas Day
    expect(holidays).toContain("2025-12-26"); // Second Christmas Day
  });

  test("includes Easter-based holidays for 2025", () => {
    // Easter Sunday 2025 is April 20
    const holidays = getDanishHolidays(2025);
    expect(holidays).toContain("2025-04-17"); // Maundy Thursday
    expect(holidays).toContain("2025-04-18"); // Good Friday
    expect(holidays).toContain("2025-04-20"); // Easter Sunday
    expect(holidays).toContain("2025-04-21"); // Easter Monday
    expect(holidays).toContain("2025-05-29"); // Ascension Day
    expect(holidays).toContain("2025-06-08"); // Whit Sunday
    expect(holidays).toContain("2025-06-09"); // Whit Monday
  });

  test("includes Store Bededag for 2023 and earlier", () => {
    const holidays2023 = getDanishHolidays(2023);
    // Easter 2023 is April 9, Store Bededag = April 9 + 26 = May 5
    expect(holidays2023).toContain("2023-05-05");
  });

  test("excludes Store Bededag for 2024 and later", () => {
    const holidays2024 = getDanishHolidays(2024);
    // Easter 2024 is March 31, would-be Store Bededag = March 31 + 26 = April 26
    expect(holidays2024).not.toContain("2024-04-26");
  });

  test("returns sorted dates", () => {
    const holidays = getDanishHolidays(2025);
    const sorted = [...holidays].sort();
    expect(holidays).toEqual(sorted);
  });
});

describe("getAllHolidays", () => {
  test("includes Danish holidays", () => {
    const all = getAllHolidays(2025, []);
    expect(all).toContain("2025-01-01");
    expect(all).toContain("2025-12-25");
  });

  test("includes year-specific custom holidays for matching year", () => {
    const all = getAllHolidays(2025, ["2025-06-05"]);
    expect(all).toContain("2025-06-05");
  });

  test("excludes year-specific custom holidays for non-matching year", () => {
    const all = getAllHolidays(2025, ["2024-06-05"]);
    expect(all).not.toContain("2024-06-05");
    expect(all).not.toContain("2025-06-05");
  });

  test("expands wildcard holidays to the requested year", () => {
    const all2025 = getAllHolidays(2025, ["*-12-24", "*-12-31"]);
    expect(all2025).toContain("2025-12-24");
    expect(all2025).toContain("2025-12-31");

    const all2026 = getAllHolidays(2026, ["*-12-24", "*-12-31"]);
    expect(all2026).toContain("2026-12-24");
    expect(all2026).toContain("2026-12-31");
  });

  test("wildcard holidays work across multiple years", () => {
    const custom = ["*-06-15"];
    for (const year of [2024, 2025, 2026, 2030]) {
      const all = getAllHolidays(year, custom);
      expect(all).toContain(`${year}-06-15`);
    }
  });

  test("mixes wildcard and year-specific holidays", () => {
    const custom = ["*-12-24", "2025-06-05"];
    const all2025 = getAllHolidays(2025, custom);
    expect(all2025).toContain("2025-12-24");
    expect(all2025).toContain("2025-06-05");

    const all2026 = getAllHolidays(2026, custom);
    expect(all2026).toContain("2026-12-24");
    expect(all2026).not.toContain("2026-06-05");
  });

  test("deduplicates when wildcard overlaps with Danish holiday", () => {
    // Dec 25 is already a Danish holiday
    const all = getAllHolidays(2025, ["*-12-25"]);
    const count = all.filter((d) => d === "2025-12-25").length;
    expect(count).toBe(1);
  });

  test("returns sorted dates", () => {
    const all = getAllHolidays(2025, ["*-12-24", "*-01-02", "2025-06-05"]);
    const sorted = [...all].sort();
    expect(all).toEqual(sorted);
  });
});

describe("isHoliday", () => {
  test("returns true for a date in the list", () => {
    expect(isHoliday("2025-12-25", ["2025-12-25", "2025-12-26"])).toBe(true);
  });

  test("returns false for a date not in the list", () => {
    expect(isHoliday("2025-12-24", ["2025-12-25", "2025-12-26"])).toBe(false);
  });

  test("returns false for empty list", () => {
    expect(isHoliday("2025-12-25", [])).toBe(false);
  });
});
