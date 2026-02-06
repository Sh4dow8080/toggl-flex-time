export interface JsonSummaryOutput {
  period: { start: string; end: string };
  workdays: number;
  requiredHours: number;
  actualHours: number;
  flexBalance: number;
  config: { hoursPerDay: number; hoursPerWeek: number };
}

export interface JsonWeekOutput {
  weekNumber: number;
  year: number;
  period: { start: string; end: string };
  requiredHours: number;
  actualHours: number;
  flexBalance: number;
  cumulativeFlex: number;
}

export interface JsonTrendOutput {
  granularity: "weekly" | "monthly";
  periods: Array<{
    label: string;
    delta: number;
    cumulative: number;
  }>;
}

export interface DailyData {
  date: string;
  dayOfWeek: number;
  actualHours: number;
  requiredHours: number;
  flexBalance: number;
  isWeekend: boolean;
  isHoliday: boolean;
}

export interface DashboardData {
  summary: JsonSummaryOutput;
  weekly: JsonWeekOutput[];
  daily: DailyData[];
  trend: JsonTrendOutput;
  monthlyTrend: JsonTrendOutput;
}
