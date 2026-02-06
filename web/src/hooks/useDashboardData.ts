import { useState, useEffect, useCallback } from "react";
import type { DashboardData } from "../types";

declare global {
  interface Window {
    __CONFIG__?: { includeToday: boolean };
  }
}

export function useDashboardData() {
  const [includeToday, setIncludeToday] = useState(
    () => window.__CONFIG__?.includeToday ?? false
  );
  const [data, setData] = useState<DashboardData | null>(null);

  const fetchData = useCallback(async (include: boolean) => {
    const res = await fetch("/api/data?includeToday=" + include);
    const json = (await res.json()) as DashboardData;
    setData(json);
  }, []);

  useEffect(() => {
    fetchData(includeToday);
  }, [includeToday, fetchData]);

  // Heartbeat: let the server know the tab is still open
  useEffect(() => {
    const id = setInterval(() => {
      fetch("/ping").catch(() => {});
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const toggleIncludeToday = useCallback(() => {
    setIncludeToday((prev) => !prev);
  }, []);

  return { data, includeToday, toggleIncludeToday };
}
