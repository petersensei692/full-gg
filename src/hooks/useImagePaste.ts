"use client";

import { useCallback } from "react";
import { compressImageToBlob } from "@/lib/compressImage";
import { uploadImageBlob } from "@/lib/imageUpload";

const MAX_PASTE_FILE_BYTES = 25 * 1024 * 1024; // 25MB

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
  onImageReady?: (image: { path: string; url: string }) => void;
  /** Optional contenteditable element ref; used for insert when onImageReady is not provided */
  editorRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Hook that provides a paste handler to intercept image paste, convert to WebP at full quality
 * (original dimensions preserved), and either call onImageReady(image) or insert into editorRef.
 */
export function useImagePaste(options: UseImagePasteOptions) {
  const { onImageReady, editorRef } = options;

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files = Array.from(items)
        .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter(Boolean) as File[];

      if (files.length === 0) return;

      // If any images are present, take over the paste so we can upload them.
      e.preventDefault();

      const el = editorRef?.current;
      if (!onImageReady && el && typeof el.focus === "function") {
        el.focus();
      }

      for (const file of files) {
        if (file.size > MAX_PASTE_FILE_BYTES) continue;

        let blob: Blob | null = null;
        try {
          blob = await compressImageToBlob(file);
        } catch {
          blob = null;
        }
        if (!blob) continue;

        let uploaded: { path: string; url: string } | null = null;
        try {
          uploaded = await uploadImageBlob(blob);
        } catch {
          uploaded = null;
        }
        if (!uploaded) continue;

        if (onImageReady) {
          onImageReady(uploaded);
        } else if (el) {
          insertImageAtSelection(el, uploaded.url);
        }
      }
    },
    [onImageReady, editorRef]
  );

  return { handlePaste };
}
