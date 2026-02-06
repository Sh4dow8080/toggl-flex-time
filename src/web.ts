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

function getDashboardHtml(defaultIncludeToday: boolean): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Flex Time Dashboard</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg-deep: #0a0a0f;
    --bg-surface: #12121a;
    --bg-card: #1a1a25;
    --bg-card-hover: #22222f;
    --border: #2a2a3a;
    --border-subtle: #1e1e2e;
    --text-primary: #e8e8f0;
    --text-secondary: #8888a0;
    --text-muted: #555570;
    --accent-green: #22c55e;
    --accent-green-dim: #16a34a;
    --accent-green-glow: rgba(34, 197, 94, 0.3);
    --accent-red: #ef4444;
    --accent-red-dim: #dc2626;
    --accent-red-glow: rgba(239, 68, 68, 0.3);
    --accent-blue: #3b82f6;
    --accent-amber: #f59e0b;
    --accent-purple: #8b5cf6;
    --mono: 'SF Mono', 'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
    --sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    --radius: 10px;
    --radius-sm: 6px;
  }

  body {
    font-family: var(--sans);
    background: var(--bg-deep);
    color: var(--text-primary);
    min-height: 100vh;
    line-height: 1.5;
  }

  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background:
      radial-gradient(ellipse at 20% 0%, rgba(34, 197, 94, 0.03) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 100%, rgba(59, 130, 246, 0.03) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 24px 64px;
    position: relative;
    z-index: 1;
  }

  /* Header */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 40px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .header-brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .header-brand svg { opacity: 0.6; }
  .header-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .header-period {
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text-muted);
  }

  /* Hero */
  .hero {
    text-align: center;
    padding: 48px 0 40px;
    position: relative;
  }
  .hero-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 12px;
  }
  .hero-balance {
    font-family: var(--mono);
    font-size: clamp(56px, 10vw, 88px);
    font-weight: 700;
    line-height: 1;
    margin-bottom: 16px;
    transition: color 0.5s;
  }
  .hero-balance.positive {
    color: var(--accent-green);
    text-shadow: 0 0 60px var(--accent-green-glow), 0 0 120px rgba(34, 197, 94, 0.1);
  }
  .hero-balance.negative {
    color: var(--accent-red);
    text-shadow: 0 0 60px var(--accent-red-glow), 0 0 120px rgba(239, 68, 68, 0.1);
  }
  .hero-balance.zero { color: var(--text-secondary); }
  .hero-sub {
    font-size: 14px;
    color: var(--text-secondary);
  }
  .hero-sub span {
    font-family: var(--mono);
    color: var(--text-muted);
    font-size: 12px;
  }
  .hero-config {
    margin-top: 8px;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text-muted);
  }

  /* Stats grid */
  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 40px;
  }
  @media (max-width: 700px) {
    .stats { grid-template-columns: repeat(2, 1fr); }
  }
  .stat-card {
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    padding: 20px;
    transition: background 0.2s, border-color 0.2s;
  }
  .stat-card:hover {
    background: var(--bg-card-hover);
    border-color: var(--border);
  }
  .stat-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 8px;
  }
  .stat-value {
    font-family: var(--mono);
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .stat-unit {
    font-size: 13px;
    font-weight: 400;
    color: var(--text-secondary);
    margin-left: 4px;
  }

  /* Tabs */
  .tabs {
    display: flex;
    gap: 2px;
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    padding: 4px;
    margin-bottom: 24px;
    width: fit-content;
  }
  .tab {
    padding: 8px 20px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-muted);
    cursor: pointer;
    border-radius: var(--radius-sm);
    border: none;
    background: none;
    transition: all 0.2s;
    font-family: var(--sans);
  }
  .tab:hover { color: var(--text-secondary); }
  .tab.active {
    background: var(--bg-surface);
    color: var(--text-primary);
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }

  /* Panels */
  .panel { display: none; }
  .panel.active {
    display: block;
    animation: panelIn 0.3s ease;
  }
  @keyframes panelIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Chart containers */
  .chart-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 24px;
  }
  @media (max-width: 800px) {
    .chart-row { grid-template-columns: 1fr; }
  }
  .chart-box {
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius);
    padding: 20px;
  }
  .chart-box.full { grid-column: 1 / -1; }
  .chart-title {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-secondary);
    margin-bottom: 16px;
  }
  .chart-wrap {
    position: relative;
    width: 100%;
  }
  .chart-wrap canvas {
    width: 100% !important;
  }

  /* Heatmap */
  .heatmap-container {
    overflow-x: auto;
    padding-bottom: 8px;
  }
  .heatmap-months {
    display: flex;
    padding-left: 36px;
    margin-bottom: 4px;
    gap: 0;
  }
  .heatmap-month-label {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--text-muted);
    text-align: left;
  }
  .heatmap-grid {
    display: flex;
    gap: 3px;
  }
  .heatmap-day-labels {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-right: 6px;
    padding-top: 0;
  }
  .heatmap-day-label {
    font-family: var(--mono);
    font-size: 9px;
    color: var(--text-muted);
    height: 13px;
    line-height: 13px;
    width: 24px;
    text-align: right;
  }
  .heatmap-weeks {
    display: flex;
    gap: 3px;
  }
  .heatmap-week {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .heatmap-cell {
    width: 13px;
    height: 13px;
    border-radius: 2px;
    background: var(--bg-surface);
    position: relative;
  }
  .heatmap-cell[data-hours] { cursor: default; }
  .heatmap-cell.empty { background: transparent; }
  .heatmap-cell.level-0 { background: var(--bg-surface); }
  .heatmap-cell.under-1 { background: #4a2000; }
  .heatmap-cell.under-2 { background: #7a3400; }
  .heatmap-cell.near { background: #1a3a2a; }
  .heatmap-cell.met { background: #006d32; }
  .heatmap-cell.slight-over { background: #15803d; }
  .heatmap-cell.over-1 { background: #26a641; }
  .heatmap-cell.over-2 { background: #39d353; }
  .heatmap-cell.holiday { background: #2d1f00; border: 1px solid #4a3500; }
  .heatmap-cell.weekend { background: #1a1a25; }
  .heatmap-legend {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 12px;
    justify-content: flex-end;
  }
  .heatmap-legend-label {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--text-muted);
    margin: 0 4px;
  }
  .heatmap-legend .heatmap-cell { cursor: default; }

  /* Tooltip */
  .tooltip {
    display: none;
    position: fixed;
    background: #1e1e2e;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 8px 12px;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text-primary);
    pointer-events: none;
    z-index: 100;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    white-space: nowrap;
  }

  /* Monthly table */
  .monthly-table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--mono);
    font-size: 13px;
  }
  .monthly-table th {
    text-align: left;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-muted);
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .monthly-table th:not(:first-child) { text-align: right; }
  .monthly-table td {
    padding: 10px 12px;
    border-bottom: 1px solid var(--border-subtle);
    color: var(--text-secondary);
  }
  .monthly-table td:not(:first-child) { text-align: right; }
  .monthly-table tr:hover td { background: var(--bg-card-hover); }
  .monthly-table .positive { color: var(--accent-green); }
  .monthly-table .negative { color: var(--accent-red); }

  /* Toggle */
  .toggle-row {
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: center;
    margin-top: 12px;
  }
  .toggle-label {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text-muted);
    cursor: pointer;
    user-select: none;
  }
  .toggle-track {
    position: relative;
    width: 36px;
    height: 20px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
    flex-shrink: 0;
  }
  .toggle-track.active {
    background: var(--accent-blue);
    border-color: var(--accent-blue);
  }
  .toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    background: var(--text-primary);
    border-radius: 50%;
    transition: transform 0.2s;
  }
  .toggle-track.active .toggle-thumb {
    transform: translateX(16px);
  }

  /* Loading */
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 60vh;
    flex-direction: column;
    gap: 16px;
  }
  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border);
    border-top-color: var(--accent-blue);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-text {
    font-size: 13px;
    color: var(--text-muted);
  }

  /* Entrance animations */
  .fade-up {
    opacity: 0;
    transform: translateY(16px);
    animation: fadeUp 0.5s ease forwards;
  }
  @keyframes fadeUp {
    to { opacity: 1; transform: translateY(0); }
  }
  .delay-1 { animation-delay: 0.05s; }
  .delay-2 { animation-delay: 0.1s; }
  .delay-3 { animation-delay: 0.15s; }
  .delay-4 { animation-delay: 0.2s; }
  .delay-5 { animation-delay: 0.25s; }
  .delay-6 { animation-delay: 0.3s; }
</style>
</head>
<body>

<div id="loading" class="loading">
  <div class="loading-spinner"></div>
  <div class="loading-text">Loading flex data...</div>
</div>

<div id="app" class="container" style="display:none">
  <div class="header fade-up">
    <div class="header-brand">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      <span class="header-title">Flex Time Dashboard</span>
    </div>
    <span class="header-period" id="period-label"></span>
  </div>

  <div class="hero fade-up delay-1">
    <div class="hero-label">Current Flex Balance</div>
    <div class="hero-balance" id="hero-balance"></div>
    <div class="hero-sub" id="hero-sub"></div>
    <div class="hero-config" id="hero-config"></div>
    <div class="toggle-row">
      <span class="toggle-label" id="toggle-label">Include today</span>
      <div class="toggle-track" id="toggle-today">
        <div class="toggle-thumb"></div>
      </div>
    </div>
  </div>

  <div class="stats fade-up delay-2">
    <div class="stat-card">
      <div class="stat-label">Workdays</div>
      <div class="stat-value" id="stat-workdays"></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Required</div>
      <div class="stat-value" id="stat-required"></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Worked</div>
      <div class="stat-value" id="stat-worked"></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Avg / Day</div>
      <div class="stat-value" id="stat-avg"></div>
    </div>
  </div>

  <div class="tabs fade-up delay-3">
    <button class="tab" data-tab="daily">Daily</button>
    <button class="tab active" data-tab="weekly">Weekly</button>
    <button class="tab" data-tab="monthly">Monthly</button>
  </div>

  <div id="panel-daily" class="panel">
    <div class="chart-box full fade-up delay-4" style="margin-bottom:16px">
      <div class="chart-title">Activity Heatmap</div>
      <div class="heatmap-container" id="heatmap"></div>
    </div>
    <div class="chart-box full fade-up delay-5">
      <div class="chart-title">Last 30 Days &mdash; Actual vs Required</div>
      <div class="chart-wrap"><canvas id="chart-daily"></canvas></div>
    </div>
  </div>

  <div id="panel-weekly" class="panel active">
    <div class="chart-row fade-up delay-4">
      <div class="chart-box">
        <div class="chart-title">Hours per Week</div>
        <div class="chart-wrap"><canvas id="chart-weekly-bars"></canvas></div>
      </div>
      <div class="chart-box">
        <div class="chart-title">Cumulative Flex Balance</div>
        <div class="chart-wrap"><canvas id="chart-weekly-line"></canvas></div>
      </div>
    </div>
  </div>

  <div id="panel-monthly" class="panel">
    <div class="chart-row fade-up delay-4">
      <div class="chart-box">
        <div class="chart-title">Hours per Month</div>
        <div class="chart-wrap"><canvas id="chart-monthly-bars"></canvas></div>
      </div>
      <div class="chart-box">
        <div class="chart-title">Cumulative Flex Balance</div>
        <div class="chart-wrap"><canvas id="chart-monthly-line"></canvas></div>
      </div>
    </div>
    <div class="chart-box full fade-up delay-5">
      <div class="chart-title">Monthly Summary</div>
      <table class="monthly-table" id="monthly-table">
        <thead>
          <tr><th>Month</th><th>Delta</th><th>Cumulative</th></tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  </div>
</div>

<div class="tooltip" id="tooltip"></div>

<script>
let includeToday = ${defaultIncludeToday};

(async () => {
  await loadData();
})();

async function loadData() {
  const res = await fetch('/api/data?includeToday=' + includeToday);
  const data = await res.json();
  document.getElementById('loading').style.display = 'none';
  document.getElementById('app').style.display = '';
  render(data);
}

// Chart.js defaults
Chart.defaults.color = '#8888a0';
Chart.defaults.borderColor = '#1e1e2e';
Chart.defaults.font.family = "'SF Mono', 'Cascadia Code', 'Fira Code', monospace";
Chart.defaults.font.size = 11;
Chart.defaults.plugins.legend.display = false;
Chart.defaults.plugins.tooltip.backgroundColor = '#1e1e2e';
Chart.defaults.plugins.tooltip.borderColor = '#2a2a3a';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.cornerRadius = 6;
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.titleFont = { family: "'SF Mono', monospace", size: 11, weight: '600' };
Chart.defaults.plugins.tooltip.bodyFont = { family: "'SF Mono', monospace", size: 11 };
Chart.defaults.scale.grid = { color: '#1e1e2e', lineWidth: 1 };

const chartInstances = {};

function destroyCharts() {
  for (const key of Object.keys(chartInstances)) {
    if (chartInstances[key]) { chartInstances[key].destroy(); delete chartInstances[key]; }
  }
}

function render(data) {
  destroyCharts();
  // Clear dynamic DOM
  document.getElementById('heatmap').innerHTML = '';
  document.querySelector('#monthly-table tbody').innerHTML = '';

  renderHero(data.summary);
  renderStats(data.summary);
  renderHeatmap(data.daily);
  renderDailyChart(data.daily);
  renderWeeklyCharts(data.weekly);
  renderMonthlyCharts(data.monthlyTrend, data.weekly);
  setupTabs();
  setupToggle();
}

function renderHero(s) {
  const el = document.getElementById('hero-balance');
  const sign = s.flexBalance >= 0 ? '+' : '';
  const hours = Math.floor(Math.abs(s.flexBalance));
  const mins = Math.round((Math.abs(s.flexBalance) - hours) * 60);
  let display = sign;
  if (hours > 0) display += hours + 'h ';
  display += mins + 'm';
  if (s.flexBalance === 0) display = '0h 0m';
  el.textContent = display;
  el.className = 'hero-balance ' + (s.flexBalance > 0 ? 'positive' : s.flexBalance < 0 ? 'negative' : 'zero');
  document.getElementById('hero-sub').innerHTML =
    (s.flexBalance >= 0 ? 'ahead of schedule' : 'behind schedule') +
    ' &nbsp;<span>' + s.period.start + ' &rarr; ' + s.period.end + '</span>';
  document.getElementById('hero-config').textContent =
    s.config.hoursPerDay + 'h/day \\u00B7 ' + s.config.hoursPerWeek + 'h/week';
  document.getElementById('period-label').textContent =
    s.period.start + ' \\u2192 ' + s.period.end;
}

function renderStats(s) {
  document.getElementById('stat-workdays').innerHTML = s.workdays + '<span class="stat-unit">days</span>';
  document.getElementById('stat-required').innerHTML = s.requiredHours.toFixed(1) + '<span class="stat-unit">hrs</span>';
  document.getElementById('stat-worked').innerHTML = s.actualHours.toFixed(1) + '<span class="stat-unit">hrs</span>';
  const avg = s.workdays > 0 ? (s.actualHours / s.workdays) : 0;
  document.getElementById('stat-avg').innerHTML = avg.toFixed(2) + '<span class="stat-unit">hrs</span>';
}

function renderHeatmap(daily) {
  const container = document.getElementById('heatmap');
  const tooltip = document.getElementById('tooltip');

  // Build weeks array (Mon-based)
  // Find the Monday on or before the first date
  const firstDate = new Date(daily[0].date + 'T00:00:00');
  const dayOfWeek = firstDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startMonday = new Date(firstDate);
  startMonday.setDate(startMonday.getDate() + mondayOffset);

  const dailyMap = {};
  for (const d of daily) dailyMap[d.date] = d;

  // Required hours for scaling (from first workday)
  const reqH = daily.find(d => d.requiredHours > 0)?.requiredHours || 7;

  // Local date formatter (avoids toISOString UTC shift)
  function fmtDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  // Build week columns
  const weeks = [];
  let cur = new Date(startMonday);
  while (true) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const ds = fmtDate(cur);
      week.push({ date: ds, data: dailyMap[ds] || null });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
    if (cur > new Date(daily[daily.length - 1].date + 'T23:59:59')) break;
  }

  // Month labels — position each label to span its weeks
  const monthsDiv = document.createElement('div');
  monthsDiv.className = 'heatmap-months';
  let lastMonth = -1;
  const colWidth = 16; // 13px cell + 3px gap
  const monthStarts = [];
  for (let wi = 0; wi < weeks.length; wi++) {
    const thu = weeks[wi][3];
    if (thu && thu.data) {
      const m = new Date(thu.date + 'T00:00:00').getMonth();
      if (m !== lastMonth) {
        monthStarts.push({ month: m, weekIndex: wi });
        lastMonth = m;
      }
    }
  }
  for (let i = 0; i < monthStarts.length; i++) {
    const ms = monthStarts[i];
    const nextStart = i + 1 < monthStarts.length ? monthStarts[i + 1].weekIndex : weeks.length;
    if (i === 0 && ms.weekIndex > 0) {
      const spacer = document.createElement('div');
      spacer.style.width = (ms.weekIndex * colWidth) + 'px';
      spacer.style.flexShrink = '0';
      monthsDiv.appendChild(spacer);
    }
    const label = document.createElement('div');
    label.className = 'heatmap-month-label';
    label.textContent = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][ms.month];
    label.style.width = ((nextStart - ms.weekIndex) * colWidth) + 'px';
    label.style.flexShrink = '0';
    monthsDiv.appendChild(label);
  }

  const gridDiv = document.createElement('div');
  gridDiv.className = 'heatmap-grid';

  // Day labels (Mon-Sun, show Mon/Wed/Fri)
  const dayLabels = document.createElement('div');
  dayLabels.className = 'heatmap-day-labels';
  const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  for (let i = 0; i < 7; i++) {
    const lbl = document.createElement('div');
    lbl.className = 'heatmap-day-label';
    lbl.textContent = (i % 2 === 0) ? dayNames[i] : '';
    dayLabels.appendChild(lbl);
  }
  gridDiv.appendChild(dayLabels);

  // Week columns
  const weeksDiv = document.createElement('div');
  weeksDiv.className = 'heatmap-weeks';
  for (const week of weeks) {
    const col = document.createElement('div');
    col.className = 'heatmap-week';
    for (const day of week) {
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      if (!day.data) {
        cell.classList.add('empty');
      } else if (day.data.isWeekend && day.data.actualHours === 0) {
        cell.classList.add('weekend');
      } else if (day.data.isHoliday && day.data.actualHours === 0) {
        cell.classList.add('holiday');
      } else {
        const actual = day.data.actualHours;
        const required = day.data.requiredHours || reqH;
        if (actual === 0) cell.classList.add('level-0');
        else if (actual < required * 0.75) cell.classList.add('under-1');
        else if (actual < required * 0.93) cell.classList.add('under-2');
        else if (actual < required) cell.classList.add('near');
        else if (actual < required * 1.07) cell.classList.add('met');
        else if (actual < required * 1.15) cell.classList.add('slight-over');
        else if (actual < required * 1.3) cell.classList.add('over-1');
        else cell.classList.add('over-2');
      }
      if (day.data) {
        cell.setAttribute('data-hours', day.data.actualHours.toFixed(1));
        cell.addEventListener('mouseenter', (e) => {
          const d = day.data;
          let info = d.date + '\\n' + d.actualHours.toFixed(1) + 'h worked';
          if (d.isHoliday) info += ' (holiday)';
          else if (d.isWeekend) info += ' (weekend)';
          else info += ' / ' + d.requiredHours.toFixed(1) + 'h required';
          tooltip.textContent = info;
          tooltip.style.display = 'block';
          const r = e.target.getBoundingClientRect();
          tooltip.style.left = (r.left + r.width/2) + 'px';
          tooltip.style.top = (r.top - 40) + 'px';
          tooltip.style.transform = 'translateX(-50%)';
        });
        cell.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
      }
      col.appendChild(cell);
    }
    weeksDiv.appendChild(col);
  }
  gridDiv.appendChild(weeksDiv);

  // Legend
  const legend = document.createElement('div');
  legend.className = 'heatmap-legend';
  legend.innerHTML =
    '<span class="heatmap-legend-label">Under</span>' +
    '<div class="heatmap-cell under-1"></div>' +
    '<div class="heatmap-cell under-2"></div>' +
    '<div class="heatmap-cell near"></div>' +
    '<div class="heatmap-cell met"></div>' +
    '<div class="heatmap-cell slight-over"></div>' +
    '<div class="heatmap-cell over-1"></div>' +
    '<div class="heatmap-cell over-2"></div>' +
    '<span class="heatmap-legend-label">Over</span>';

  container.appendChild(monthsDiv);
  container.appendChild(gridDiv);
  container.appendChild(legend);
}

function renderDailyChart(daily) {
  const last30 = daily.slice(-30);
  const ctx = document.getElementById('chart-daily');
  chartInstances.daily = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: last30.map(d => {
        const dt = new Date(d.date + 'T00:00:00');
        return dt.getDate() + '/' + (dt.getMonth()+1);
      }),
      datasets: [
        {
          label: 'Actual',
          data: last30.map(d => Math.round(d.actualHours * 100) / 100),
          backgroundColor: last30.map(d => d.isWeekend || d.isHoliday ? '#8b5cf640' : '#3b82f680'),
          borderRadius: 3,
          barPercentage: 0.7,
        },
        {
          label: 'Required',
          data: last30.map(d => d.requiredHours),
          backgroundColor: '#ffffff10',
          borderColor: '#ffffff20',
          borderWidth: 1,
          borderRadius: 3,
          barPercentage: 0.7,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 3,
      plugins: {
        legend: { display: true, position: 'top', align: 'end',
          labels: { boxWidth: 12, boxHeight: 12, borderRadius: 2, useBorderRadius: true, padding: 16 }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(1) + 'h'
          }
        }
      },
      scales: {
        x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 15 } },
        y: { beginAtZero: true, ticks: { callback: v => v + 'h' } }
      }
    }
  });
}

function renderWeeklyCharts(weekly) {
  const labels = weekly.map(w => 'W' + w.weekNumber);

  // Grouped bar chart
  const ctxBar = document.getElementById('chart-weekly-bars');
  chartInstances.weeklyBars = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Actual',
          data: weekly.map(w => w.actualHours),
          backgroundColor: '#3b82f680',
          borderRadius: 3,
          barPercentage: 0.7,
        },
        {
          label: 'Required',
          data: weekly.map(w => w.requiredHours),
          backgroundColor: '#ffffff10',
          borderColor: '#ffffff20',
          borderWidth: 1,
          borderRadius: 3,
          barPercentage: 0.7,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.6,
      plugins: {
        legend: { display: true, position: 'top', align: 'end',
          labels: { boxWidth: 12, boxHeight: 12, borderRadius: 2, useBorderRadius: true, padding: 16 }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(1) + 'h'
          }
        }
      },
      scales: {
        x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
        y: { beginAtZero: true, ticks: { callback: v => v + 'h' } }
      }
    }
  });

  // Cumulative flex line chart
  const ctxLine = document.getElementById('chart-weekly-line');
  const flexData = weekly.map(w => w.cumulativeFlex);
  chartInstances.weeklyLine = new Chart(ctxLine, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Cumulative Flex',
        data: flexData,
        borderColor: flexData[flexData.length - 1] >= 0 ? '#22c55e' : '#ef4444',
        backgroundColor: (flexData[flexData.length - 1] >= 0 ? '#22c55e' : '#ef4444') + '10',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 5,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.6,
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => (ctx.parsed.y >= 0 ? '+' : '') + ctx.parsed.y.toFixed(1) + 'h'
          }
        }
      },
      scales: {
        x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
        y: {
          ticks: { callback: v => (v >= 0 ? '+' : '') + parseFloat(v.toFixed(1)) + 'h' },
          grid: { color: (ctx) => ctx.tick.value === 0 ? '#ffffff20' : '#1e1e2e' }
        }
      }
    }
  });
}

function renderMonthlyCharts(monthlyTrend, weekly) {
  const labels = monthlyTrend.periods.map(p => p.label);

  // Compute actual & required per month from weekly data
  const monthlyActual = {};
  const monthlyRequired = {};
  for (const w of weekly) {
    // Use start date's month + year to match trend labels (e.g. "Jan '26")
    const dt = new Date(w.period.start + 'T00:00:00');
    const m = dt.getMonth();
    const monthName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m];
    const shortYear = String(dt.getFullYear()).slice(-2);
    const key = monthName + " '" + shortYear;
    monthlyActual[key] = (monthlyActual[key] || 0) + w.actualHours;
    monthlyRequired[key] = (monthlyRequired[key] || 0) + w.requiredHours;
  }

  // Grouped bar chart
  const ctxBar = document.getElementById('chart-monthly-bars');
  chartInstances.monthlyBars = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Actual',
          data: labels.map(l => Math.round((monthlyActual[l] || 0) * 100) / 100),
          backgroundColor: '#3b82f680',
          borderRadius: 4,
          barPercentage: 0.6,
        },
        {
          label: 'Required',
          data: labels.map(l => Math.round((monthlyRequired[l] || 0) * 100) / 100),
          backgroundColor: '#ffffff10',
          borderColor: '#ffffff20',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.6,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.6,
      plugins: {
        legend: { display: true, position: 'top', align: 'end',
          labels: { boxWidth: 12, boxHeight: 12, borderRadius: 2, useBorderRadius: true, padding: 16 }
        },
        tooltip: {
          callbacks: { label: (ctx) => ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(1) + 'h' }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => v + 'h' } }
      }
    }
  });

  // Cumulative line
  const ctxLine = document.getElementById('chart-monthly-line');
  const cumData = monthlyTrend.periods.map(p => p.cumulative);
  chartInstances.monthlyLine = new Chart(ctxLine, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Cumulative Flex',
        data: cumData,
        borderColor: cumData[cumData.length - 1] >= 0 ? '#22c55e' : '#ef4444',
        backgroundColor: (cumData[cumData.length - 1] >= 0 ? '#22c55e' : '#ef4444') + '10',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 6,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.6,
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => (ctx.parsed.y >= 0 ? '+' : '') + ctx.parsed.y.toFixed(1) + 'h'
          }
        }
      },
      scales: {
        y: {
          ticks: { callback: v => (v >= 0 ? '+' : '') + parseFloat(v.toFixed(1)) + 'h' },
          grid: { color: (ctx) => ctx.tick.value === 0 ? '#ffffff20' : '#1e1e2e' }
        }
      }
    }
  });

  // Monthly summary table
  const tbody = document.querySelector('#monthly-table tbody');
  for (const p of monthlyTrend.periods) {
    const tr = document.createElement('tr');
    const sign = p.delta >= 0 ? '+' : '';
    const csign = p.cumulative >= 0 ? '+' : '';
    tr.innerHTML =
      '<td>' + p.label + '</td>' +
      '<td class="' + (p.delta >= 0 ? 'positive' : 'negative') + '">' + sign + p.delta.toFixed(1) + 'h</td>' +
      '<td class="' + (p.cumulative >= 0 ? 'positive' : 'negative') + '">' + csign + p.cumulative.toFixed(1) + 'h</td>';
    tbody.appendChild(tr);
  }
}

function setupTabs() {
  if (window._tabsBound) return;
  window._tabsBound = true;
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
    });
  });
}

function setupToggle() {
  const track = document.getElementById('toggle-today');
  if (includeToday) track.classList.add('active');
  else track.classList.remove('active');

  if (window._toggleBound) return;
  window._toggleBound = true;

  track.addEventListener('click', async () => {
    includeToday = !includeToday;
    track.classList.toggle('active', includeToday);
    await loadData();
  });
  document.getElementById('toggle-label').addEventListener('click', () => {
    track.click();
  });
}

// Heartbeat: let the server know the tab is still open
setInterval(() => fetch('/ping').catch(() => {}), 2000);
</script>
</body>
</html>`;
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
  const html = getDashboardHtml(params.includeToday);

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
