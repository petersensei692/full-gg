"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import type { Note } from "@/types/api";
import { getImageUrl } from "@/lib/imageUrls";
import { sanitizeRichHtml } from "@/lib/sanitizeRichHtml";
import { Trash2 } from "lucide-react";

function formatNoteDeleteDetails(note: Note): string {
  return [
    `Title: ${note.title}`,
    `Type: ${note.type ?? "—"}`,
    `Tier: ${note.tier ?? "—"}`,
    `Images: ${note.images?.length ?? 0}`,
    `Updated: ${new Date(note.updatedAt).toLocaleString()}`,
    `ID: ${note.id}`,
  ].join("\n");
}

interface NoteFocusDialogProps {
  note: Note | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (note: Note) => void;
  onDelete?: (note: Note) => void | Promise<void>;
}

export function NoteFocusDialog({
  note,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: NoteFocusDialogProps) {
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose
        containToMain
        className="bg-sidebar border border-sidebar-border rounded-xl !w-[min(56rem,calc(100dvw-var(--sidebar-width,0px)-1rem))] !max-w-[min(56rem,calc(100dvw-var(--sidebar-width,0px)-1rem))] max-h-[85dvh] flex flex-col overflow-hidden p-0 min-w-0"
      >
        {note && (
        <>
        <div className="px-5 py-4 border-b border-sidebar-border flex items-center justify-between gap-3 shrink-0">
          <h3 className="text-lg font-semibold text-dashboard-foreground truncate pr-2">
            {note.title}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(note)}
                className="rounded p-2 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-primary transition-colors"
                aria-label="Edit note"
                title="Edit note"
              >
                ✎
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(note)}
                className="rounded p-2 text-dashboard-foreground/60 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                aria-label="Delete note"
                title="Delete note"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto p-4 sm:p-6 space-y-4">
          <div
            className="rich-html-content min-w-0 max-w-full columns-1 break-words break-all text-sm text-dashboard-foreground/90 leading-relaxed prose prose-sm dark:prose-invert px-3 overflow-hidden [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium [&_u]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5 [&_*]:break-words [&_*]:min-w-0 [&_*]:max-w-full [&_*]:columns-1 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2"
            style={{ wordBreak: "break-word", overflowWrap: "break-word" } as React.CSSProperties}
            dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(note.note) }}
          />
          {note.images && note.images.length > 0 && (
            <div className="flex flex-wrap gap-3 pt-2">
              {note.images.map((path, index) => (
                <img
                  key={path}
                  src={getImageUrl(path)}
                  alt={note.imageNames?.[index] || "Note attachment"}
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
      title="Delete this note?"
      details={pendingDelete ? formatNoteDeleteDetails(pendingDelete) : undefined}
      onConfirm={async () => {
        const n = pendingDelete;
        if (n && onDelete) {
          await Promise.resolve(onDelete(n));
          onOpenChange(false);
        }
      }}
    />
    </>
  );
}
