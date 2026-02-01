"use client";

import { Search, Bell, ChevronDown, ChevronRight, Code } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  title?: string;
  searchPlaceholder?: string;
}

export function Header({
  title = "Fundamental Analysis Dashboard",
  searchPlaceholder = "Search markets, assets or symbols...",
}: HeaderProps) {
  const [isLive, setIsLive] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-header-border bg-header px-6">
      <h1 className="text-lg font-semibold text-header-foreground truncate">
        {title}
      </h1>

      <div className="flex flex-1 items-center justify-center gap-4 max-w-xl mx-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-header-muted" />
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-header-border bg-header-input py-2 pl-9 pr-3 text-sm text-header-foreground placeholder:text-header-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-header-border bg-header-input p-0.5">
          <button
            type="button"
            onClick={() => setIsLive(true)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              isLive
                ? "bg-primary text-primary-foreground"
                : "text-header-muted hover:text-header-foreground"
            }`}
          >
            Live
          </button>
          <button
            type="button"
            onClick={() => setIsLive(false)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              !isLive
                ? "bg-primary text-primary-foreground"
                : "text-header-muted hover:text-header-foreground"
            }`}
          >
            Demo
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-lg p-2 text-header-muted hover:bg-header-hover hover:text-header-foreground transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-header-muted">ID</span>
          <span className="text-sm font-medium text-header-foreground">
            882918
          </span>
          <ChevronDown className="h-4 w-4 text-header-muted" />
        </div>
        <button
          type="button"
          className="rounded-lg p-2 text-header-muted hover:bg-header-hover hover:text-header-foreground transition-colors"
          aria-label="Expand"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded-lg p-2 text-header-muted hover:bg-header-hover hover:text-header-foreground transition-colors"
          aria-label="Code"
        >
          <Code className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
