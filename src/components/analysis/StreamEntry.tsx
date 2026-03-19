import { useState } from "react";
import type { StreamEntry as StreamEntryType } from "@/types/asset";
import { Trash2, X } from "lucide-react";
import { AnalysisImage } from "@/components/ui/AnalysisImage";
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
  onEdit?: () => void;
}

export function StreamEntry({
  entry,
  separatorType,
  weekGroup,
  dateGroup,
  onDelete,
  onDeleteImage,
  onUpdateImageName,
  onEdit,
}: StreamEntryProps) {
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});

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
      <div className="pt-3 mt-3 border-t border-sidebar-border/50" />
    );

  return (
    <article className="pb-6 last:pb-0">
      {separatorTop}
      <div
        className={`min-w-0 w-full max-w-full sm:max-w-[90%] md:max-w-[80%] lg:max-w-[70%] xl:max-w-[60%] 2xl:max-w-[50%] rounded-xl border border-sidebar-border border-l-4 ${borderClass} bg-sidebar/50 p-4 shadow-sm overflow-hidden`}
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
          <div className="flex items-center gap-2">
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
                onClick={onDelete}
                className="text-dashboard-foreground/50 hover:text-red-400 transition-colors"
                aria-label="Delete analysis"
                title="Delete analysis"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div
          className="stream-entry-content min-w-0 max-w-full break-words text-sm text-dashboard-foreground/90 leading-relaxed mb-2 [&_*]:break-words [&_*]:min-w-0 [&_*]:max-w-full [&_img]:max-w-[50%] [&_img]:w-[50%] [&_img]:max-h-[300px] [&_img]:h-auto [&_img]:object-contain [&_img]:rounded-lg [&_img]:my-2 [&_img]:cursor-pointer [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium"
          style={{ overflowWrap: "break-word" } as React.CSSProperties}
          dangerouslySetInnerHTML={{ __html: entry.content }}
        />
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
                  className="relative min-w-0 flex flex-col gap-0 rounded-lg border border-sidebar-border bg-sidebar/50 overflow-hidden"
                >
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
                    />
                    {onDeleteImage && (
                      <button
                        type="button"
                        onClick={() => onDeleteImage(path)}
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
  );
}
