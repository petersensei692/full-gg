"use client";

import { useEffect, useState } from "react";
import {
  attachFavoritesPopupCloserListener,
  isFavoritesWindowOpen,
  subscribeFavoritesWindowOpen,
} from "@/lib/favoritesWindow";

/**
 * True while the named favorites popup window exists and is not closed.
 * Used to keep the star icon filled in the main app.
 */
export function useFavoritesPopupOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(isFavoritesWindowOpen());
    const unsub = subscribeFavoritesWindowOpen(() => setOpen(isFavoritesWindowOpen()));
    const detachCloser = attachFavoritesPopupCloserListener();
    const id = window.setInterval(() => setOpen(isFavoritesWindowOpen()), 600);
    return () => {
      unsub();
      detachCloser();
      window.clearInterval(id);
    };
  }, []);

  return open;
}
