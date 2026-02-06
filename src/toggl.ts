/**
 * Toggl Track API v9 client for fetching time entries.
 */

export interface TimeEntry {
  id: number;
  start: string;
  stop: string | null;
  duration: number; // Duration in seconds (negative if running)
  description: string | null;
  project_id: number | null;
}

export interface SimplifiedEntry {
  date: string; // YYYY-MM-DD
  durationSeconds: number;
}

export const TOGGL_API_BASE = "https://api.track.toggl.com/api/v9";

/**
 * Create the Basic Auth header value for Toggl API.
 * Uses API token as username and "api_token" as password.
 */
export function createAuthHeader(apiToken: string): string {
  const credentials = `${apiToken}:api_token`;
  const encoded = Buffer.from(credentials).toString("base64");
  return `Basic ${encoded}`;
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
 * Fetch time entries from Toggl API for a date range.
 *
 * @param apiToken - Toggl API token
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Array of time entries
 */
export async function fetchTimeEntries(
  apiToken: string,
  startDate: Date,
  endDate: Date
): Promise<TimeEntry[]> {
  const url = new URL(`${TOGGL_API_BASE}/me/time_entries`);
  url.searchParams.set("start_date", formatDate(startDate));
  // Add one day to end_date because Toggl uses exclusive end date
  const endDatePlusOne = new Date(endDate);
  endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
  url.searchParams.set("end_date", formatDate(endDatePlusOne));

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: createAuthHeader(apiToken),
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error(
        "Authentication failed. Please check your Toggl API token."
      );
    }
    throw new Error(`Toggl API error: ${response.status} ${response.statusText}`);
  }

  const entries = (await response.json()) as TimeEntry[];
  return entries;
}

/**
 * Convert a UTC ISO timestamp to local date string (YYYY-MM-DD).
 * This ensures entries are attributed to the correct day in the user's timezone,
 * matching what Toggl's dashboard shows.
 */
function utcToLocalDate(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Convert raw time entries to simplified entries with date and duration.
 * Groups entries by date and filters out running entries (negative duration).
 */
export function simplifyEntries(entries: TimeEntry[]): SimplifiedEntry[] {
  return entries
    .filter((entry) => entry.duration >= 0) // Filter out running entries
    .map((entry) => ({
      date: utcToLocalDate(entry.start), // Convert to local timezone date
      durationSeconds: entry.duration,
    }));
}

/**
 * Fetch and simplify time entries from Toggl API.
 */
export async function getTimeEntries(
  apiToken: string,
  startDate: Date,
  endDate: Date
): Promise<SimplifiedEntry[]> {
  const rawEntries = await fetchTimeEntries(apiToken, startDate, endDate);
  return simplifyEntries(rawEntries);
}
