"use client";

import { Menu } from "lucide-react";
import { useSidebarTrigger } from "@/context/SidebarContext";

/** Renders the hamburger button to open the sidebar on mobile. Only visible below lg breakpoint. */
export function SidebarTrigger() {
  const { openOverlay } = useSidebarTrigger() ?? {};

  if (!openOverlay) return null;

  return (
    <button
      type="button"
      onClick={openOverlay}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar text-dashboard-foreground hover:bg-sidebar-hover transition-colors lg:hidden"
      aria-label="Open menu"
      title="Open menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
