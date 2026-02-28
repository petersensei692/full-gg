"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { notesService } from "@/lib/services/notes.service";
import type { Note, NoteType } from "@/types/api";
import { NoteCard } from "@/components/notes/NoteCard";
import { CreateNoteModal } from "@/components/notes/CreateNoteModal";

const TYPE_FILTER_OPTIONS: { value: "" | NoteType; label: string }[] = [
  { value: "", label: "All" },
  { value: "macro", label: "Macro" },
  { value: "technical", label: "Technical" },
  { value: "other", label: "Other" },
];

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"" | NoteType>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const list = await notesService.getAll(typeFilter || undefined);
      setNotes(list);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleEditNote = useCallback((note: Note) => {
    setEditingNote(note);
    setEditModalOpen(true);
  }, []);

  const handleDeleteNote = useCallback(
    async (note: Note) => {
      try {
        await notesService.delete(note.id);
        loadNotes();
      } catch {
        // ignore
      }
    },
    [loadNotes]
  );

  const handleCreateSubmit = useCallback(
    async (payload: { title: string; note: string; tier: import("@/types/api").NoteTier; type: NoteType; images?: string[] }) => {
      await notesService.create(payload);
      setCreateOpen(false);
      loadNotes();
    },
    [loadNotes]
  );

  const handleEditSubmit = useCallback(
    async (payload: { title: string; note: string; tier: import("@/types/api").NoteTier; type: NoteType; images?: string[] }) => {
      if (!editingNote) return;
      await notesService.update(editingNote.id, payload);
      setEditModalOpen(false);
      setEditingNote(null);
      loadNotes();
    },
    [editingNote, loadNotes]
  );

  return (
    <DashboardLayout>
    <div className="flex h-full min-h-0 flex-col overflow-auto">
      <div className="p-6 pt-4 flex flex-col min-h-0 flex-1">
        <h1 className="text-xl font-semibold text-dashboard-foreground mb-2">
          Notes
        </h1>
        <p className="text-sm text-dashboard-foreground/70 mb-6">
          Your notes appear as cards. Click a card to view the full note.
        </p>

        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm text-dashboard-foreground/70">Filter:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "" | NoteType)}
            className="rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {TYPE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create note
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[280px] text-dashboard-foreground/60 text-sm rounded-xl border border-sidebar-border bg-sidebar/30">
            <FileText className="h-12 w-12 mb-3 opacity-50 animate-pulse" />
            <p>Loading notes...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[280px] text-dashboard-foreground/60 text-sm rounded-xl border border-sidebar-border bg-sidebar/30">
            <FileText className="h-12 w-12 mb-3 opacity-50" />
            <p>No notes yet.</p>
            <p className="text-xs mt-1">Create one with the button above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {[...notes]
              .sort((a, b) => {
                const order: Record<string, number> = { tier_1: 0, tier_2: 1, tier_3: 2 };
                const oa = order[a.tier ?? "tier_2"] ?? 1;
                const ob = order[b.tier ?? "tier_2"] ?? 1;
                if (oa !== ob) return oa - ob;
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
              })
              .map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={handleEditNote}
                onDelete={handleDeleteNote}
              />
            ))}
          </div>
        )}
      </div>

      <CreateNoteModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        onSubmit={handleCreateSubmit}
      />

      <CreateNoteModal
        open={editModalOpen}
        onOpenChange={(open) => {
          if (!open) setEditingNote(null);
          setEditModalOpen(open);
        }}
        mode="edit"
        initialNote={editingNote}
        onSubmit={handleEditSubmit}
      />
    </div>
    </DashboardLayout>
  );
}
