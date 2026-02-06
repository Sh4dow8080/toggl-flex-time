import { test, expect, describe } from "bun:test";
import { parseHoursInput, parseCustomHolidays, maskToken } from "../src/setup";

describe("parseHoursInput", () => {
  test("returns default for empty input", () => {
    expect(parseHoursInput("", 7)).toBe(7);
    expect(parseHoursInput("  ", 7)).toBe(7);
  });

  test("parses valid integer hours", () => {
    expect(parseHoursInput("8", 7)).toBe(8);
    expect(parseHoursInput("5", 7)).toBe(5);
  });

  test("parses valid decimal hours", () => {
    expect(parseHoursInput("7.5", 7)).toBe(7.5);
    expect(parseHoursInput("6.25", 7)).toBe(6.25);
  });

  test("returns null for zero", () => {
    expect(parseHoursInput("0", 7)).toBeNull();
  });

  test("returns null for negative numbers", () => {
    expect(parseHoursInput("-1", 7)).toBeNull();
  });

  test("returns null for numbers over default max of 24", () => {
    expect(parseHoursInput("25", 7)).toBeNull();
  });

  test("returns null for non-numeric input", () => {
    expect(parseHoursInput("abc", 7)).toBeNull();
    expect(parseHoursInput("seven", 7)).toBeNull();
  });

  test("accepts boundary value of 24", () => {
    expect(parseHoursInput("24", 7)).toBe(24);
  });

  test("respects custom max parameter", () => {
    expect(parseHoursInput("35", 7, 168)).toBe(35);
    expect(parseHoursInput("169", 7, 168)).toBeNull();
  });
});

describe("parseCustomHolidays", () => {
  test("returns empty array for empty input", () => {
    expect(parseCustomHolidays("")).toEqual([]);
    expect(parseCustomHolidays("  ")).toEqual([]);
  });

  test("parses single date", () => {
    expect(parseCustomHolidays("2025-12-24")).toEqual(["2025-12-24"]);
  });

  test("parses multiple dates", () => {
    expect(parseCustomHolidays("2025-12-24, 2025-12-31")).toEqual([
      "2025-12-24",
      "2025-12-31",
    ]);
  });

  test("parses wildcard year dates", () => {
    expect(parseCustomHolidays("*-12-24, *-12-31")).toEqual([
      "*-12-24",
      "*-12-31",
    ]);
  });

  test("handles mixed specific and wildcard dates", () => {
    expect(parseCustomHolidays("2025-12-24, *-12-31")).toEqual([
      "2025-12-24",
      "*-12-31",
    ]);
  });

  test("trims whitespace around dates", () => {
    expect(parseCustomHolidays("  2025-12-24 ,  *-12-31  ")).toEqual([
      "2025-12-24",
      "*-12-31",
    ]);
  });

  test("returns null for invalid date format", () => {
    expect(parseCustomHolidays("12-24")).toBeNull();
    expect(parseCustomHolidays("2025/12/24")).toBeNull();
    expect(parseCustomHolidays("not-a-date")).toBeNull();
  });

  test("returns null if any date in list is invalid", () => {
    expect(parseCustomHolidays("2025-12-24, bad")).toBeNull();
  });

  test("ignores trailing commas", () => {
    expect(parseCustomHolidays("2025-12-24,")).toEqual(["2025-12-24"]);
  });
});

describe("maskToken", () => {
  test("masks token showing first 4 chars", () => {
    expect(maskToken("abcdef1234567890")).toBe("abcd************");
  });

  test("handles short tokens (4 or fewer chars)", () => {
    expect(maskToken("abc")).toBe("***");
    expect(maskToken("abcd")).toBe("****");
  });

  test("handles empty string", () => {
    expect(maskToken("")).toBe("");
  });

  test("handles exactly 5 chars", () => {
    expect(maskToken("abcde")).toBe("abcd*");
  });
});
