"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  BarChart3,
  Eye,
  Calendar,
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Loader2,
  Globe,
  Coins,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { useAssets } from "@/context/AssetsContext";
import { assetsApi } from "@/lib/api";
import type { AssetConfig } from "@/types/asset";

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

export function Sidebar() {
  const pathname = usePathname();
  const [fundamentalOpen, setFundamentalOpen] = useState(true);
  const [assetsOpen, setAssetsOpen] = useState(true);
  const [typeSectionsOpen, setTypeSectionsOpen] = useState<Record<string, boolean>>(() =>
    ASSET_TYPE_ORDER.reduce((acc, t) => ({ ...acc, [t]: true }), {} as Record<string, boolean>)
  );
  const { assets, loading, refetch } = useAssets();

  const assetsByType = useMemo(() => {
    const m: Record<string, AssetConfig[]> = {};
    for (const a of assets) {
      const t = getAssetType(a);
      if (!m[t]) m[t] = [];
      m[t].push(a);
    }
    return m;
  }, [assets]);

  /** Slug of the asset currently being viewed (e.g. "usd") when path is /fundamental-analysis/usd */
  const activeAssetSlug = useMemo(() => {
    const base = "/fundamental-analysis/";
    if (!pathname.startsWith(base)) return null;
    const suffix = pathname.slice(base.length);
    const first = suffix.split("/")[0];
    return first && first.length > 0 ? first : null;
  }, [pathname]);

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

  const fundamentalNavItem: NavItemWithAssets = {
    href: "/fundamental-analysis",
    label: "Fundamental Analysis",
    icon: BarChart3,
    assets,
    subNav: [
      { href: "/global-analysis", label: "Global Analysis", icon: Globe },
      { href: "/watch-list", label: "Watch List", icon: Eye },
      { href: "/calendar", label: "Calendar", icon: Calendar },
    ],
  };

  const navItems: (NavItemWithAssets | NavItemSimple)[] = [fundamentalNavItem, ...otherNavItems];

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Branding */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/20 text-primary">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-sidebar-foreground">
            JOURNAL APP
          </span>
          <span className="text-[10px] uppercase tracking-wider text-sidebar-muted">
            Professional Trader
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        <ul className="space-y-0.5 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            if ("assets" in item) {
              const itemWithAssets = item as NavItemWithAssets;
              const isExpanded = fundamentalOpen;
              const subActive =
                pathname.startsWith(item.href) ||
                pathname === "/assets" ||
                itemWithAssets.subNav.some((s: NavSubItem) => pathname === s.href);
              return (
                <li key={item.href}>
                  <button
                    type="button"
                    onClick={() => setFundamentalOpen(!fundamentalOpen)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                      subActive
                        ? "bg-primary/15 text-primary"
                        : "text-sidebar-foreground hover:bg-sidebar-hover"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                  </button>
                  {isExpanded && (
                    <ul className="mt-0.5 space-y-0.5 pl-4">
                      <li className="flex items-center gap-0">
                        <Link
                          href="/assets"
                          className={`flex-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                            pathname === "/assets"
                              ? "bg-primary/15 text-primary"
                              : "text-sidebar-foreground hover:bg-sidebar-hover"
                          }`}
                        >
                          <Coins className="h-4 w-4 shrink-0" />
                          Assets
                        </Link>
                        {itemWithAssets.assets.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setAssetsOpen(!assetsOpen)}
                            className="rounded p-1.5 text-sidebar-foreground hover:bg-sidebar-hover"
                            aria-label={assetsOpen ? "Collapse asset list" : "Expand asset list"}
                          >
                            {assetsOpen ? (
                              <ChevronDown className="h-4 w-4 shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0" />
                            )}
                          </button>
                        )}
                      </li>
                      {itemWithAssets.assets.length > 0 && assetsOpen && (
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
                                  const isTypeOpen = typeSectionsOpen[type] !== false || hasActiveAsset;
                                  const typeLabel = ASSET_TYPE_LABELS[type] ?? type;
                                  return (
                                    <li key={type}>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setTypeSectionsOpen((prev) => ({ ...prev, [type]: !prev[type] }))
                                        }
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
                                              const isActive = activeAssetSlug != null && asset.slug === activeAssetSlug;
                                              return (
                                            <li key={asset.id ?? asset.slug} className="flex items-center gap-0.5 group/list-item">
                                              <Link
                                                href={`${item.href}/${asset.slug}`}
                                                className={`flex-1 min-w-0 rounded-lg px-3 py-2 text-xs truncate ${
                                                  isActive
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
                      {itemWithAssets.subNav.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = pathname === sub.href;
                        return (
                          <li key={sub.href}>
                            <Link
                              href={sub.href}
                              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                                isSubActive
                                  ? "bg-primary/15 text-primary"
                                  : "text-sidebar-foreground hover:bg-sidebar-hover"
                              }`}
                            >
                              <SubIcon className="h-4 w-4 shrink-0" />
                              {sub.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-hover"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
