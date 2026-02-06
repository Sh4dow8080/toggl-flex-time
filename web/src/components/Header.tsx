interface HeaderProps {
  period: string;
}

export function Header({ period }: HeaderProps) {
  return (
    <div className="header fade-up">
      <div className="header-brand">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span className="header-title">Flex Time Dashboard</span>
      </div>
      <span className="header-period">{period}</span>
    </div>
  );
}
