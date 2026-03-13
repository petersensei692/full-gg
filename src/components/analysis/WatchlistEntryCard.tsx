"use client";

import { useState } from "react";
import type { WatchItem } from "@/types/api";
import { useWatchlistCalendar } from "@/context/WatchlistCalendarContext";
import { getImageUrl } from "@/lib/imageUrls";
import { Check, Trash2 } from "lucide-react";
import { WatchlistFocusDialog } from "./WatchlistFocusDialog";

interface WatchlistEntryCardProps {
  entry: WatchItem;
  onEdit?: () => void;
}

const BORDER_CLASS = {
  bullish: "border-l-4 border-l-emerald-500 border border-sidebar-border",
  bearish: "border-l-4 border-l-red-500 border border-sidebar-border",
} as const;

export function WatchlistEntryCard({ entry, onEdit }: WatchlistEntryCardProps) {
  const [focusOpen, setFocusOpen] = useState(false);
  const { deleteWatchItem, updateWatchItem } = useWatchlistCalendar();

  const bias = (entry.bias as "bullish" | "bearish") ?? "bullish";
  const firstImage = entry.thesis?.images?.[0];
  const finished = entry.finished === true;

  const handleToggleFinished = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateWatchItem(entry.id, { finished: !finished });
  };

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={() => setFocusOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setFocusOpen(true);
          }
        }}
        className={`rounded-xl ${BORDER_CLASS[bias]} overflow-hidden shadow-sm cursor-pointer flex flex-col min-h-[200px] ${
          finished
            ? "bg-dashboard-foreground/10 focus:bg-dashboard-foreground/10 hover:bg-dashboard-foreground/10"
            : "bg-sidebar/50 hover:opacity-90 transition-opacity"
        }`}
      >
        <div className="px-4 py-3 border-b border-sidebar-border flex items-center justify-between gap-2 shrink-0">
          <h4 className="text-base font-semibold text-dashboard-foreground truncate">
            {entry.pairName}
          </h4>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={handleToggleFinished}
              className={`p-1 transition-colors rounded ${
                finished
                  ? "text-primary bg-primary/20"
                  : "text-dashboard-foreground/50 hover:text-primary hover:bg-sidebar-hover"
              }`}
              aria-label={finished ? "Mark as not finished" : "Mark as finished"}
              title={finished ? "Mark as not finished" : "Mark as finished"}
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteWatchItem(entry.id);
              }}
              className="text-dashboard-foreground/50 hover:text-red-400 transition-colors p-1"
              aria-label="Delete watch item"
              title="Delete watch item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="text-dashboard-foreground/50 hover:text-primary transition-colors p-1"
                aria-label="Edit watch item"
                title="Edit watch item"
              >
                ✎
              </button>
            )}
          </div>
        </div>
        <div
          className={`flex-1 min-h-0 flex items-center justify-center p-4 ${
            finished ? "bg-dashboard-foreground/5" : "bg-sidebar/30"
          }`}
        >
          {firstImage ? (
            <img
              src={getImageUrl(firstImage)}
              alt={entry.pairName}
              className="max-w-full max-h-[180px] w-auto h-auto object-contain rounded-lg"
            />
          ) : (
            <span className="text-sm text-dashboard-foreground/40">No image</span>
          )}
        </div>
      </article>

      <WatchlistFocusDialog
        entry={focusOpen ? entry : null}
        open={focusOpen}
        onOpenChange={setFocusOpen}
        onEdit={() => {
          setFocusOpen(false);
          onEdit?.();
        }}
        onDelete={() => setFocusOpen(false)}
      />
    </>
  );
}
