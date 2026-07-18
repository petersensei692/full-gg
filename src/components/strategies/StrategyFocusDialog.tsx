"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import type { Strategy } from "@/types/api";
import { getImageUrl } from "@/lib/imageUrls";
import { Trash2 } from "lucide-react";

function formatStrategyDeleteDetails(strategy: Strategy): string {
  return [
    `Name: ${strategy.name}`,
    `Images: ${strategy.images?.length ?? 0}`,
    `Updated: ${new Date(strategy.updatedAt).toLocaleString()}`,
    `ID: ${strategy.id}`,
  ].join("\n");
}

interface StrategyFocusDialogProps {
  strategy: Strategy | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (strategy: Strategy) => void;
  onDelete?: (strategy: Strategy) => void | Promise<void>;
}

export function StrategyFocusDialog({
  strategy,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: StrategyFocusDialogProps) {
  const [pendingDelete, setPendingDelete] = useState<Strategy | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showClose
          containToMain
          className="bg-sidebar border border-sidebar-border rounded-xl !w-[min(56rem,calc(100dvw-var(--sidebar-width,0px)-2rem))] !max-w-[min(56rem,calc(100dvw-var(--sidebar-width,0px)-2rem))] max-h-[85dvh] flex flex-col overflow-hidden p-0 min-w-0"
        >
          {strategy && (
            <>
              <div className="px-5 py-4 border-b border-sidebar-border flex items-center justify-between gap-3 shrink-0">
                <h3 className="text-lg font-semibold text-dashboard-foreground truncate pr-2">
                  {strategy.name}
                </h3>
                <div className="flex items-center gap-1 shrink-0">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(strategy)}
                      className="rounded p-2 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-primary transition-colors"
                      aria-label="Edit strategy"
                      title="Edit strategy"
                    >
                      ✎
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => setPendingDelete(strategy)}
                      className="rounded p-2 text-dashboard-foreground/60 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                      aria-label="Delete strategy"
                      title="Delete strategy"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto p-6 space-y-4">
                <div
                  className="min-w-0 max-w-full columns-1 break-words break-all text-sm text-dashboard-foreground/90 leading-relaxed prose prose-invert prose-sm px-3 overflow-hidden [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium [&_u]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5 [&_*]:break-words [&_*]:min-w-0 [&_*]:max-w-full [&_*]:columns-1 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2"
                  style={{ wordBreak: "break-word", overflowWrap: "break-word" } as React.CSSProperties}
                  dangerouslySetInnerHTML={{ __html: strategy.description }}
                />
                {strategy.images && strategy.images.length > 0 && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {strategy.images.map((path, index) => (
                      <img
                        key={path}
                        src={getImageUrl(path)}
                        alt={strategy.imageNames?.[index] || "Strategy attachment"}
                        className="max-w-full max-h-[280px] w-auto h-auto object-contain rounded-lg border border-sidebar-border"
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={pendingDelete != null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Delete this strategy?"
        details={pendingDelete ? formatStrategyDeleteDetails(pendingDelete) : undefined}
        onConfirm={async () => {
          const s = pendingDelete;
          if (s && onDelete) {
            await Promise.resolve(onDelete(s));
            onOpenChange(false);
          }
        }}
      />
    </>
  );
}
