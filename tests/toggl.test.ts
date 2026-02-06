import { test, expect, describe } from "bun:test";
import { simplifyEntries } from "../src/toggl";
import type { TimeEntry } from "../src/toggl";

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 1,
    start: "2025-01-06T09:00:00+00:00",
    stop: "2025-01-06T10:00:00+00:00",
    duration: 3600,
    description: "Work",
    project_id: 123,
    ...overrides,
  };
}

describe("simplifyEntries", () => {
  test("converts time entries to simplified format", () => {
    const entries = [makeEntry({ duration: 3600 })];
    const result = simplifyEntries(entries);
    expect(result).toEqual([
      { date: "2025-01-06", durationSeconds: 3600 },
    ]);
  });

  test("filters out running entries (negative duration)", () => {
    const entries = [
      makeEntry({ duration: 3600 }),
      makeEntry({ id: 2, duration: -1, start: "2025-01-06T11:00:00+00:00" }),
    ];
    const result = simplifyEntries(entries);
    expect(result).toHaveLength(1);
    expect(result[0].durationSeconds).toBe(3600);
  });

  test("extracts date from start timestamp", () => {
    const entries = [
      makeEntry({ start: "2025-03-15T14:30:00+00:00", duration: 1800 }),
    ];
    const result = simplifyEntries(entries);
    expect(result[0].date).toBe("2025-03-15");
  });

  test("returns empty array for empty input", () => {
    expect(simplifyEntries([])).toEqual([]);
  });

  test("returns empty array when all entries are running", () => {
    const entries = [
      makeEntry({ duration: -1 }),
      makeEntry({ id: 2, duration: -100 }),
    ];
    expect(simplifyEntries(entries)).toEqual([]);
  });

  test("handles multiple entries", () => {
    const entries = [
      makeEntry({ id: 1, start: "2025-01-06T09:00:00+00:00", duration: 3600 }),
      makeEntry({ id: 2, start: "2025-01-07T10:00:00+00:00", duration: 7200 }),
      makeEntry({ id: 3, start: "2025-01-07T14:00:00+00:00", duration: 1800 }),
    ];
    const result = simplifyEntries(entries);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ date: "2025-01-06", durationSeconds: 3600 });
    expect(result[1]).toEqual({ date: "2025-01-07", durationSeconds: 7200 });
    expect(result[2]).toEqual({ date: "2025-01-07", durationSeconds: 1800 });
  });
});
