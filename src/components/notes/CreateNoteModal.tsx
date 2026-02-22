"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { Bold, Italic, Underline } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import type { Note, NoteTier } from "@/types/api";

const TIER_OPTIONS: { value: NoteTier; label: string }[] = [
  { value: "tier_1", label: "Tier 1" },
  { value: "tier_2", label: "Tier 2" },
  { value: "tier_3", label: "Tier 3" },
];

interface CreateNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialNote?: Note | null;
  onSubmit: (payload: { title: string; note: string; tier: NoteTier }) => void | Promise<void>;
}

/** Normalize contenteditable HTML to a non-empty string for API (backend requires note). */
function normalizeNoteHtml(html: string): string {
  const trimmed = html?.trim() ?? "";
  if (!trimmed) return "<p></p>";
  if (/^<br\s*\/?>$/i.test(trimmed) || /^<p>\s*<br\s*\/?>\s*<\/p>$/i.test(trimmed)) return "<p></p>";
  return trimmed;
}

export function CreateNoteModal({
  open,
  onOpenChange,
  mode,
  initialNote,
  onSubmit,
}: CreateNoteModalProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [tier, setTier] = useState<NoteTier>("tier_2");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setError("");
      setSubmitting(false);
      return;
    }
    const title = initialNote?.title ?? "";
    const noteHtml = initialNote?.note ?? "";
    setTier((initialNote?.tier ?? "tier_2") as NoteTier);
    const applyInitial = () => {
      if (titleRef.current) titleRef.current.value = title;
      if (editorRef.current) editorRef.current.innerHTML = noteHtml;
    };
    // Defer so DialogContent is mounted and refs are set (Radix renders in portal after open)
    const t = setTimeout(applyInitial, 0);
    const t2 = setTimeout(applyInitial, 50);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [open, initialNote?.id, initialNote?.title, initialNote?.note, initialNote?.tier]);

  const applyFormat = useCallback((command: "bold" | "italic" | "underline") => {
    document.execCommand(command, false);
    editorRef.current?.focus();
  }, []);

  /** Apply heading only to the current block (paragraph) containing the cursor/selection, not the whole content. */
  const applyHeading = useCallback((headingTag: "h1" | "h2" | "h3") => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    // Find the block element that is a direct child of the editor and contains the selection
    let node: Node | null = sel.anchorNode;
    let blockEl: HTMLElement | null = null;
    while (node && node !== editor) {
      if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).parentNode === editor) {
        blockEl = node as HTMLElement;
        break;
      }
      node = node.parentNode;
    }

    if (blockEl) {
      const newHeading = document.createElement(headingTag);
      newHeading.innerHTML = blockEl.innerHTML;
      editor.replaceChild(newHeading, blockEl);
      sel.removeAllRanges();
      const range = document.createRange();
      range.setStart(newHeading, 0);
      range.collapse(true);
      sel.addRange(range);
    } else {
      // No block found (e.g. editor is empty or single text node) – use formatBlock
      document.execCommand("formatBlock", false, headingTag);
    }
  }, []);

  /** Keep editor focus/selection when clicking toolbar so underline etc. apply to selection */
  const handleFormatMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleHeadingMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  /** Paste with preserved formatting (HTML from Word, Docs, web, etc.) */
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const editor = editorRef.current;
    if (!editor) return;
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    const data = html || text;
    if (!data) return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      if (html) {
        const frag = document.createRange().createContextualFragment(html);
        range.insertNode(frag);
      } else {
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
      }
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      document.execCommand("insertHTML", false, html || text.replace(/\n/g, "<br>"));
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    const title = titleRef.current?.value?.trim() ?? "";
    const rawNote = editorRef.current?.innerHTML?.trim() ?? "";
    const note = normalizeNoteHtml(rawNote);
    setError("");
    if (!title) {
      setError("Title is required.");
      return;
    }
    setSubmitting(true);
    try {
      await Promise.resolve(onSubmit({ title, note, tier }));
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save note.");
    } finally {
      setSubmitting(false);
    }
  }, [onSubmit, onOpenChange, tier]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose
        containToMain
        className="!w-[min(56rem,calc(100vw-280px))] !max-w-[min(56rem,calc(100vw-280px))] !min-w-0 min-h-[min(80dvh,36rem)] max-h-[90dvh] flex flex-col items-stretch overflow-hidden bg-sidebar border border-sidebar-border rounded-xl p-0 box-border"
      >
        <div className="w-full flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
          <div className="scrollbar-modal flex flex-col min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full p-6 space-y-5">
          <div className="min-w-0 w-full">
            <span className="text-xs font-semibold uppercase tracking-wider text-dashboard-foreground/60">
              {mode === "edit" ? "Edit note" : "New note"}
            </span>
            <h3 className="text-xl font-semibold text-dashboard-foreground mt-1 truncate">
              {mode === "edit" ? "Edit Note" : "Create Note"}
            </h3>
          </div>

          <div className="min-w-0 w-full">
            <label htmlFor="note-title-input" className="block text-sm font-medium text-dashboard-foreground/80 mb-2 whitespace-nowrap">
              Title
            </label>
            <input
              id="note-title-input"
              ref={titleRef}
              type="text"
              defaultValue={initialNote?.title ?? ""}
              placeholder="Note title"
              maxLength={500}
              className="w-full min-w-0 rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground placeholder:text-dashboard-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary break-words"
            />
          </div>

          <div className="min-w-0 w-full">
            <label htmlFor="note-tier-input" className="block text-sm font-medium text-dashboard-foreground/80 mb-2 whitespace-nowrap">
              Tier <span className="text-red-400">*</span>
            </label>
            <select
              id="note-tier-input"
              value={tier}
              onChange={(e) => setTier(e.target.value as NoteTier)}
              required
              className="w-full min-w-0 rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {TIER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0 w-full flex flex-col flex-1 min-h-0">
            <label className="block text-sm font-medium text-dashboard-foreground/80 mb-2 whitespace-nowrap">
              Note
            </label>
            <div className="flex flex-wrap gap-1 mb-2">
              <button
                type="button"
                onMouseDown={handleFormatMouseDown}
                onClick={() => applyFormat("bold")}
                className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors"
                aria-label="Bold"
                title="Bold"
              >
                <Bold className="h-4 w-4" />
              </button>
              <button
                type="button"
                onMouseDown={handleFormatMouseDown}
                onClick={() => applyFormat("italic")}
                className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors"
                aria-label="Italic"
                title="Italic"
              >
                <Italic className="h-4 w-4" />
              </button>
              <button
                type="button"
                onMouseDown={handleFormatMouseDown}
                onClick={() => applyFormat("underline")}
                className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors"
                aria-label="Underline"
                title="Underline"
              >
                <Underline className="h-4 w-4" />
              </button>
              {(["h1", "h2", "h3"] as const).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onMouseDown={handleHeadingMouseDown}
                  onClick={() => applyHeading(tag)}
                  className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors text-xs font-bold"
                  aria-label={`Heading ${tag[1]}`}
                  title={`Heading ${tag[1]}`}
                >
                  {tag.toUpperCase()}
                </button>
              ))}
            </div>
            <div
              ref={editorRef}
              contentEditable
              data-placeholder="Write your note..."
              role="textbox"
              aria-multiline="true"
              onPaste={handlePaste}
              className="min-h-[200px] min-w-0 max-w-full flex-1 w-full overflow-x-hidden overflow-y-auto break-words rounded-lg border border-sidebar-border bg-header-input px-3 py-2.5 text-sm text-dashboard-foreground placeholder:text-dashboard-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary [&:empty::before]:content-[attr(data-placeholder)] [&:empty::before]:text-dashboard-foreground/50 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium [&_u]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5 [&_*]:break-words [&_*]:min-w-0 [&_*]:max-w-full"
              style={{ wordBreak: 'break-word' } as React.CSSProperties}
              suppressContentEditableWarning
            />
          </div>

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          </div>

          <div className="shrink-0 w-full px-6 py-4 border-t border-sidebar-border flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-sidebar-border px-4 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:pointer-events-none"
          >
            {submitting ? "Saving…" : mode === "edit" ? "Save" : "Create"}
          </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
