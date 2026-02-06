import { test, expect, describe } from "bun:test";
import {
  mergeEntries,
  calculateFetchRange,
  formatDateForCache,
} from "../src/cache";
import type { SimplifiedEntry } from "../src/toggl";

describe("formatDateForCache", () => {
  test("formats date as YYYY-MM-DD", () => {
    expect(formatDateForCache(new Date(2025, 0, 6))).toBe("2025-01-06");
  });

  test("pads single-digit month and day", () => {
    expect(formatDateForCache(new Date(2025, 2, 5))).toBe("2025-03-05");
  });

  test("handles December", () => {
    expect(formatDateForCache(new Date(2025, 11, 31))).toBe("2025-12-31");
  });
});

describe("mergeEntries", () => {
  test("returns fresh entries when cache is empty", () => {
    const fresh: SimplifiedEntry[] = [
      { date: "2025-01-06", durationSeconds: 3600 },
      { date: "2025-01-07", durationSeconds: 7200 },
    ];
    const result = mergeEntries([], fresh, "2025-01-06");
    expect(result).toEqual(fresh);
  });

  test("keeps old cached entries before the fetch window", () => {
    const cached: SimplifiedEntry[] = [
      { date: "2025-01-01", durationSeconds: 3600 },
      { date: "2025-01-02", durationSeconds: 3600 },
    ];
    const fresh: SimplifiedEntry[] = [
      { date: "2025-01-06", durationSeconds: 7200 },
    ];
    const result = mergeEntries(cached, fresh, "2025-01-06");
    expect(result).toEqual([
      { date: "2025-01-01", durationSeconds: 3600 },
      { date: "2025-01-02", durationSeconds: 3600 },
      { date: "2025-01-06", durationSeconds: 7200 },
    ]);
  });

  test("replaces cached entries within the fetch window with fresh data", () => {
    const cached: SimplifiedEntry[] = [
      { date: "2025-01-01", durationSeconds: 3600 },
      { date: "2025-01-06", durationSeconds: 1000 }, // stale
    ];
    const fresh: SimplifiedEntry[] = [
      { date: "2025-01-06", durationSeconds: 7200 }, // updated
    ];
    const result = mergeEntries(cached, fresh, "2025-01-06");
    expect(result).toEqual([
      { date: "2025-01-01", durationSeconds: 3600 },
      { date: "2025-01-06", durationSeconds: 7200 },
    ]);
  });

  test("aggregates multiple fresh entries on the same date", () => {
    const fresh: SimplifiedEntry[] = [
      { date: "2025-01-06", durationSeconds: 3600 },
      { date: "2025-01-06", durationSeconds: 1800 },
    ];
    const result = mergeEntries([], fresh, "2025-01-06");
    expect(result).toEqual([{ date: "2025-01-06", durationSeconds: 5400 }]);
  });

  test("returns sorted results", () => {
    const cached: SimplifiedEntry[] = [
      { date: "2025-01-10", durationSeconds: 100 },
    ];
    const fresh: SimplifiedEntry[] = [
      { date: "2025-01-15", durationSeconds: 200 },
      { date: "2025-01-12", durationSeconds: 300 },
    ];
    const result = mergeEntries(cached, fresh, "2025-01-11");
    const dates = result.map((e) => e.date);
    expect(dates).toEqual(["2025-01-10", "2025-01-12", "2025-01-15"]);
  });
});

describe("calculateFetchRange", () => {
  const yearStart = new Date(2025, 0, 1);
  const endDate = new Date(2025, 5, 15); // June 15

  test("returns full fetch from year start when cache is empty", () => {
    const cache = { version: 1, lastUpdated: "", entries: [] };
    const result = calculateFetchRange(cache, yearStart, endDate);
    expect(result.startDate).toEqual(yearStart);
    expect(result.endDate).toEqual(endDate);
    expect(result.needsFullFetch).toBe(true);
  });

  test("returns partial fetch when cache has entries", () => {
    const cache = {
      version: 1,
      lastUpdated: "2025-06-01",
      entries: [{ date: "2025-06-01", durationSeconds: 3600 }],
    };
    const result = calculateFetchRange(cache, yearStart, endDate);
    expect(result.needsFullFetch).toBe(false);
    // Start should be ~60 days before endDate
    expect(result.startDate < endDate).toBe(true);
    expect(result.startDate > yearStart).toBe(true);
  });

  test("does not go before year start on partial fetch", () => {
    const earlyEnd = new Date(2025, 0, 15); // Jan 15 — 60 days back would be before Jan 1
    const cache = {
      version: 1,
      lastUpdated: "2025-01-10",
      entries: [{ date: "2025-01-10", durationSeconds: 3600 }],
    };
    const result = calculateFetchRange(cache, yearStart, earlyEnd);
    expect(result.startDate).toEqual(yearStart);
    expect(result.needsFullFetch).toBe(false);
  });
});
