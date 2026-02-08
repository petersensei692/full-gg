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
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { useAssets } from "@/context/AssetsContext";
import type { AssetConfig } from "@/types/asset";

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
  const { assets, loading } = useAssets();

  const fundamentalNavItem: NavItemWithAssets = {
    href: "/fundamental-analysis",
    label: "Fundamental Analysis",
    icon: BarChart3,
    assets,
    subNav: [
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
            TradeJournal Pro
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
                      {itemWithAssets.assets.length > 0 && (
                        <li>
                          <button
                            type="button"
                            onClick={() => setAssetsOpen(!assetsOpen)}
                            className="flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-hover"
                          >
                            Assets
                            {assetsOpen ? (
                              <ChevronDown className="h-4 w-4 shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 shrink-0" />
                            )}
                          </button>
                          {assetsOpen && (
                            <ul className="mt-0.5 space-y-0.5 pl-2">
                              {loading ? (
                                <li className="px-3 py-2 flex items-center gap-2 text-xs text-sidebar-muted">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Loading...
                                </li>
                              ) : (
                                itemWithAssets.assets.map((asset) => (
                                  <li key={asset.id ?? asset.slug}>
                                    <Link
                                      href={`${item.href}/${asset.slug}`}
                                      className="block rounded-lg px-3 py-2 text-xs text-sidebar-foreground hover:bg-sidebar-hover"
                                    >
                                      {asset.label}
                                    </Link>
                                  </li>
                                ))
                              )}
                            </ul>
                          )}
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

      {/* User profile */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-hover/50 px-3 py-2.5">
          <div className="h-9 w-9 shrink-0 rounded-full bg-primary/30 flex items-center justify-center text-primary text-sm font-semibold">
            AS
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              Alex Sterling
            </p>
            <p className="text-[10px] text-sidebar-muted">Premium Member</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
