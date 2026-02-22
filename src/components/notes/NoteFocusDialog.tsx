"use client";

import { Dialog, DialogContent } from "@/components/ui/Dialog";
import type { Note } from "@/types/api";
import { Trash2 } from "lucide-react";

interface NoteFocusDialogProps {
  note: Note | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (note: Note) => void;
  onDelete?: (note: Note) => void;
}

export function NoteFocusDialog({
  note,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: NoteFocusDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose
        containToMain
        className="bg-sidebar border border-sidebar-border rounded-xl !w-[min(56rem,calc(100vw-280px))] !max-w-[min(56rem,calc(100vw-280px))] max-h-[85dvh] flex flex-col overflow-hidden p-0 min-w-0"
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
        <div className="flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto p-6">
          <div
            className="min-w-0 max-w-full columns-1 break-words break-all text-sm text-dashboard-foreground/90 leading-relaxed prose prose-invert prose-sm px-3 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium [&_u]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5 [&_*]:break-words [&_*]:min-w-0 [&_*]:max-w-full [&_*]:columns-1"
            style={{ wordBreak: 'break-word' } as React.CSSProperties}
            dangerouslySetInnerHTML={{ __html: note.note }}
          />
        </div>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
