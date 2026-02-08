"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import type { WatchlistEntry } from "@/types/calendar";

interface WatchlistEntryCardProps {
  entry: WatchlistEntry;
}

export function WatchlistEntryCard({ entry }: WatchlistEntryCardProps) {
  const [zoomedImageSrc, setZoomedImageSrc] = useState<string | null>(null);

  return (
    <article className="border-b border-sidebar-border pb-6 last:border-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="text-base font-semibold text-primary">{entry.pairName}</h4>
          {entry.bias && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded ${
                entry.bias === "bullish"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {entry.bias === "bullish" ? "Bullish" : "Bearish"}
            </span>
          )}
        </div>
        {entry.thesis && (
          <div
            className="text-sm text-dashboard-foreground/90 leading-relaxed mb-3 prose prose-invert prose-sm max-w-none [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium [&_img]:max-w-[50%] [&_img]:rounded-lg [&_img]:cursor-pointer [&_img]:my-2"
            dangerouslySetInnerHTML={{ __html: entry.thesis }}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.tagName === "IMG" && target instanceof HTMLImageElement) {
                setZoomedImageSrc(target.src);
              }
            }}
          />
        )}
        {entry.chartImages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {entry.chartImages.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setZoomedImageSrc(src)}
                className="block"
              >
                <img
                  src={src}
                  alt={`Chart ${i + 1}`}
                  className="max-w-[50%] w-48 h-auto rounded-lg border border-sidebar-border cursor-pointer hover:border-primary/50 transition-colors"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {zoomedImageSrc && (
        <Dialog open={!!zoomedImageSrc} onOpenChange={(o) => !o && setZoomedImageSrc(null)}>
          <DialogContent showClose className="bg-black/95 border-0">
            <div className="relative w-full h-[90dvh] flex items-center justify-center">
              <img
                src={zoomedImageSrc}
                alt="Zoomed"
                className="max-w-full max-h-full w-auto h-auto object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </article>
  );
}
