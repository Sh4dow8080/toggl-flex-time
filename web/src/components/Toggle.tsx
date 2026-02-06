interface ToggleProps {
  includeToday: boolean;
  onToggle: () => void;
}

export function Toggle({ includeToday, onToggle }: ToggleProps) {
  return (
    <div className="toggle-row">
      <span className="toggle-label" onClick={onToggle}>
        Include today
      </span>
      <div
        className={`toggle-track${includeToday ? " active" : ""}`}
        onClick={onToggle}
      >
        <div className="toggle-thumb" />
      </div>
    </div>
  );
}
