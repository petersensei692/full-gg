import { Calendar, Filter } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";

function SurfaceCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-sidebar-border bg-sidebar ${className}`}>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const balancePoints = [
    "6,66",
    "18,57",
    "30,63",
    "42,54",
    "54,44",
    "66,57",
    "78,38",
    "90,49",
    "102,34",
    "114,52",
    "126,46",
    "138,61",
    "150,58",
    "162,73",
    "174,68",
    "186,82",
    "198,95",
    "210,87",
    "222,112",
    "234,104",
    "246,118",
    "258,92",
    "270,104",
    "282,103",
  ].join(" ");

  return (
    <DashboardLayout>
      <div className="min-h-full bg-dashboard-bg text-dashboard-foreground">
        <div className="mx-auto w-full max-w-[1500px] p-4 sm:p-6">
        <header className="mb-4 flex flex-wrap items-center justify-end gap-2">
            <SurfaceCard className="flex h-10 items-center gap-2 px-3 text-sm">
              <Calendar className="h-4 w-4 text-header-muted" />
              <span className="text-header-foreground">Feb 25, 2026 - Today</span>
            </SurfaceCard>
            <SurfaceCard className="flex h-10 w-10 items-center justify-center">
              <Filter className="h-4 w-4 text-primary" />
            </SurfaceCard>
        </header>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Top row: two small cards side-by-side on wide screens */}
            <div className="grid grid-cols-1 gap-4 lg:col-span-2 lg:grid-cols-2">
              <SurfaceCard className="p-4">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="text-3xl font-semibold text-header-foreground">32</p>
                    <p className="text-sm text-header-muted">Trade Count</p>
                  </div>
                  <div className="text-xs text-header-muted">Range</div>
                </div>
                <div className="h-14 rounded-md bg-header p-2">
                  <svg viewBox="0 0 200 48" className="h-full w-full">
                    <polyline
                      fill="none"
                      stroke="#3ea5ff"
                      strokeWidth="2"
                      points="0,18 20,18 32,25 62,25 90,12 108,12 130,28 160,28 182,15 200,20"
                    />
                  </svg>
                </div>
              </SurfaceCard>

              <SurfaceCard className="p-4">
                <p className="text-xl font-semibold text-header-foreground">Winstreak</p>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-3xl font-semibold text-primary">1</p>
                    <p className="text-xs text-header-muted">Days</p>
                  </div>
                  <div>
                    <p className="text-3xl font-semibold text-primary">1</p>
                    <p className="text-xs text-header-muted">Trades</p>
                  </div>
                </div>
              </SurfaceCard>
            </div>

            {/* Big stats card: full width */}
            <SurfaceCard className="p-4 lg:col-span-2">
            <div className="border-l-2 border-[#2196f3] pl-3">
              <p className="text-sm font-semibold text-header-foreground">Gain %</p>
              <p className="mt-1 text-2xl font-semibold text-primary">+5.15%</p>
              <p className="text-xs text-header-muted">0.00% abs</p>
            </div>

            <div className="mt-5 border-t border-sidebar-border pt-4">
              <p className="text-xs uppercase tracking-wide text-header-muted">Period Returns</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-header px-2 py-2">
                  <p className="text-header-muted">Daily</p>
                  <p className="text-primary">+0.23%</p>
                </div>
                <div className="rounded-md bg-header px-2 py-2">
                  <p className="text-header-muted">Weekly</p>
                  <p className="text-primary">+1.26%</p>
                </div>
                <div className="rounded-md bg-header px-2 py-2">
                  <p className="text-header-muted">Monthly</p>
                  <p className="text-primary">+2.54%</p>
                </div>
                <div className="rounded-md bg-header px-2 py-2">
                  <p className="text-header-muted">Annualized</p>
                  <p className="text-primary">+88.18%</p>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-sidebar-border pt-4 text-sm">
              <p className="mb-2 text-xs uppercase tracking-wide text-header-muted">Risk</p>
              <div className="space-y-2 text-dashboard-foreground">
                <div className="flex justify-between">
                  <span className="text-header-muted">Max Balance Drawdown</span>
                  <span className="text-[#f77786]">2.23%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-header-muted">Current Equity</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-header-muted">Current Balance</span>
                  <span>$23,178.05</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-header-muted">Highest Balance</span>
                  <span>$23,513.86</span>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-sidebar-border pt-4 text-sm">
              <p className="mb-2 text-xs uppercase tracking-wide text-header-muted">Trade Stats</p>
              <div className="space-y-2 text-dashboard-foreground">
                <div className="flex justify-between">
                  <span className="text-header-muted">Win rate (%)</span>
                  <span className="text-primary">62.54%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-header-muted">Profit Factor</span>
                  <span>1.93</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-header-muted">Avg Win / Avg Loss</span>
                  <span>
                    <span className="text-primary">$117.90</span> /{" "}
                    <span className="text-[#f77786]">$101.87</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-header-muted">Avg Trade Duration</span>
                  <span>1h 43m</span>
                </div>
              </div>
            </div>
            </SurfaceCard>

            <SurfaceCard className="p-4 lg:col-span-2">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-3xl font-semibold text-header-foreground">$23,178.05</p>
                <p className="text-sm text-header-muted">Balance</p>
              </div>
              <p className="text-xs text-header-muted">Range</p>
            </div>
            <div className="h-[340px] rounded-lg border border-sidebar-border bg-gradient-to-b from-[#0b1930] to-[#0a1528] p-3">
              <svg viewBox="0 0 300 140" className="h-full w-full">
                <defs>
                  <linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3ea5ff" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#3ea5ff" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                <polyline fill="none" stroke="#3ea5ff" strokeWidth="2" points={balancePoints} />
                <polygon
                  fill="url(#balance-fill)"
                  points={`6,140 ${balancePoints} 282,140`}
                />
              </svg>
            </div>
            </SurfaceCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
