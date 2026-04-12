"use client";

import { useEffect } from "react";
import { notifyFavoritesWindowClosing } from "@/lib/favoritesWindow";

/** Mount inside favorites-only routes so the opener can clear the filled star when this window closes. */
export function FavoritesWindowLifecycle() {
  useEffect(() => {
    const onLeave = () => notifyFavoritesWindowClosing();
    window.addEventListener("pagehide", onLeave);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, []);
  return null;
}
