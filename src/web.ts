/**
 * Web dashboard server for Toggl Flex Time.
 * Serves a dark-themed single-page dashboard with charts.
 */

import { calculateFlexTime } from "./calculator";
import { buildDailyData, type DailyData } from "./daily";
import {
  formatDate,
  getWeekRanges,
  buildWeeklyJson,
  buildTrendJson,
  type JsonSummaryOutput,
  type JsonWeekOutput,
  type JsonTrendOutput,
} from "./weeks";
import type { SimplifiedEntry } from "./toggl";
import { DASHBOARD_HTML } from "./generated/dashboard-html";

export interface WebDashboardParams {
  startDate: Date;
  allEntries: SimplifiedEntry[];
  hoursPerDay: number;
  hoursPerWeek: number;
  holidays: string[];
  includeToday: boolean;
}

interface DashboardData {
  summary: JsonSummaryOutput;
  weekly: JsonWeekOutput[];
  daily: DailyData[];
  trend: JsonTrendOutput;
  monthlyTrend: JsonTrendOutput;
}

function computeEndDate(includeToday: boolean): Date {
  const now = new Date();
  const endDate = new Date(now);
  if (includeToday) {
    endDate.setHours(23, 59, 59, 999);
  } else {
    endDate.setDate(endDate.getDate() - 1);
    endDate.setHours(23, 59, 59, 999);
  }
  return endDate;
}

function buildDashboardData(params: WebDashboardParams, includeToday: boolean): DashboardData {
  const { startDate, allEntries, hoursPerDay, hoursPerWeek, holidays } = params;

  const endDate = computeEndDate(includeToday);
  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);
  const entries = allEntries.filter(e => e.date >= startStr && e.date <= endStr);

  const weeks = getWeekRanges(startDate, endDate, entries);
  const result = calculateFlexTime(startDate, endDate, entries, hoursPerDay, holidays);

  const summary: JsonSummaryOutput = {
    period: { start: formatDate(startDate), end: formatDate(endDate) },
    workdays: result.workdays,
    requiredHours: Math.round(result.requiredHours * 100) / 100,
    actualHours: Math.round(result.actualHours * 100) / 100,
    flexBalance: Math.round(result.flexBalance * 100) / 100,
    config: { hoursPerDay, hoursPerWeek },
  };

  const weekly = buildWeeklyJson(weeks, hoursPerDay, holidays);
  const daily = buildDailyData(startDate, endDate, entries, hoursPerDay, holidays);
  const trend = buildTrendJson(weeks, hoursPerDay, holidays, "weekly");
  const monthlyTrend = buildTrendJson(weeks, hoursPerDay, holidays, "monthly");

  return { summary, weekly, daily, trend, monthlyTrend };
}

function getConfiguredHtml(includeToday: boolean): string {
  const configScript = `<script>window.__CONFIG__=${JSON.stringify({ includeToday })}</script>`;
  return DASHBOARD_HTML.replace("</head>", configScript + "</head>");
}

async function findAvailablePort(startPort: number): Promise<number> {
  let port = startPort;
  while (port < startPort + 100) {
    try {
      const server = Bun.serve({ port, fetch() { return new Response(); } });
      server.stop(true);
      return port;
    } catch {
      port++;
    }
  }
  throw new Error(`No available port found in range ${startPort}-${startPort + 99}`);
}

export async function startWebDashboard(params: WebDashboardParams): Promise<void> {
  const html = getConfiguredHtml(params.includeToday);

  const port = await findAvailablePort(3000);
  let lastPing = Date.now();

  const server = Bun.serve({
    port,
    fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === "/ping") {
        lastPing = Date.now();
        return new Response("pong");
      }
      if (url.pathname === "/api/data") {
        const includeToday = url.searchParams.get("includeToday") === "true";
        const data = buildDashboardData(params, includeToday);
        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json" },
        });
      }
      // Serve dashboard for all other routes
      lastPing = Date.now();
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    },
  });

  // Shut down when no heartbeat received for 5 seconds (tab closed)
  const heartbeatCheck = setInterval(() => {
    if (Date.now() - lastPing > 5000) {
      clearInterval(heartbeatCheck);
      server.stop();
      console.log("Browser tab closed. Shutting down.");
      process.exit(0);
    }
  }, 1000);

  const dashboardUrl = `http://localhost:${port}`;
  console.log(`\nDashboard running at ${dashboardUrl}`);
  console.log("Press Ctrl+C to stop.\n");

  // Open browser
  const platform = process.platform;
  if (platform === "darwin") {
    Bun.spawn(["open", dashboardUrl]);
  } else if (platform === "linux") {
    Bun.spawn(["xdg-open", dashboardUrl]);
  } else if (platform === "win32") {
    Bun.spawn(["cmd", "/c", "start", dashboardUrl]);
  }
}
