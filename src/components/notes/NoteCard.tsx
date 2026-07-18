"use client";

import { useState } from "react";
import type { Note, NoteTier } from "@/types/api";
import { Trash2 } from "lucide-react";
import { NoteFocusDialog } from "./NoteFocusDialog";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";

function formatNoteDeleteDetails(note: Note): string {
  const lines = [
    `Title: ${note.title}`,
    `Type: ${note.type ?? "—"}`,
    `Tier: ${note.tier ?? "—"}`,
    `Images: ${note.images?.length ?? 0}`,
    `Updated: ${new Date(note.updatedAt).toLocaleString()}`,
    `ID: ${note.id}`,
  ];
  return lines.join("\n");
}

const TIER_BORDER: Record<NoteTier, string> = {
  tier_1: "border-l-4 border-l-red-500 border border-sidebar-border",
  tier_2: "border-l-4 border-l-yellow-500 border border-sidebar-border",
  tier_3: "border-l-4 border-l-blue-500 border border-sidebar-border",
};

interface NoteCardProps {
  note: Note;
  onEdit?: (note: Note) => void;
  onDelete?: (note: Note) => void | Promise<void>;
}

export function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  const [focusOpen, setFocusOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null);
  const tier = (note.tier ?? "tier_2") as NoteTier;
  const borderClass = TIER_BORDER[tier] ?? TIER_BORDER.tier_2;

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={() => setFocusOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setFocusOpen(true);
          }
        }}
        className={`rounded-xl ${borderClass} bg-sidebar/50 overflow-hidden shadow-sm cursor-pointer hover:opacity-90 transition-opacity`}
      >
        <div className="px-4 py-3 flex items-center justify-between gap-2">
          <h4 className="text-base font-semibold text-dashboard-foreground truncate">
            {note.title}
          </h4>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingDelete(note);
                }}
                className="text-dashboard-foreground/50 hover:text-red-400 transition-colors p-1"
                aria-label="Delete note"
                title="Delete note"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(note);
                }}
                className="text-dashboard-foreground/50 hover:text-primary transition-colors p-1"
                aria-label="Edit note"
                title="Edit note"
              >
                ✎
              </button>
            )}
          </div>
        </div>
      </article>

      <NoteFocusDialog
        note={focusOpen ? note : null}
        open={focusOpen}
        onOpenChange={setFocusOpen}
        onEdit={(n) => {
          setFocusOpen(false);
          onEdit?.(n);
        }}
        onDelete={onDelete}
      />

      <ConfirmDeleteDialog
        open={pendingDelete != null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Delete this note?"
        details={pendingDelete ? formatNoteDeleteDetails(pendingDelete) : undefined}
        onConfirm={async () => {
          const n = pendingDelete;
          if (n && onDelete) await Promise.resolve(onDelete(n));
          setPendingDelete(null);
        }}
      />
    </>
  );
}
