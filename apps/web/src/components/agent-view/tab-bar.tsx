"use client";

interface Tab {
  id: string;
  label: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div
      className="flex border-b border-[var(--ic-border)] overflow-x-auto"
      role="tablist"
      aria-label="Hero tabs"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`relative px-4 py-2.5 text-xs font-medium tracking-wide uppercase transition-colors whitespace-nowrap ${
              isActive
                ? "text-[var(--ic-text)] bg-[var(--ic-surface-2)]"
                : "text-[var(--ic-text-dim)] hover:text-[var(--ic-text-muted)] bg-[var(--ic-surface)]"
            }`}
          >
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--ic-accent)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
