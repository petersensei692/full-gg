"use client";

import Link from "next/link";
import { BarChart3, LineChart } from "lucide-react";

/**
 * Home: pick Fundamental vs Analytics. Client component so it paints immediately inside
 * client providers (avoids occasional blank first paint until reload).
 */
export function WelcomeLanding() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-dashboard-bg px-6 py-16 text-dashboard-foreground">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-dashboard-foreground">
          JOURNAL APP
        </h1>
        <p className="mt-3 text-base sm:text-lg text-dashboard-foreground/60 max-w-md mx-auto">
          Choose a section to get started
        </p>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          <Link
            href="/fundamental-analysis"
            className="group flex flex-col items-center rounded-2xl border border-sidebar-border bg-sidebar p-8 shadow-lg transition-all hover:border-primary/50 hover:bg-sidebar-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-bg"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-sidebar-border bg-header text-primary transition-colors group-hover:border-primary/40 group-hover:bg-primary/10">
              <BarChart3 className="h-9 w-9" strokeWidth={1.5} />
            </div>
            <span className="mt-6 text-lg font-semibold text-dashboard-foreground">Fundamental</span>
            <span className="mt-1 text-sm text-dashboard-foreground/55">Analysis, watchlists, calendar &amp; notes</span>
            <span className="mt-4 text-sm font-medium text-primary">Open →</span>
          </Link>

          <Link
            href="/analytics"
            className="group flex flex-col items-center rounded-2xl border border-sidebar-border bg-sidebar p-8 shadow-lg transition-all hover:border-primary/50 hover:bg-sidebar-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-bg"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-sidebar-border bg-header text-primary transition-colors group-hover:border-primary/40 group-hover:bg-primary/10">
              <LineChart className="h-9 w-9" strokeWidth={1.5} />
            </div>
            <span className="mt-6 text-lg font-semibold text-dashboard-foreground">Analytics</span>
            <span className="mt-1 text-sm text-dashboard-foreground/55">Dashboards &amp; metrics</span>
            <span className="mt-4 text-sm font-medium text-primary">Open →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
