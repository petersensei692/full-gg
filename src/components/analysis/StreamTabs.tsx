"use client";

import { MessageSquare, Eye } from "lucide-react";

const TABS = [
  { id: "stream", label: "Analysis", icon: MessageSquare },
  { id: "watchlist", label: "Pair Watchlist", icon: Eye },
] as const;

interface StreamTabsProps {
  active: (typeof TABS)[number]["id"];
  onSelect: (id: (typeof TABS)[number]["id"]) => void;
  /** When true, parent provides the bar border (e.g. unified header) */
  noBorder?: boolean;
}

export function StreamTabs({ active, onSelect, noBorder }: StreamTabsProps) {
  return (
    <div className={`flex min-w-0 border-b border-sidebar-border ${noBorder ? "border-b-transparent" : ""}`}>
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={`flex items-center gap-1.5 min-w-0 shrink px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-dashboard-foreground/70 hover:text-dashboard-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
