"use client";

import { MessageSquare, CalendarDays, Eye } from "lucide-react";

const TABS = [
  { id: "stream", label: "Analysis Stream", icon: MessageSquare },
  { id: "events", label: "Economic Events", icon: CalendarDays },
  { id: "watchlist", label: "Pair Watchlist", icon: Eye },
] as const;

interface StreamTabsProps {
  active: (typeof TABS)[number]["id"];
  onSelect: (id: (typeof TABS)[number]["id"]) => void;
}

export function StreamTabs({ active, onSelect }: StreamTabsProps) {
  return (
    <div className="flex border-b border-sidebar-border">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-dashboard-foreground/70 hover:text-dashboard-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
