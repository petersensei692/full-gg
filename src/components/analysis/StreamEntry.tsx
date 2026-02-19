import { useState } from "react";
import type { StreamEntry as StreamEntryType } from "@/types/asset";
import { Trash2, X } from "lucide-react";
import { AnalysisImage } from "@/components/ui/AnalysisImage";
import { getImageUrl } from "@/lib/imageUrls";

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

  const separatorTop =
    separatorType === "first" ? null : separatorType === "new-week" ? (
      <div className="pt-6 mt-6 border-t-2 border-primary/30">
        {weekGroup && (
          <p className="text-xs font-semibold text-primary/90 uppercase tracking-wider mb-4">
            {weekGroup}
          </p>
        )}
      </div>
    ) : separatorType === "new-day" ? (
      <div className="pt-4 mt-4 border-t border-sidebar-border">
        {dateGroup && (
          <p className="text-xs font-medium text-dashboard-foreground/60 uppercase tracking-wider mb-4">
            {dateGroup}
          </p>
        )}
      </div>
    ) : (
      <div className="pt-3 mt-3 border-t border-sidebar-border/50" />
    );

  return (
    <article className="pb-6 last:pb-0">
      {separatorTop}
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-dashboard-foreground/60">
            {entry.tag}
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
          className="stream-entry-content text-sm text-dashboard-foreground/90 leading-relaxed mb-2 [&_img]:max-w-[50%] [&_img]:w-[50%] [&_img]:max-h-[300px] [&_img]:h-auto [&_img]:object-contain [&_img]:rounded-lg [&_img]:my-2 [&_img]:cursor-pointer [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium"
          dangerouslySetInnerHTML={{ __html: entry.content }}
        />
        {entry.images && entry.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {entry.images.map((path, index) => {
              const url = getImageUrl(path);
              const savedName = entry.imageNames?.[index] ?? "";
              const displayName = path in draftNames ? draftNames[path] : savedName;
              return (
                <div key={path} className="relative max-w-[50%] min-w-0 flex flex-col gap-1.5">
                  <input
                    type="text"
                    value={displayName}
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
                    placeholder="Name for this image"
                    className="rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm text-dashboard-foreground placeholder:text-dashboard-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary w-full min-w-0"
                  />
                  <div className="relative">
                    <AnalysisImage src={url} alt={displayName || "Analysis attachment"} unoptimized />
                    {onDeleteImage && (
                      <button
                        type="button"
                        onClick={() => onDeleteImage(path)}
                        className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white w-6 h-6 flex items-center justify-center shadow"
                        aria-label="Delete image"
                        title="Delete image"
                      >
                        <X className="h-3.5 w-3.5" />
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
