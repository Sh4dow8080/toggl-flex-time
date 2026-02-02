#!/usr/bin/env bun
/**
 * Toggl Flex Time Calculator
 *
 * Calculates flex time from Toggl Track time entries.
 * Compares actual hours worked against required hours
 * (accounting for weekends and Danish public holidays).
 *
 * Usage:
 *   bun run flex          - Show total flex balance
 *   bun run flex --weekly - Show per-week breakdown
 *   bun run flex --json   - Output results as JSON
 *   bun run flex --web    - Open web dashboard in browser
 */

import { loadConfig } from "./config";
import { getAllHolidays } from "./holidays";
import { getTimeEntries } from "./toggl";
import { calculateFlexTime } from "./calculator";
import { renderTrendChart } from "./trend";
import {
  loadCache,
  saveCache,
  mergeEntries,
  calculateFetchRange,
  formatDateForCache,
} from "./cache";
import {
  formatDate,
  getWeekRanges,
  buildWeeklyJson,
  buildTrendJson,
  type WeekData,
  type JsonSummaryOutput,
} from "./weeks";
import { VERSION } from "./version";
import { checkForUpdate, performUpdate, cleanupOldBinary } from "./updater";

// ANSI color codes
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

function formatHours(hours: number): string {
  const sign = hours >= 0 ? "+" : "";
  return `${sign}${hours.toFixed(2)}h`;
}

function formatHoursReadable(hours: number): string {
  const isNegative = hours < 0;
  const absHours = Math.abs(hours);
  const wholeHours = Math.floor(absHours);
  const minutes = Math.round((absHours - wholeHours) * 60);

  const parts: string[] = [];

  if (wholeHours > 0) {
    parts.push(`${wholeHours} ${wholeHours === 1 ? "hour" : "hours"}`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
  }

  if (parts.length === 0) {
    return "0 minutes";
  }

  const timeStr = parts.join(" ");
  return isNegative ? `-${timeStr}` : timeStr;
}

function coloredHours(hours: number): string {
  const formatted = formatHours(hours);
  if (hours > 0) {
    return `${colors.green}${formatted}${colors.reset}`;
  } else if (hours < 0) {
    return `${colors.red}${formatted}${colors.reset}`;
  }
  return formatted;
}


function displayWeeklyBreakdown(
  weeks: WeekData[],
  hoursPerDay: number,
  holidays: string[]
) {
  console.log(`${colors.bold}Weekly Breakdown:${colors.reset}\n`);

  // Header
  console.log(
    `${colors.dim}Week    Period                   Required   Worked    Flex${colors.reset}`
  );
  console.log(`${colors.dim}${"─".repeat(65)}${colors.reset}`);

  let runningFlex = 0;

  for (const week of weeks) {
    const result = calculateFlexTime(
      week.startDate,
      week.endDate,
      week.entries,
      hoursPerDay,
      holidays
    );

    runningFlex += result.flexBalance;

    const weekLabel = `W${week.weekNumber.toString().padStart(2, "0")}`;
    const period = `${formatDate(week.startDate)} - ${formatDate(week.endDate)}`;
    const required = `${result.requiredHours.toFixed(1)}h`.padStart(7);
    const worked = `${result.actualHours.toFixed(1)}h`.padStart(7);
    const flex = coloredHours(result.flexBalance).padStart(18); // Account for ANSI codes

    // Highlight weeks with negative flex
    const rowColor = result.flexBalance < -1 ? colors.red : "";
    const rowReset = result.flexBalance < -1 ? colors.reset : "";

    console.log(
      `${rowColor}${weekLabel}     ${period}    ${required}   ${worked}   ${flex}${rowReset}`
    );
  }

  console.log(`${colors.dim}${"─".repeat(65)}${colors.reset}`);
  console.log(
    `${colors.bold}Total${colors.reset}                                                   ${coloredHours(runningFlex)}`
  );
}

function parseTrendArg(): { show: boolean; granularity: "weekly" | "monthly" } {
  const trendIndex = process.argv.findIndex(arg => arg === "--trend" || arg === "-t");
  if (trendIndex === -1) {
    return { show: false, granularity: "weekly" };
  }

  // Check if next arg is "monthly" or "weekly"
  const nextArg = process.argv[trendIndex + 1];
  if (nextArg === "monthly") {
    return { show: true, granularity: "monthly" };
  }
  return { show: true, granularity: "weekly" };
}


async function main() {
  const showWeekly = process.argv.includes("--weekly") || process.argv.includes("-w");
  const showJson = process.argv.includes("--json") || process.argv.includes("-j");
  const showWeb = process.argv.includes("--web");
  const includeToday = process.argv.includes("--include-today");
  const trendArg = parseTrendArg();

  try {
    if (!showJson) {
      console.log(
        `${colors.bold}${colors.cyan}Toggl Flex Time Calculator${colors.reset}\n`
      );
    }

    // Load configuration
    const config = loadConfig();

    // Calculate date range: January 1st of current year to end date
    // By default, exclude today to show balance at start of day
    const now = new Date();
    const endDate = new Date(now);
    if (includeToday || showWeb) {
      // For --web, always fetch up to today so the toggle can work
      endDate.setHours(23, 59, 59, 999); // End of today
    } else {
      // Yesterday end of day
      endDate.setDate(endDate.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
    }

    const startOfYear = new Date(now.getFullYear(), 0, 1);
    startOfYear.setHours(0, 0, 0, 0);

    if (!showJson) {
      console.log(`Period: ${formatDate(startOfYear)} to ${formatDate(endDate)}${includeToday ? "" : " (excluding today)"}`);
      console.log(
        `Expected: ${config.hoursPerDay}h/day, ${config.hoursPerWeek}h/week\n`
      );
    }

    // Get holidays for all years in the range (usually just current year)
    const years = new Set<number>();
    for (let y = startOfYear.getFullYear(); y <= endDate.getFullYear(); y++) {
      years.add(y);
    }

    let allHolidays: string[] = [];
    for (const year of years) {
      const yearHolidays = getAllHolidays(year, config.customHolidays);
      allHolidays = [...allHolidays, ...yearHolidays];
    }

    // Load cache and determine fetch strategy
    const cache = loadCache();
    const hasCache = cache.entries.length > 0;
    const { startDate: fetchStart, endDate: fetchEnd, needsFullFetch } = calculateFetchRange(
      cache,
      startOfYear,
      endDate
    );

    // Fetch time entries from Toggl (only recent data if we have cache)
    if (!showJson) {
      if (needsFullFetch) {
        console.log("First run: Fetching time entries from Toggl...");
      } else {
        console.log(`Fetching recent entries (${formatDate(fetchStart)} onwards)...`);
      }
    }

    const freshEntries = await getTimeEntries(
      config.togglApiToken,
      fetchStart,
      fetchEnd
    );

    // Merge with cache and save
    const allEntries = mergeEntries(
      cache.entries,
      freshEntries,
      formatDateForCache(fetchStart)
    );

    // Update cache
    const updatedCache = {
      version: 1 as const,
      lastUpdated: new Date().toISOString(),
      entries: allEntries,
    };
    saveCache(updatedCache);

    // Filter entries to requested date range
    const startStr = formatDate(startOfYear);
    const endStr = formatDate(endDate);
    const entries = allEntries.filter(
      (e) => e.date >= startStr && e.date <= endStr
    );

    if (!showJson) {
      if (!hasCache) {
        console.log(`Fetched ${freshEntries.length} time entries and created cache.`);
      } else {
        console.log(`Fetched ${freshEntries.length} recent entries, ${allEntries.length} total in cache.`);
      }
      console.log("");
    }

    if (showWeb) {
      const { startWebDashboard } = await import("./web");
      await startWebDashboard({
        startDate: startOfYear,
        allEntries,
        hoursPerDay: config.hoursPerDay,
        hoursPerWeek: config.hoursPerWeek,
        holidays: allHolidays,
        includeToday,
      });
      return;
    }

    if (trendArg.show) {
      // Trend chart view
      const weeks = getWeekRanges(startOfYear, endDate, entries);
      if (showJson) {
        const jsonOutput = buildTrendJson(weeks, config.hoursPerDay, allHolidays, trendArg.granularity);
        console.log(JSON.stringify(jsonOutput, null, 2));
      } else {
        console.log(renderTrendChart(weeks, config.hoursPerDay, allHolidays, trendArg.granularity));
      }
    } else if (showWeekly) {
      // Weekly breakdown view
      const weeks = getWeekRanges(startOfYear, endDate, entries);
      if (showJson) {
        const jsonOutput = buildWeeklyJson(weeks, config.hoursPerDay, allHolidays);
        console.log(JSON.stringify(jsonOutput, null, 2));
      } else {
        displayWeeklyBreakdown(weeks, config.hoursPerDay, allHolidays);
      }
    } else {
      // Summary view
      const result = calculateFlexTime(
        startOfYear,
        endDate,
        entries,
        config.hoursPerDay,
        allHolidays
      );

      if (showJson) {
        const jsonOutput: JsonSummaryOutput = {
          period: {
            start: formatDate(startOfYear),
            end: formatDate(endDate),
          },
          workdays: result.workdays,
          requiredHours: Math.round(result.requiredHours * 100) / 100,
          actualHours: Math.round(result.actualHours * 100) / 100,
          flexBalance: Math.round(result.flexBalance * 100) / 100,
          config: {
            hoursPerDay: config.hoursPerDay,
            hoursPerWeek: config.hoursPerWeek,
          },
        };
        console.log(JSON.stringify(jsonOutput, null, 2));
      } else {
        console.log(`${colors.bold}Results:${colors.reset}`);
        console.log(`  Workdays:        ${result.workdays} days`);
        console.log(`  Required hours:  ${formatHoursReadable(result.requiredHours)}`);
        console.log(`  Worked hours:    ${formatHoursReadable(result.actualHours)}`);
        console.log(`  ${colors.bold}Flex balance:    ${coloredHours(result.flexBalance)}${colors.reset}`);

        console.log("");
        if (result.flexBalance > 0) {
          console.log(
            `${colors.green}You have ${formatHoursReadable(result.flexBalance)} of flex time saved up.${colors.reset}`
          );
        } else if (result.flexBalance < 0) {
          console.log(
            `${colors.red}You are ${formatHoursReadable(Math.abs(result.flexBalance))} behind schedule.${colors.reset}`
          );
        } else {
          console.log(`${colors.yellow}You are exactly on track!${colors.reset}`);
        }

        console.log(`\n${colors.dim}Tip: Run with --weekly to see per-week breakdown${colors.reset}`);
      }
    }
  } catch (error) {
    if (showJson) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      console.log(JSON.stringify({ error: errorMessage }, null, 2));
    } else {
      if (error instanceof Error) {
        console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      } else {
        console.error(`${colors.red}An unexpected error occurred${colors.reset}`);
      }
    }
    process.exit(1);
  }
}

// Clean up leftover .old binary from previous update
cleanupOldBinary();

// Handle --version / -v
if (process.argv.includes("--version") || process.argv.includes("-v")) {
  console.log(`toggl-flex-time v${VERSION}`);
  process.exit(0);
}

// Handle --update
if (process.argv.includes("--update")) {
  performUpdate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(`${colors.red}Update failed: ${err instanceof Error ? err.message : err}${colors.reset}`);
      process.exit(1);
    });
} else {
  // Run main with a concurrent update check
  const updateCheck = checkForUpdate();
  main().then(async () => {
    const update = await updateCheck;
    if (update) {
      console.log(
        `\n${colors.yellow}Update available: v${VERSION} → v${update.version}. Run with --update to install.${colors.reset}`
      );
    }
  });
}
