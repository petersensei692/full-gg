import Link from "next/link";
import { BarChart3, LineChart } from "lucide-react";

/**
 * First screen: choose Fundamental (existing app) or Analytics (to be built).
 * Light, centered layout inspired by hardware-setup style onboarding screens.
 */
export function WelcomeLanding() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 px-6 py-16 text-zinc-900">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900">
          JOURNAL APP
        </h1>
        <p className="mt-3 text-base sm:text-lg text-zinc-500 max-w-md mx-auto">
          Choose a section to get started
        </p>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          <Link
            href="/fundamental-analysis"
            className="group flex flex-col items-center rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm transition-all hover:border-blue-400/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
              <BarChart3 className="h-9 w-9" strokeWidth={1.5} />
            </div>
            <span className="mt-6 text-lg font-semibold text-zinc-900">Fundamental</span>
            <span className="mt-1 text-sm text-zinc-500">Analysis, watchlists, calendar &amp; notes</span>
            <span className="mt-4 text-sm font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
              Open →
            </span>
          </Link>

          <Link
            href="/analytics"
            className="group flex flex-col items-center rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm transition-all hover:border-blue-400/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
              <LineChart className="h-9 w-9" strokeWidth={1.5} />
            </div>
            <span className="mt-6 text-lg font-semibold text-zinc-900">Analytics</span>
            <span className="mt-1 text-sm text-zinc-500">Dashboards &amp; metrics (coming next)</span>
            <span className="mt-4 text-sm font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
              Open →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
