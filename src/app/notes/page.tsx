"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { notesService } from "@/lib/services/notes.service";
import type { Note } from "@/types/api";
import { NoteCard } from "@/components/notes/NoteCard";
import { NoteFocusDialog } from "@/components/notes/NoteFocusDialog";
import { CreateNoteModal } from "@/components/notes/CreateNoteModal";

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusedNote, setFocusedNote] = useState<Note | null>(null);
  const [focusOpen, setFocusOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const list = await notesService.getAll();
      setNotes(list);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleCardClick = useCallback((note: Note) => {
    setFocusedNote(note);
    setFocusOpen(true);
  }, []);

  const handleEditFromFocus = useCallback((note: Note) => {
    setFocusOpen(false);
    setEditingNote(note);
    setEditModalOpen(true);
  }, []);

  const handleDeleteFromFocus = useCallback(
    async (note: Note) => {
      try {
        await notesService.delete(note.id);
        setFocusOpen(false);
        setFocusedNote(null);
        loadNotes();
      } catch {
        // ignore
      }
    },
    [loadNotes]
  );

  const handleCreateSubmit = useCallback(
    async (payload: { title: string; note: string; tier: import("@/types/api").NoteTier }) => {
      await notesService.create(payload);
      setCreateOpen(false);
      loadNotes();
    },
    [loadNotes]
  );

  const handleEditSubmit = useCallback(
    async (payload: { title: string; note: string; tier: import("@/types/api").NoteTier }) => {
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
                onClick={() => handleCardClick(note)}
              />
            ))}
          </div>
        )}
      </div>

      <NoteFocusDialog
        note={focusedNote}
        open={focusOpen}
        onOpenChange={setFocusOpen}
        onEdit={handleEditFromFocus}
        onDelete={handleDeleteFromFocus}
      />

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
