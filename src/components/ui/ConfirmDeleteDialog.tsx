"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";

export interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Short line under the title (e.g. “This cannot be undone.”) */
  description?: string;
  /** Extra context: pair, dates, titles, etc. (plain text, shown in a monospace block) */
  details?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description = "This cannot be undone.",
  details,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await Promise.resolve(onConfirm());
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent
        showClose={!busy}
        containToMain
        className="!max-w-md bg-sidebar border border-sidebar-border rounded-xl p-0 overflow-hidden"
      >
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-dashboard-foreground">{title}</h3>
            {description ? (
              <p className="mt-2 text-sm text-dashboard-foreground/75">{description}</p>
            ) : null}
          </div>
          {details ? (
            <pre className="max-h-40 overflow-auto rounded-lg border border-sidebar-border bg-header/50 px-3 py-2 text-xs text-dashboard-foreground/90 whitespace-pre-wrap font-sans">
              {details}
            </pre>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-sidebar-border px-4 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleConfirm()}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50"
            >
              {busy ? "Deleting…" : confirmLabel}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
