import { useState } from "react";
import { useDashboardData } from "./hooks/useDashboardData";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Stats } from "./components/Stats";
import { Toggle } from "./components/Toggle";
import { Tabs, type TabId } from "./components/Tabs";
import { Heatmap } from "./components/Heatmap";
import { DailyChart } from "./components/DailyChart";
import { WeeklyCharts } from "./components/WeeklyCharts";
import { MonthlyCharts } from "./components/MonthlyCharts";
import "./App.css";

export function App() {
  const { data, includeToday, toggleIncludeToday } = useDashboardData();
  const [activeTab, setActiveTab] = useState<TabId>("weekly");

  if (!data) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <div className="loading-text">Loading flex data...</div>
      </div>
    );
  }

  const period = `${data.summary.period.start} \u2192 ${data.summary.period.end}`;

  return (
    <div className="container">
      <Header period={period} />
      <Hero summary={data.summary}>
        <Toggle includeToday={includeToday} onToggle={toggleIncludeToday} />
      </Hero>
      <Stats summary={data.summary} />
      <Tabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className={`panel${activeTab === "daily" ? " active" : ""}`}>
        <div className="chart-box full fade-up delay-4" style={{ marginBottom: 16 }}>
          <div className="chart-title">Activity Heatmap</div>
          <Heatmap daily={data.daily} />
        </div>
        <div className="chart-box full fade-up delay-5">
          <div className="chart-title">Last 30 Days &mdash; Actual vs Required</div>
          <DailyChart daily={data.daily} />
        </div>
      </div>

      <div className={`panel${activeTab === "weekly" ? " active" : ""}`}>
        <WeeklyCharts weekly={data.weekly} />
      </div>

      <div className={`panel${activeTab === "monthly" ? " active" : ""}`}>
        <MonthlyCharts monthlyTrend={data.monthlyTrend} weekly={data.weekly} />
      </div>
    </div>
  );
}
