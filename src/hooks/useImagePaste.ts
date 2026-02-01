"use client";

import { useCallback } from "react";
import { compressImage } from "@/lib/compressImage";

/**
 * Inserts an image at the current cursor/selection in a contenteditable element.
 */
function insertImageAtSelection(container: HTMLElement, src: string) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  range.collapse(true);

  const img = document.createElement("img");
  img.src = src;
  img.alt = "Pasted image";
  img.setAttribute("data-pasted", "true");
  img.className = "rounded cursor-pointer align-middle pasted-image";
  img.style.maxWidth = "50%";
  img.style.width = "50%";
  img.style.maxHeight = "200px";
  img.style.height = "auto";
  img.style.objectFit = "contain";
  img.style.borderRadius = "0.5rem";
  img.style.cursor = "pointer";
  img.style.display = "block";
  img.style.marginTop = "0.5rem";
  img.style.marginBottom = "0.5rem";

  range.insertNode(img);
  range.setStartAfter(img);
  range.setEndAfter(img);
  selection.removeAllRanges();
  selection.addRange(range);
}

export interface UseImagePasteOptions {
  /** Callback when image is converted and ready; if not provided, inserts into editorRef */
  onImageReady?: (base64: string) => void;
  /** Optional contenteditable element ref; used for insert when onImageReady is not provided */
  editorRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Hook that provides a paste handler to intercept image paste, convert to WebP at full quality
 * (original dimensions preserved), and either call onImageReady(base64) or insert into editorRef.
 */
export function useImagePaste(options: UseImagePasteOptions) {
  const { onImageReady, editorRef } = options;

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const file = Array.from(items).find(
        (item) => item.kind === "file" && item.type.startsWith("image/")
      )?.getAsFile();

      if (!file) return;

      e.preventDefault();

      const base64 = await compressImage(file);
      if (!base64) return;

      if (onImageReady) {
        onImageReady(base64);
        return;
      }

      const el = editorRef?.current;
      if (el && typeof el.focus === "function") {
        el.focus();
        insertImageAtSelection(el, base64);
      }
    },
    [onImageReady, editorRef]
  );

  return { handlePaste };
}
