"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BookOpen,
  BarChart3,
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Eye,
  Calendar,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Loader2,
  Globe,
  Coins,
  Menu,
  House,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useAssets } from "@/context/AssetsContext";
import { assetsApi } from "@/lib/api";
import { assetAnalysisHref } from "@/lib/assetRoutes";
import type { AssetConfig } from "@/types/asset";

const SIDEBAR_OPEN_TYPE_KEY = "sidebar-open-asset-type";

const ASSET_TYPE_ORDER = ["currency", "commodity", "stocks", "crypto", "bond"] as const;
const ASSET_TYPE_LABELS: Record<string, string> = {
  currency: "Currencies",
  commodity: "Commodities",
  stocks: "Stocks",
  crypto: "Crypto",
  bond: "Bonds",
};

const CURRENCY_NAMES = new Set(["USD", "EUR", "GBP", "JPY", "CAD", "CHF", "AUD", "NZD"]);
const COMMODITY_NAMES = new Set(["XAU", "XAG"]);

function getAssetType(asset: AssetConfig): string {
  if (asset.type) return asset.type;
  const name = (asset.label ?? asset.slug?.toUpperCase().replace(/-/g, " ") ?? "").toUpperCase();
  if (CURRENCY_NAMES.has(name)) return "currency";
  if (COMMODITY_NAMES.has(name)) return "commodity";
  if (name === "STOCKS") return "stocks";
  return "currency";
}

type NavSubItem = { href: string; label: string; icon: LucideIcon };
type NavItemWithAssets = {
  href: string;
  label: string;
  icon: LucideIcon;
  assets: AssetConfig[];
  subNav: NavSubItem[];
};
type NavItemSimple = { href: string; label: string; icon: LucideIcon };

const otherNavItems: NavItemSimple[] = [
  { href: "/notes", label: "Notes", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];
const analyticsNavItems: NavItemSimple[] = [
  { href: "/analytics", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics/trades", label: "Trades", icon: ArrowLeftRight },
  { href: "/analytics/analytics", label: "Analytics", icon: PieChart },
];

interface SidebarProps {
  /** Desktop: sidebar is inline; false = collapsed (icons only), true = expanded */
  collapsed?: boolean;
  /** Mobile: sidebar is overlay; true = visible over content */
  overlayOpen?: boolean;
  onOverlayClose?: () => void;
  onToggleCollapsed?: () => void;
  onToggleOverlay?: () => void;
  /** When true, sidebar is in overlay mode (hamburger lives in main area) */
  isOverlayMode?: boolean;
}

export function Sidebar({
  collapsed = false,
  overlayOpen = false,
  onOverlayClose,
  onToggleCollapsed,
  onToggleOverlay,
  isOverlayMode = false,
}: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isAnalytics = pathname === "/analytics" || pathname.startsWith("/analytics/");
  const [assetsOpen, setAssetsOpen] = useState(true);
  /** Only one type section open at a time; restored from sessionStorage so it stays open when navigating to an asset */
  const [typeSectionsOpen, setTypeSectionsOpen] = useState<Record<string, boolean>>(() =>
    ASSET_TYPE_ORDER.reduce((acc, t) => ({ ...acc, [t]: false }), {} as Record<string, boolean>)
  );
  const { assets, loading, refetch } = useAssets();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem(SIDEBAR_OPEN_TYPE_KEY);
    if (stored && (ASSET_TYPE_ORDER as readonly string[]).includes(stored)) {
      setTypeSectionsOpen((prev) => ({ ...prev, [stored]: true }));
    }
  }, []);

  const assetsByType = useMemo(() => {
    const m: Record<string, AssetConfig[]> = {};
    for (const a of assets) {
      const t = getAssetType(a);
      if (!m[t]) m[t] = [];
      m[t].push(a);
    }
    return m;
  }, [assets]);

  /** Active asset slug: query route (/fundamental-analysis/asset?slug=) or legacy /fundamental-analysis/:slug */
  const activeAssetSlug = useMemo(() => {
    if (pathname === "/fundamental-analysis/asset") {
      const raw = searchParams.get("slug");
      if (!raw?.trim()) return null;
      return raw.trim().toLowerCase().replace(/\s/g, "-");
    }
    const base = "/fundamental-analysis/";
    if (!pathname.startsWith(base)) return null;
    const suffix = pathname.slice(base.length);
    const first = suffix.split("/")[0];
    if (!first || first === "asset") return null;
    return first.length > 0 ? first : null;
  }, [pathname, searchParams]);

  const handleMove = useCallback(
    async (assetId: string, direction: "up" | "down") => {
      try {
        await assetsApi.reorder(assetId, direction);
        await refetch();
      } catch {
        // ignore
      }
    },
    [refetch]
  );

  /** Toggle a type section: open it and close all others; persist so section stays open when navigating to an asset */
  const setTypeSectionOpen = useCallback((type: string, open: boolean) => {
    setTypeSectionsOpen((prev) => {
      const next = { ...prev };
      if (open) {
        ASSET_TYPE_ORDER.forEach((t) => { next[t] = t === type; });
        if (typeof window !== "undefined") sessionStorage.setItem(SIDEBAR_OPEN_TYPE_KEY, type);
      } else {
        next[type] = false;
        if (typeof window !== "undefined") sessionStorage.removeItem(SIDEBAR_OPEN_TYPE_KEY);
      }
      return next;
    });
  }, []);

  const topLevelNav: (NavItemWithAssets | NavItemSimple)[] = isAnalytics
    ? analyticsNavItems
    : [
        { href: "/fundamental-analysis", label: "Assets", icon: Coins, assets, subNav: [] },
        { href: "/global-analysis", label: "Global Analysis", icon: Globe },
        { href: "/watch-list", label: "Watch List", icon: Eye },
        { href: "/calendar", label: "Calendar", icon: Calendar },
        ...otherNavItems,
      ];

  const showAsOverlay = isOverlayMode;
  const isExpanded = !collapsed || (isOverlayMode && overlayOpen);
  const widthClass = collapsed && !isOverlayMode ? "w-16" : "w-[260px]";

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width,transform] duration-200 ease-out ${widthClass} ${
        showAsOverlay ? "fixed inset-y-0 left-0 z-50 shadow-xl" : ""
      }`}
      style={showAsOverlay && !overlayOpen ? { transform: "translateX(-100%)" } : undefined}
    >
      {/* Branding + hamburger */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-2 lg:px-4">
        <button
          type="button"
          onClick={isOverlayMode ? onOverlayClose : onToggleCollapsed}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-hover transition-colors"
          aria-label={isOverlayMode ? "Close menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isOverlayMode ? "Close menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu className="h-5 w-5" />
        </button>
        {isExpanded && (
          <>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/20 text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="flex min-w-0 flex-col overflow-hidden">
              <span className="text-sm font-semibold text-sidebar-foreground truncate">
                JOURNAL APP
              </span>
              <span className="text-[10px] uppercase tracking-wider text-sidebar-muted truncate">
                Professional Trader
              </span>
            </div>
          </>
        )}
      </div>

      {/* Nav: Main menu (home), then section links */}
      <nav className="flex-1 overflow-y-auto py-3">
        <div className={`mb-2 ${isExpanded ? "px-2" : "px-2 flex justify-center"}`}>
          <Link
            href="/"
            onClick={() => onOverlayClose?.()}
            className={`flex items-center rounded-lg text-sm font-medium transition-colors ${
              isExpanded ? "gap-2.5 px-3 py-2.5 w-full" : "h-10 w-10 justify-center"
            } ${
              pathname === "/"
                ? "bg-primary/15 text-primary"
                : "text-sidebar-foreground hover:bg-sidebar-hover"
            }`}
            title="Main Menu"
            aria-label="Main Menu — choose Fundamental or Analytics"
          >
            <House className={`shrink-0 ${isExpanded ? "h-4 w-4" : "h-5 w-5"}`} />
            {isExpanded && "Main Menu"}
          </Link>
        </div>
        <ul className={`space-y-0.5 ${isExpanded ? "px-2" : "px-2 flex flex-col items-center"}`}>
          {topLevelNav.map((item) => {
            const isActive = (() => {
              if (!isAnalytics) {
                return pathname === item.href || pathname.startsWith(item.href + "/");
              }
              if (item.href === "/analytics") return pathname === "/analytics";
              if (item.href === "/analytics/analytics") {
                return pathname === "/analytics/analytics" || pathname.startsWith("/analytics/analytics/");
              }
              return pathname === item.href || pathname.startsWith(item.href + "/");
            })();
            const Icon = item.icon;

            if ("assets" in item) {
              if (!isExpanded) {
                return (
                  <li key="assets" className="w-full flex justify-center">
                    <Link
                      href="/assets"
                      className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                        pathname === "/assets" || pathname.startsWith("/fundamental-analysis")
                          ? "bg-primary/15 text-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-hover"
                      }`}
                      title="Assets"
                      aria-label="Assets"
                    >
                      <Icon className="h-5 w-5" />
                    </Link>
                  </li>
                );
              }
              const itemWithAssets = item as NavItemWithAssets;
              const assetsExpanded = assetsOpen;
              const subActive =
                pathname.startsWith("/fundamental-analysis") ||
                pathname === "/assets" ||
                itemWithAssets.subNav.some((s: NavSubItem) => pathname === s.href);
              return (
                <li key="assets" className="w-full">
                  <button
                    type="button"
                    onClick={() => setAssetsOpen(!assetsOpen)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                      subActive
                        ? "bg-primary/15 text-primary"
                        : "text-sidebar-foreground hover:bg-sidebar-hover"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </span>
                    {assetsExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                  </button>
                  {assetsExpanded && (
                    <ul className="mt-0.5 space-y-0.5 pl-4">
                      <li>
                        <Link
                          href="/assets"
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                            pathname === "/assets"
                              ? "bg-primary/15 text-primary"
                              : "text-sidebar-foreground hover:bg-sidebar-hover"
                          }`}
                        >
                          <BarChart3 className="h-4 w-4 shrink-0" />
                          All assets
                        </Link>
                      </li>
                      {itemWithAssets.assets.length > 0 && (
                        <li>
                          <ul className="mt-0.5 space-y-0.5 pl-2">
                            {loading ? (
                              <li className="px-3 py-2 flex items-center gap-2 text-xs text-sidebar-muted">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Loading...
                              </li>
                            ) : (
                              ASSET_TYPE_ORDER.map((type) => {
                                const typeAssets = assetsByType[type] ?? [];
                                const hasActiveAsset = activeAssetSlug != null && typeAssets.some((a) => a.slug === activeAssetSlug);
                                const isTypeOpen = typeSectionsOpen[type] === true;
                                const typeLabel = ASSET_TYPE_LABELS[type] ?? type;
                                return (
                                  <li key={type}>
                                    <button
                                      type="button"
                                      onClick={() => setTypeSectionOpen(type, !isTypeOpen)}
                                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-sidebar-hover ${
                                        hasActiveAsset ? "bg-primary/10 text-primary" : "text-sidebar-foreground"
                                      }`}
                                    >
                                      {typeLabel}
                                      {isTypeOpen ? (
                                        <ChevronDown className="h-3 w-3 shrink-0" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3 shrink-0" />
                                      )}
                                    </button>
                                    {isTypeOpen && (
                                      <ul className="mt-0.5 space-y-0.5 pl-2">
                                        {typeAssets.length === 0 ? (
                                          <li className="px-3 py-1.5 text-xs text-sidebar-muted">
                                            No assets
                                          </li>
                                        ) : (
                                          typeAssets.map((asset, idx) => {
                                            const isAssetActive = activeAssetSlug != null && asset.slug === activeAssetSlug;
                                            return (
                                              <li key={asset.id ?? asset.slug} className="flex items-center gap-0.5 group/list-item">
                                                <Link
                                                  href={assetAnalysisHref(asset.slug)}
                                                  className={`flex-1 min-w-0 rounded-lg px-3 py-2 text-xs truncate ${
                                                    isAssetActive
                                                      ? "bg-primary/15 text-primary font-medium"
                                                      : "text-sidebar-foreground hover:bg-sidebar-hover"
                                                  }`}
                                                >
                                                  {asset.label}
                                                </Link>
                                                {asset.id && (
                                                  <div className="flex flex-row items-center gap-0 shrink-0 relative z-10" role="group" aria-label="Reorder">
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleMove(asset.id!, "up");
                                                      }}
                                                      disabled={idx === 0}
                                                      className="p-0.5 rounded text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-hover disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                                      aria-label="Move up"
                                                      title="Move up"
                                                    >
                                                      <ChevronUp className="h-3 w-3" />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleMove(asset.id!, "down");
                                                      }}
                                                      disabled={idx === typeAssets.length - 1}
                                                      className="p-0.5 rounded text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-hover disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                                      aria-label="Move down"
                                                      title="Move down"
                                                    >
                                                      <ChevronDown className="h-3 w-3" />
                                                    </button>
                                                  </div>
                                                )}
                                              </li>
                                            );
                                          })
                                        )}
                                      </ul>
                                    )}
                                  </li>
                                );
                              })
                            )}
                          </ul>
                        </li>
                      )}
                    </ul>
                  )}
                </li>
              );
            }

            return (
              <li key={item.href} className={!isExpanded ? "w-full flex justify-center" : ""}>
                <Link
                  href={item.href}
                  className={`flex items-center rounded-lg text-sm font-medium transition-colors ${
                    isExpanded ? "gap-2.5 px-3 py-2.5" : "h-10 w-10 justify-center"
                  } ${
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-hover"
                  }`}
                  title={item.label}
                  aria-label={item.label}
                >
                  <Icon className={`shrink-0 ${isExpanded ? "h-4 w-4" : "h-5 w-5"}`} />
                  {isExpanded && item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
