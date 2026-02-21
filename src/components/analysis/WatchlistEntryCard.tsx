"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import type { WatchItem } from "@/types/api";
import { useWatchlistCalendar } from "@/context/WatchlistCalendarContext";
import { deleteStoredImage } from "@/lib/imageUpload";
import { getImageUrl } from "@/lib/imageUrls";
import { Trash2, X } from "lucide-react";

interface WatchlistEntryCardProps {
  entry: WatchItem;
  onEdit?: () => void;
}

export function WatchlistEntryCard({ entry, onEdit }: WatchlistEntryCardProps) {
  const [zoomedImageSrc, setZoomedImageSrc] = useState<string | null>(null);
  const { deleteWatchItem, updateWatchItem } = useWatchlistCalendar();

  const handleDeleteImage = async (path: string) => {
    if (!entry.thesis) return;
    const nextImages = (entry.thesis.images ?? []).filter((p) => p !== path);
    await updateWatchItem(entry.id, {
      thesis: {
        notes: entry.thesis.notes,
        images: nextImages,
      },
    });
    await deleteStoredImage(path).catch(() => undefined);
  };

  return (
    <article className="border-b border-sidebar-border pb-6 last:border-0">
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
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
          <button
            type="button"
            onClick={() => deleteWatchItem(entry.id)}
            className="text-dashboard-foreground/50 hover:text-red-400 transition-colors"
            aria-label="Delete watch item"
            title="Delete watch item"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="ml-2 text-dashboard-foreground/50 hover:text-primary transition-colors"
              aria-label="Edit watch item"
              title="Edit watch item"
            >
              ✎
            </button>
          )}
        </div>
        {entry.thesis?.notes && (
          <div
            className="min-w-0 break-words break-all text-sm text-dashboard-foreground/90 leading-relaxed mb-3 prose prose-invert prose-sm max-w-none [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium [&_*]:break-words [&_img]:max-w-[50%] [&_img]:rounded-lg [&_img]:cursor-pointer [&_img]:my-2"
            dangerouslySetInnerHTML={{ __html: entry.thesis.notes }}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.tagName === "IMG" && target instanceof HTMLImageElement) {
                setZoomedImageSrc(target.src);
              }
            }}
          />
        )}
        {entry.thesis?.images && entry.thesis.images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {entry.thesis.images.map((path, i) => {
              const url = getImageUrl(path);
              return (
                <div key={path} className="relative">
                  <button
                    type="button"
                    onClick={() => setZoomedImageSrc(url)}
                    className="block"
                  >
                    <img
                      src={url}
                      alt={`Chart ${i + 1}`}
                      className="max-w-[50%] w-48 h-auto rounded-lg border border-sidebar-border cursor-pointer hover:border-primary/50 transition-colors"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(path)}
                    className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white w-6 h-6 flex items-center justify-center shadow"
                    aria-label="Delete image"
                    title="Delete image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
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
