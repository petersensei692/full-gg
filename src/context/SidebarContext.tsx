"use client";

import { createContext, useContext } from "react";

interface SidebarContextValue {
  openOverlay: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebarTrigger() {
  const ctx = useContext(SidebarContext);
  return ctx;
}

export function SidebarContextProvider({
  openOverlay,
  children,
}: {
  openOverlay: () => void;
  children: React.ReactNode;
}) {
  return (
    <SidebarContext.Provider value={{ openOverlay }}>
      {children}
    </SidebarContext.Provider>
  );
}
