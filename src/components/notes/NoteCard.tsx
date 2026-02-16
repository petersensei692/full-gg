"use client";

import type { Note } from "@/types/api";
import { getFirstSentence } from "@/lib/notes";
import { FileText } from "lucide-react";

interface NoteCardProps {
  note: Note;
  onClick: () => void;
}

export function NoteCard({ note, onClick }: NoteCardProps) {
  const preview = getFirstSentence(note.note);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-sidebar-border bg-sidebar/50 overflow-hidden shadow-sm hover:border-primary/50 hover:bg-sidebar/70 transition-colors p-5 flex flex-col min-h-[140px]"
    >
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-5 w-5 text-primary/80 shrink-0" />
        <h2 className="text-lg font-semibold text-dashboard-foreground truncate">
          {note.title}
        </h2>
      </div>
      <p className="text-sm text-dashboard-foreground/90 leading-relaxed line-clamp-3 flex-1">
        {preview || "No content"}
      </p>
    </button>
  );
}
