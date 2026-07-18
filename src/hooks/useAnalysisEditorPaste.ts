"use client";

import { useCallback } from "react";
import { useImagePaste } from "@/hooks/useImagePaste";
import { getPlainTextFromDataTransfer } from "@/lib/clipboardPlainText";

function clipboardHasImageFile(data: DataTransfer | null): boolean {
  if (!data?.items) return false;
  return Array.from(data.items).some(
    (item) => item.kind === "file" && typeof item.type === "string" && item.type.startsWith("image/")
  );
}

function insertPlainTextAtSelection(editor: HTMLElement, text: string): void {
  editor.focus();
  const ok = document.execCommand("insertText", false, text);
  if (ok) return;
  const sel = window.getSelection();
  if (!sel?.rangeCount) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  range.insertNode(document.createTextNode(text));
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

/**
 * Image paste uploads and forwards to onImageReady; any other paste/drop inserts plain text only.
 */
export function useAnalysisEditorPaste(options: {
  editorRef: React.RefObject<HTMLElement | null>;
  onImageReady?: (image: { path: string; url: string }) => void;
}) {
  const { editorRef, onImageReady } = options;
  const { handlePaste: handleImagePaste } = useImagePaste({
    editorRef,
    onImageReady,
  });

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (clipboardHasImageFile(e.clipboardData)) {
        void handleImagePaste(e);
        return;
      }
      e.preventDefault();
      const text = getPlainTextFromDataTransfer(e.clipboardData);
      if (!text || !editorRef.current) return;
      insertPlainTextAtSelection(editorRef.current, text);
    },
    [editorRef, handleImagePaste]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      const data = e.dataTransfer;
      if (clipboardHasImageFile(data)) return;
      const text = getPlainTextFromDataTransfer(data);
      if (!text) return;
      e.preventDefault();
      if (!editorRef.current) return;
      insertPlainTextAtSelection(editorRef.current, text);
    },
    [editorRef]
  );

  return { handlePaste, handleDrop };
}
