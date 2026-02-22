"use client";

import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import type { WatchItem } from "@/types/api";
import { useWatchlistCalendar } from "@/context/WatchlistCalendarContext";
import { deleteStoredImage } from "@/lib/imageUpload";
import { getImageUrl } from "@/lib/imageUrls";
import { Trash2, X } from "lucide-react";

interface WatchlistFocusDialogProps {
  entry: WatchItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (entry: WatchItem) => void;
  onDelete?: (entry: WatchItem) => void;
}

const BORDER_CLASS = {
  bullish: "border-l-4 border-l-emerald-500",
  bearish: "border-l-4 border-l-red-500",
} as const;

export function WatchlistFocusDialog({
  entry,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: WatchlistFocusDialogProps) {
  const [zoomedImageSrc, setZoomedImageSrc] = useState<string | null>(null);
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const { deleteWatchItem, updateWatchItem } = useWatchlistCalendar();
  const [entryToShow, setEntryToShow] = useState<WatchItem | null>(null);

  useEffect(() => {
    if (entry && open) {
      setEntryToShow(entry);
    } else if (!open && entryToShow) {
      const t = setTimeout(() => setEntryToShow(null), 400);
      return () => clearTimeout(t);
    }
  }, [entry, open, entryToShow?.id]);

  const displayEntry = open ? (entry ?? entryToShow) : entryToShow ?? entry;

  // Always render Dialog so Radix can manage focus/portal; only show content when we have displayEntry
  const showContent = !!displayEntry;

  const handleUpdateImageName = useCallback(
    async (path: string, name: string) => {
      if (!displayEntry) return;
      setSaveError(null);
      const imageList = displayEntry.thesis?.images ?? [];
      const index = imageList.indexOf(path);
      if (index < 0) return;
      const currentNames = displayEntry.thesis?.imageNames ?? [];
      const nextImageNames = imageList.map((_, i) =>
        i === index ? name : (currentNames[i] ?? "")
      );
      try {
        await updateWatchItem(displayEntry.id, {
          thesis: {
            notes: displayEntry.thesis?.notes ?? "",
            images: imageList,
            imageNames: nextImageNames,
          },
        });
        setDraftNames((prev) => {
          const next = { ...prev };
          delete next[path];
          return next;
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to save image name";
        setSaveError(msg);
      }
    },
    [displayEntry, updateWatchItem]
  );

  const bias = displayEntry
    ? ((displayEntry.bias as "bullish" | "bearish") ?? "bullish")
    : "bullish";
  const images = displayEntry?.thesis?.images ?? [];
  const savedNames = displayEntry?.thesis?.imageNames ?? [];

  const handleDeleteImage = async (path: string) => {
    if (!displayEntry?.thesis) return;
    const imageList = displayEntry.thesis.images ?? [];
    const index = imageList.indexOf(path);
    const nextImages = imageList.filter((p) => p !== path);
    const currentNames = displayEntry.thesis.imageNames ?? [];
    const nextImageNames = nextImages.map(
      (_, i) => currentNames[i + (i >= index ? 1 : 0)] ?? ""
    );
    await updateWatchItem(displayEntry.id, {
      thesis: {
        notes: displayEntry.thesis.notes,
        images: nextImages,
        imageNames: nextImageNames.length > 0 ? nextImageNames : undefined,
      },
    });
    await deleteStoredImage(path).catch(() => undefined);
  };

  const handleDelete = () => {
    if (!displayEntry) return;
    deleteWatchItem(displayEntry.id);
    onOpenChange(false);
    onDelete?.(displayEntry);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showClose
          className={`bg-sidebar border border-sidebar-border rounded-xl w-[90vw] max-w-[90vw] max-h-[85dvh] flex flex-col overflow-hidden p-0 min-w-0 ${BORDER_CLASS[bias]}`}
        >
          {showContent && displayEntry && (
          <>
          <div className="px-5 py-4 border-b border-sidebar-border flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-lg font-semibold text-dashboard-foreground truncate pr-2">
                {displayEntry.pairName}
              </h3>
              <span
                className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded ${
                  bias === "bullish"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {bias === "bullish" ? "Bullish" : "Bearish"}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(displayEntry)}
                  className="rounded p-2 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-primary transition-colors"
                  aria-label="Edit watch item"
                  title="Edit watch item"
                >
                  ✎
                </button>
              )}
              <button
                type="button"
                onClick={handleDelete}
                className="rounded p-2 text-dashboard-foreground/60 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                aria-label="Delete watch item"
                title="Delete watch item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 w-full min-w-full overflow-x-hidden overflow-y-auto p-5 space-y-4">
            {displayEntry.thesis?.notes && (
              <div
                className="w-full min-w-full break-words break-all text-sm text-dashboard-foreground/90 leading-relaxed prose prose-invert prose-sm [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium [&_*]:break-words [&_*]:min-w-0 [&_*]:max-w-full [&_img]:max-w-full [&_img]:max-h-[280px] [&_img]:rounded-lg [&_img]:cursor-pointer [&_img]:my-2"
                style={{ wordBreak: "break-word" } as React.CSSProperties}
                dangerouslySetInnerHTML={{ __html: displayEntry.thesis.notes }}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (
                    target.tagName === "IMG" &&
                    target instanceof HTMLImageElement
                  ) {
                    setZoomedImageSrc(target.src);
                  }
                }}
              />
            )}
            {images.length > 0 && (
              <div className="flex flex-col gap-4 w-full min-w-full">
                {images.map((path, i) => {
                  const url = getImageUrl(path);
                  const savedName = savedNames[i] ?? "";
                  const displayName =
                    path in draftNames ? draftNames[path] : savedName;
                  const fallbackLabel = `Chart ${i + 1}`;
                  return (
                    <div
                      key={path}
                      className="relative w-full min-w-full flex flex-col gap-0 rounded-lg border border-sidebar-border bg-sidebar/50 overflow-hidden"
                    >
                      <textarea
                        value={displayName}
                        onChange={(e) =>
                          setDraftNames((prev) => ({
                            ...prev,
                            [path]: e.target.value,
                          }))
                        }
                        onBlur={async (e) => {
                          const value = (e.target.value || "").trim();
                          if (value !== savedName) {
                            await handleUpdateImageName(path, value);
                          } else {
                            setDraftNames((prev) => {
                              const next = { ...prev };
                              delete next[path];
                              return next;
                            });
                          }
                        }}
                        placeholder={fallbackLabel}
                        rows={1}
                        className="resize-none px-3 py-2 border-b border-sidebar-border bg-sidebar/80 text-xs font-semibold uppercase tracking-wider text-dashboard-foreground placeholder:text-dashboard-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary w-full min-w-0 break-words overflow-auto rounded-none"
                      />
                      <div className="relative w-full min-h-[120px]">
                        <button
                          type="button"
                          onClick={() => setZoomedImageSrc(url)}
                          className="block w-full"
                        >
                          <img
                            src={url}
                            alt={`Chart ${i + 1}`}
                            className="w-full max-h-[70vh] object-contain"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(path)}
                          className="absolute top-2 right-2 rounded-full bg-red-500 text-white w-7 h-7 flex items-center justify-center shadow hover:bg-red-600 transition-colors"
                          aria-label="Delete image"
                          title="Delete image"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {saveError && (
              <p className="text-sm text-red-400">{saveError}</p>
            )}
            {(!displayEntry.thesis?.notes || displayEntry.thesis.notes.trim() === "") &&
              images.length === 0 && (
                <p className="text-sm text-dashboard-foreground/50 italic">
                  No thesis or images.
                </p>
              )}
          </div>
          </>
          )}
        </DialogContent>
      </Dialog>

      {zoomedImageSrc && (
        <Dialog
          open={!!zoomedImageSrc}
          onOpenChange={(o) => !o && setZoomedImageSrc(null)}
        >
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
    </>
  );
}
