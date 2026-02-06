import type { JsonSummaryOutput } from "../types";

interface HeroProps {
  summary: JsonSummaryOutput;
  children?: React.ReactNode;
}

function formatBalance(flexBalance: number): string {
  const sign = flexBalance >= 0 ? "+" : "";
  const hours = Math.floor(Math.abs(flexBalance));
  const mins = Math.round((Math.abs(flexBalance) - hours) * 60);
  if (flexBalance === 0) return "0h 0m";
  let display = sign;
  if (hours > 0) display += hours + "h ";
  display += mins + "m";
  return display;
}

export function Hero({ summary, children }: HeroProps) {
  const balanceClass =
    summary.flexBalance > 0
      ? "positive"
      : summary.flexBalance < 0
        ? "negative"
        : "zero";

  return (
    <div className="hero fade-up delay-1">
      <div className="hero-label">Current Flex Balance</div>
      <div className={`hero-balance ${balanceClass}`}>
        {formatBalance(summary.flexBalance)}
      </div>
      <div className="hero-sub">
        {summary.flexBalance >= 0 ? "ahead of schedule" : "behind schedule"}
        {" "}<span>{summary.period.start} &rarr; {summary.period.end}</span>
      </div>
      <div className="hero-config">
        {summary.config.hoursPerDay}h/day &middot; {summary.config.hoursPerWeek}h/week
      </div>
      {children}
    </div>
  );
}
