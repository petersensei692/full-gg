"use client";

import { useState, useEffect } from "react";

/**
 * Matches (min-width: 1024px) - sidebar is inline and can collapse to icons.
 * Below: sidebar is overlay only.
 */
const SIDEBAR_DESKTOP_BREAKPOINT = 1024;

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${SIDEBAR_DESKTOP_BREAKPOINT}px)`);
}

export { SIDEBAR_DESKTOP_BREAKPOINT };
