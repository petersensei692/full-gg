import { useState } from "react";
import type { StreamEntry as StreamEntryType } from "@/types/asset";
import { Trash2, X, Star, GripVertical } from "lucide-react";
import { AnalysisImage } from "@/components/ui/AnalysisImage";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { getImageUrl } from "@/lib/imageUrls";

const TAG_COLOR_BORDER: Record<NonNullable<StreamEntryType["tagColor"]>, string> = {
  red: "border-l-red-500",
  blue: "border-l-blue-500",
  yellow: "border-l-amber-400",
  green: "border-l-emerald-500",
  maroon: "border-l-rose-800",
  orange: "border-l-orange-500",
  purple: "border-l-purple-500",
};

const TAG_COLOR_TEXT: Record<NonNullable<StreamEntryType["tagColor"]>, string> = {
  red: "text-red-500",
  blue: "text-blue-500",
  yellow: "text-amber-400",
  green: "text-emerald-500",
  maroon: "text-rose-800",
  orange: "text-orange-500",
  purple: "text-purple-500",
};

interface StreamEntryProps {
  entry: StreamEntryType;
  separatorType: "same-day" | "new-day" | "new-week" | "first";
  weekGroup?: string;
  dateGroup?: string;
  onDelete?: () => void;
  onDeleteImage?: (path: string) => void;
  onUpdateImageName?: (path: string, name: string) => void;
  /** Persist new image path order (same length as entry.images). */
  onReorderImages?: (orderedPaths: string[]) => void;
  onEdit?: () => void;
  onToggleFavorite?: () => void;
  /**
   * Use full width of the scroll column (favorites sidebar, or main stream when docked beside favorites).
   * Omit to keep responsive max-width bands on large viewports.
   */
  fillColumnWidth?: boolean;
}

export function StreamEntry({
  entry,
  separatorType,
  weekGroup,
  dateGroup,
  onDelete,
  onDeleteImage,
  onUpdateImageName,
  onReorderImages,
  onEdit,
  onToggleFavorite,
  fillColumnWidth = false,
}: StreamEntryProps) {
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [dragPath, setDragPath] = useState<string | null>(null);
  const [confirmDeleteEntryOpen, setConfirmDeleteEntryOpen] = useState(false);
  const [confirmDeleteImagePath, setConfirmDeleteImagePath] = useState<string | null>(null);

  const analysisDeleteDetails = [
    `${entry.tag} • ${entry.time}`,
    entry.scopeLabel ? `Scope: ${entry.scopeLabel}` : null,
    `Type: ${entry.analysisType ?? "daily"}`,
    entry.images?.length ? `Attached images: ${entry.images.length}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const tagColor = entry.tagColor ?? "blue";
  const borderClass = TAG_COLOR_BORDER[tagColor] ?? TAG_COLOR_BORDER.blue;
  const textColorClass = TAG_COLOR_TEXT[tagColor] ?? TAG_COLOR_TEXT.blue;

  const separatorTop =
    separatorType === "first" ? (
      dateGroup ? (
        <div className="flex items-center gap-3 pb-4">
          <div className="flex-1 h-px bg-sidebar-border" />
          <span className="text-xs font-medium text-dashboard-foreground/70 px-3 py-1 rounded-full bg-sidebar/60 border border-sidebar-border">
            {dateGroup}
          </span>
          <div className="flex-1 h-px bg-sidebar-border" />
        </div>
      ) : null
    ) : separatorType === "new-week" ? (
      <div className="flex items-center gap-3 py-6">
        <div className="flex-1 h-px bg-sidebar-border" />
        <span className="text-xs font-semibold text-dashboard-foreground/70 px-3 py-1 rounded-full bg-sidebar/80 border border-sidebar-border">
          {weekGroup}
        </span>
        <div className="flex-1 h-px bg-sidebar-border" />
      </div>
    ) : separatorType === "new-day" ? (
      <div className="flex items-center gap-3 py-4">
        <div className="flex-1 h-px bg-sidebar-border" />
        <span className="text-xs font-medium text-dashboard-foreground/70 px-3 py-1 rounded-full bg-sidebar/60 border border-sidebar-border">
          {dateGroup}
        </span>
        <div className="flex-1 h-px bg-sidebar-border" />
      </div>
    ) : (
      <div className="mt-2 pt-1" aria-hidden />
    );

  const hasTextContent =
    (() => {
      try {
        const doc = new DOMParser().parseFromString(`<div>${entry.content ?? ""}</div>`, "text/html");
        const root = doc.body.firstElementChild;
        return root ? (root.textContent ?? "").trim() !== "" || !!root.querySelector("img") : false;
      } catch {
        return (entry.content ?? "").replace(/<[^>]*>/g, "").trim() !== "";
      }
    })();

  /** Shared lightbox gallery for all attachments on this analysis card */
  const imageGallery =
    entry.images?.map((p, i) => {
      const savedName = entry.imageNames?.[i] ?? "";
      const dn = p in draftNames ? draftNames[p] : savedName;
      const fb = `Chart ${i + 1}`;
      const label = (dn || "").trim() || fb;
      return {
        src: getImageUrl(p),
        alt: label,
        caption: label,
      };
    }) ?? [];

  return (
    <>
    <article className="pb-3 last:pb-0">
      {separatorTop}
      <div
        className={
          fillColumnWidth
            ? `min-w-0 w-full max-w-full rounded-xl border border-sidebar-border border-l-4 ${borderClass} bg-sidebar/50 p-4 shadow-sm overflow-hidden antialiased [transform:translateZ(0)]`
            : `min-w-0 w-full max-w-full sm:max-w-[90%] md:max-w-[80%] lg:max-w-[70%] xl:max-w-[60%] 2xl:max-w-[50%] rounded-xl border border-sidebar-border border-l-4 ${borderClass} bg-sidebar/50 p-4 shadow-sm overflow-hidden antialiased [transform:translateZ(0)]`
        }
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className={`text-xs font-semibold uppercase tracking-wider ${textColorClass}`}>
            {entry.tag} • {entry.time}
            {entry.scopeLabel != null && entry.scopeLabel !== "" && (
              <span className="ml-1.5 text-dashboard-foreground/70 font-medium normal-case">
                • {entry.scopeLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {onToggleFavorite ? (
              <button
                type="button"
                onClick={onToggleFavorite}
                className="rounded p-0.5 text-dashboard-foreground/50 hover:text-sky-400 transition-colors"
                aria-label={entry.favorite ? "Remove from favorites" : "Add to favorites"}
                title={entry.favorite ? "Remove from favorites" : "Add to favorites"}
                aria-pressed={!!entry.favorite}
              >
                <Star
                  className={`h-4 w-4 ${entry.favorite ? "fill-sky-500 text-sky-500" : ""}`}
                />
              </button>
            ) : entry.favorite ? (
              <span
                className="rounded p-0.5 text-sky-500"
                title="Favorite — change from Global Analysis"
                aria-label="Favorite (global analysis)"
              >
                <Star className="h-4 w-4 fill-sky-500 text-sky-500" />
              </span>
            ) : null}
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="text-dashboard-foreground/50 hover:text-primary transition-colors"
                aria-label="Edit analysis"
                title="Edit analysis"
              >
                ✎
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => setConfirmDeleteEntryOpen(true)}
                className="text-dashboard-foreground/50 hover:text-red-400 transition-colors"
                aria-label="Delete analysis"
                title="Delete analysis"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        {hasTextContent ? (
          <div
            className="stream-entry-content min-w-0 max-w-full break-words text-sm text-dashboard-foreground leading-relaxed mb-2 antialiased [&_*]:break-words [&_*]:min-w-0 [&_*]:max-w-full [&_img]:max-w-[min(50%,480px)] [&_img]:max-h-[300px] [&_img]:h-auto [&_img]:w-auto [&_img]:object-contain [&_img]:rounded-lg [&_img]:my-2 [&_img]:cursor-pointer [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium"
            style={{ overflowWrap: "break-word" } as React.CSSProperties}
            dangerouslySetInnerHTML={{ __html: entry.content }}
          />
        ) : null}
        {entry.images && entry.images.length > 0 && (
          <div className="grid grid-cols-1 gap-4 mb-3">
            {entry.images.map((path, index) => {
              const url = getImageUrl(path);
              const savedName = entry.imageNames?.[index] ?? "";
              const displayName = path in draftNames ? draftNames[path] : savedName;
              const fallbackLabel = `Chart ${index + 1}`;
              return (
                <div
                  key={path}
                  draggable={!!onReorderImages}
                  onDragStart={(e) => {
                    if (!onReorderImages) return;
                    setDragPath(path);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", path);
                  }}
                  onDragEnd={() => setDragPath(null)}
                  onDragOver={(e) => {
                    if (!onReorderImages || !dragPath) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!onReorderImages || !dragPath || dragPath === path) return;
                    const imgs = [...(entry.images ?? [])];
                    const fromI = imgs.indexOf(dragPath);
                    const toI = imgs.indexOf(path);
                    if (fromI < 0 || toI < 0) return;
                    const next = [...imgs];
                    next.splice(fromI, 1);
                    next.splice(toI, 0, dragPath);
                    onReorderImages(next);
                    setDragPath(null);
                  }}
                  className={`relative min-w-0 flex flex-col gap-0 rounded-lg border border-sidebar-border bg-sidebar/50 overflow-hidden ${
                    dragPath === path ? "opacity-60 ring-1 ring-primary/40" : ""
                  }`}
                >
                  {onReorderImages ? (
                    <div
                      className="flex items-center gap-1.5 px-2 py-1 border-b border-sidebar-border bg-sidebar/80 text-dashboard-foreground/50 cursor-grab active:cursor-grabbing select-none"
                      title="Drag to reorder"
                    >
                      <GripVertical className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="text-[10px] uppercase tracking-wide">Drag to reorder</span>
                    </div>
                  ) : null}
                  <textarea
                    value={displayName}
                    spellCheck={false}
                    onChange={(e) => setDraftNames((prev) => ({ ...prev, [path]: e.target.value }))}
                    onBlur={(e) => {
                      const value = (e.target.value || "").trim();
                      onUpdateImageName?.(path, value);
                      setDraftNames((prev) => {
                        const next = { ...prev };
                        delete next[path];
                        return next;
                      });
                    }}
                    placeholder={fallbackLabel}
                    rows={1}
                    className="resize-none px-3 py-2 border-b border-sidebar-border bg-sidebar/80 text-xs font-semibold uppercase tracking-wider text-dashboard-foreground placeholder:text-dashboard-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary w-full min-w-0 break-words overflow-auto rounded-none"
                  />
                  <div className="relative w-full min-h-[120px]">
                    <AnalysisImage
                      src={url}
                      alt={displayName || fallbackLabel}
                      caption={displayName || fallbackLabel}
                      unoptimized
                      className="w-full max-h-[280px] object-contain"
                      gallery={imageGallery}
                      galleryIndex={index}
                    />
                    {onDeleteImage && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteImagePath(path)}
                        className="absolute top-2 right-2 rounded-full bg-red-500 text-white w-7 h-7 flex items-center justify-center shadow hover:bg-red-600 transition-colors"
                        aria-label="Delete image"
                        title="Delete image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
          {entry.bullets && entry.bullets.length > 0 && (
            <ul className="list-disc list-inside text-sm text-dashboard-foreground/80 space-y-0.5 mb-3">
              {entry.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}
          {entry.chartData && entry.chartData.length > 0 && (
            <div className="rounded-lg border border-sidebar-border bg-sidebar/50 p-3 mb-3">
              <div className="flex items-end gap-1 h-12">
                {entry.chartData.map((d, i) => (
                  <div
                    key={d.label}
                    className="flex-1 min-w-0 rounded-t bg-primary/40 transition-all hover:bg-primary/60"
                    style={{
                      height: `${20 + (d.value / 110) * 80}%`,
                      minHeight: "8px",
                    }}
                    title={`${d.label}: ${d.value}`}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-dashboard-foreground/50">
                {entry.chartData.map((d) => (
                  <span key={d.label}>{d.label}</span>
                ))}
              </div>
            </div>
          )}
          {entry.quote && (
            <blockquote className="border-l-2 border-primary/50 pl-3 py-1 my-2 bg-sidebar/50 rounded-r text-sm text-dashboard-foreground/80 italic">
              &ldquo;{entry.quote.text}&rdquo;
              <footer className="text-xs text-dashboard-foreground/50 not-italic mt-1">
                — {entry.quote.source}
              </footer>
            </blockquote>
          )}
          {entry.pairUpdates && entry.pairUpdates.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {entry.pairUpdates.map((p) => (
                <span
                  key={p.pair}
                  className={`text-xs font-medium ${
                    p.positive ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {p.positive ? "+" : ""}
                  {p.pair}: {p.value}
                </span>
              ))}
            </div>
          )}
      </div>
    </article>

    <ConfirmDeleteDialog
      open={confirmDeleteEntryOpen}
      onOpenChange={setConfirmDeleteEntryOpen}
      title="Delete this analysis?"
      details={analysisDeleteDetails}
      onConfirm={() => {
        onDelete?.();
        setConfirmDeleteEntryOpen(false);
      }}
    />
    <ConfirmDeleteDialog
      open={confirmDeleteImagePath != null}
      onOpenChange={(open) => !open && setConfirmDeleteImagePath(null)}
      title="Remove this image?"
      description="The image file will be removed from this analysis and deleted from storage."
      details={
        confirmDeleteImagePath && entry.images
          ? (() => {
              const ix = entry.images.indexOf(confirmDeleteImagePath);
              const cap =
                ix >= 0
                  ? draftNames[confirmDeleteImagePath] ?? entry.imageNames?.[ix] ?? `Chart ${ix + 1}`
                  : "Image";
              return [`Caption: ${cap}`, `Storage path: ${confirmDeleteImagePath}`].join("\n");
            })()
          : undefined
      }
      confirmLabel="Remove image"
      onConfirm={() => {
        if (confirmDeleteImagePath) onDeleteImage?.(confirmDeleteImagePath);
        setConfirmDeleteImagePath(null);
      }}
    />
    </>
  );
}
