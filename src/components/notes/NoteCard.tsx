"use client";

import type { Note, NoteTier } from "@/types/api";
import { getFirstSentence } from "@/lib/notes";
import { FileText } from "lucide-react";

const TIER_BORDER: Record<NoteTier, string> = {
  tier_1: "border-2 border-red-500",
  tier_2: "border-2 border-yellow-500",
  tier_3: "border-2 border-blue-500",
};

interface NoteCardProps {
  note: Note;
  onClick: () => void;
}

export function NoteCard({ note, onClick }: NoteCardProps) {
  const preview = getFirstSentence(note.note);
  const tier = (note.tier ?? "tier_2") as NoteTier;
  const borderClass = TIER_BORDER[tier] ?? TIER_BORDER.tier_2;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl bg-sidebar/50 overflow-hidden shadow-sm hover:bg-sidebar/70 transition-colors p-5 flex flex-col min-h-[140px] ${borderClass}`}
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
