/**
 * Local cache for Toggl time entries.
 *
 * The Toggl API has a ~90-day limit on fetching historical data.
 * This cache stores entries locally to preserve data beyond that limit.
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { SimplifiedEntry } from "./toggl";
import { getDataDir } from "./paths";

export interface CacheData {
  version: 1;
  lastUpdated: string; // ISO timestamp
  entries: SimplifiedEntry[];
}

const CACHE_FILE = "cache.json";

// How many days to fetch from the API on each run
// (we overlap with cache to catch any edits to recent entries)
const FETCH_WINDOW_DAYS = 60;

/**
 * Get the path to the cache file (same directory as config.json).
 */
function getCachePath(): string {
  return join(getDataDir(), CACHE_FILE);
}

/**
 * Load cached entries from disk.
 * Returns empty cache if file doesn't exist or is invalid.
 */
export function loadCache(): CacheData {
  const cachePath = getCachePath();

  if (!existsSync(cachePath)) {
    return {
      version: 1,
      lastUpdated: new Date(0).toISOString(),
      entries: [],
    };
  }

  try {
    const content = readFileSync(cachePath, "utf-8");
    const data = JSON.parse(content) as CacheData;

    // Basic validation
    if (data.version !== 1 || !Array.isArray(data.entries)) {
      console.warn("Invalid cache format, starting fresh");
      return { version: 1, lastUpdated: new Date(0).toISOString(), entries: [] };
    }

    return data;
  } catch {
    console.warn("Failed to read cache, starting fresh");
    return { version: 1, lastUpdated: new Date(0).toISOString(), entries: [] };
  }
}

/**
 * Save cache to disk.
 */
export function saveCache(cache: CacheData): void {
  const cachePath = getCachePath();
  const content = JSON.stringify(cache, null, 2);
  writeFileSync(cachePath, content, "utf-8");
}

/**
 * Merge fresh entries from API with cached entries.
 * Fresh entries take precedence for overlapping dates.
 *
 * @param cached - Entries from cache
 * @param fresh - Entries freshly fetched from API
 * @param freshStartDate - Start date of the fresh fetch window
 * @returns Merged entries sorted by date
 */
export function mergeEntries(
  cached: SimplifiedEntry[],
  fresh: SimplifiedEntry[],
  freshStartDate: string
): SimplifiedEntry[] {
  // Keep cached entries that are older than our fetch window
  const oldCached = cached.filter((e) => e.date < freshStartDate);

  // Combine old cached with fresh, then aggregate by date
  const all = [...oldCached, ...fresh];

  // Group by date and sum durations
  const byDate = new Map<string, number>();
  for (const entry of all) {
    const current = byDate.get(entry.date) || 0;
    byDate.set(entry.date, current + entry.durationSeconds);
  }

  // Convert back to array and sort
  const merged: SimplifiedEntry[] = Array.from(byDate.entries())
    .map(([date, durationSeconds]) => ({ date, durationSeconds }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return merged;
}

/**
 * Calculate the date range for API fetch.
 * Returns { startDate, endDate, needsFullFetch }.
 *
 * - On first run (empty cache): fetch as far back as possible
 * - On subsequent runs: fetch last FETCH_WINDOW_DAYS
 */
export function calculateFetchRange(
  cache: CacheData,
  yearStart: Date,
  endDate: Date
): { startDate: Date; endDate: Date; needsFullFetch: boolean } {
  const hasCache = cache.entries.length > 0;

  if (!hasCache) {
    // First run: fetch everything from year start
    // (API will limit us to ~90 days anyway)
    return { startDate: yearStart, endDate, needsFullFetch: true };
  }

  // Subsequent runs: fetch last FETCH_WINDOW_DAYS
  const fetchStart = new Date(endDate);
  fetchStart.setDate(fetchStart.getDate() - FETCH_WINDOW_DAYS);
  fetchStart.setHours(0, 0, 0, 0);

  // Don't go before year start
  const effectiveStart = fetchStart < yearStart ? yearStart : fetchStart;

  return { startDate: effectiveStart, endDate, needsFullFetch: false };
}

/**
 * Format a Date as YYYY-MM-DD string.
 */
export function formatDateForCache(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
