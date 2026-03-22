"use client";

import { Suspense, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { SidebarTrigger } from "./SidebarTrigger";
import { SidebarContextProvider } from "@/context/SidebarContext";
import { useIsDesktop } from "@/hooks/useMediaQuery";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const isDesktop = useIsDesktop();
  const pathname = usePathname();
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  /** Asset analysis: legacy /fundamental-analysis/:slug or static /fundamental-analysis/asset?slug= */
  const isAssetAnalysisPage =
    pathname === "/fundamental-analysis/asset" ||
    !!pathname?.match(/^\/fundamental-analysis\/[^/]+$/);

  return (
    <SidebarContextProvider openOverlay={() => setOverlayOpen(true)}>
      <div className="flex h-screen bg-dashboard-bg text-dashboard-foreground">
        <Suspense
          fallback={
            <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar" />
          }
        >
          <Sidebar
            collapsed={collapsed}
            overlayOpen={overlayOpen}
            onOverlayClose={() => setOverlayOpen(false)}
            onToggleCollapsed={() => setCollapsed((c) => !c)}
            onToggleOverlay={() => setOverlayOpen((o) => !o)}
            isOverlayMode={!isDesktop}
          />
        </Suspense>

        {!isDesktop && overlayOpen && (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setOverlayOpen(false)}
          />
        )}

        <div className="flex flex-1 flex-col min-w-0 relative">
          {/* On non–asset-analysis pages (mobile), show a slim bar with hamburger so menu is always reachable */}
          {!isDesktop && !isAssetAnalysisPage && (
            <div className="shrink-0 h-11 flex items-center px-4 border-b border-sidebar-border bg-dashboard-bg lg:hidden">
              <SidebarTrigger />
            </div>
          )}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarContextProvider>
  );
}
