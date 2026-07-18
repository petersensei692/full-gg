"use client";

import { useState } from "react";
import { GripVertical } from "lucide-react";
import { EventImageThumb } from "@/components/analysis/EventImageThumb";

export type AttachedImageItem = {
  path: string;
  url: string;
};

type AttachedImagesStripProps = {
  items: AttachedImageItem[];
  onReorder: (ordered: AttachedImageItem[]) => void;
  onRemove: (path: string) => void;
  /** Default: "Attached images — click to preview · drag to reorder" */
  label?: string;
  /** Thumbnail img classes; defaults match analysis composers */
  imgClassName?: string;
  /** Compact cover thumbs (watchlist / notes style) */
  variant?: "contain" | "cover";
};

/**
 * Create/edit preview strip: leftmost / first = first on the final card.
 * HTML5 drag-and-drop reorder (grip) + remove + lightbox via EventImageThumb.
 */
export function AttachedImagesStrip({
  items,
  onReorder,
  onRemove,
  label = "Attached images — click to preview · drag to reorder",
  imgClassName,
  variant = "contain",
}: AttachedImagesStripProps) {
  const [dragPath, setDragPath] = useState<string | null>(null);

  if (items.length === 0) return null;

  const thumbClass =
    imgClassName ??
    (variant === "cover"
      ? "h-20 w-28 object-cover rounded-lg border border-sidebar-border bg-black/10"
      : "h-24 max-w-[200px] rounded-lg border border-sidebar-border object-contain bg-black/10");

  const moveItem = (fromPath: string, toPath: string) => {
    if (fromPath === toPath) return;
    const fromI = items.findIndex((x) => x.path === fromPath);
    const toI = items.findIndex((x) => x.path === toPath);
    if (fromI < 0 || toI < 0) return;
    const next = [...items];
    const [moved] = next.splice(fromI, 1);
    next.splice(toI, 0, moved);
    onReorder(next);
  };

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-medium text-dashboard-foreground/70">{label}</p>
      <div className="flex flex-wrap gap-3">
        {items.map((img) => (
          <div
            key={img.path}
            onDragOver={(e) => {
              if (!dragPath) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (!dragPath) return;
              moveItem(dragPath, img.path);
              setDragPath(null);
            }}
            className={`relative inline-flex flex-col rounded-lg border border-sidebar-border bg-sidebar/40 overflow-hidden ${
              dragPath === img.path ? "opacity-60 ring-1 ring-primary/40" : ""
            }`}
          >
            <div
              draggable
              onDragStart={(e) => {
                setDragPath(img.path);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", img.path);
              }}
              onDragEnd={() => setDragPath(null)}
              className="flex items-center gap-1 px-1.5 py-0.5 border-b border-sidebar-border bg-sidebar/80 text-dashboard-foreground/50 cursor-grab active:cursor-grabbing select-none"
              title="Drag to reorder"
            >
              <GripVertical className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="text-[9px] uppercase tracking-wide">Drag</span>
            </div>
            <div className="relative">
              <EventImageThumb
                src={img.url}
                alt="Attached"
                imgClassName={thumbClass}
              />
              <button
                type="button"
                onClick={() => onRemove(img.path)}
                className="absolute top-1 right-1 z-[2] rounded-full bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center shadow"
                aria-label="Remove image"
                title="Remove image"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
