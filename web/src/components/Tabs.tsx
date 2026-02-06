export type TabId = "daily" | "weekly" | "monthly";

interface TabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

export function Tabs({ activeTab, onTabChange }: TabsProps) {
  return (
    <div className="tabs fade-up delay-3">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`tab${activeTab === t.id ? " active" : ""}`}
          onClick={() => onTabChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
