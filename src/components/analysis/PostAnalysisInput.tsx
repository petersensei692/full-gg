"use client";

import { useRef, useState, useCallback } from "react";
import { Bold, Italic, Underline, PenSquare } from "lucide-react";
import { useImagePaste } from "@/hooks/useImagePaste";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { deleteStoredImage } from "@/lib/imageUpload";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { isHtmlEffectivelyEmpty } from "@/lib/html-empty";

interface PostAnalysisInputProps {
  placeholder: string;
  /** Called when user clicks Create with editor HTML and selected analysis type */
  onCreated?: (payload: { notes: string; images: string[]; analysisType: string }) => void;
}

const ANALYSIS_TYPES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "qoq", label: "QoQ" },
  { value: "yearly", label: "Yearly" },
] as const;

export function PostAnalysisInput({ placeholder, onCreated }: PostAnalysisInputProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [zoomedImageSrc, setZoomedImageSrc] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<string>("daily");
  const [images, setImages] = useState<Array<{ path: string; url: string }>>([]);
  const [, setEditorBump] = useState(0);
  const [imagePendingRemove, setImagePendingRemove] = useState<string | null>(null);

  const { handlePaste } = useImagePaste({
    editorRef,
    onImageReady: (img) => {
      setImages((prev) => [...prev, img]);
      setEditorBump((n) => n + 1);
    },
  });

  const applyFormat = useCallback((command: "bold" | "italic" | "underline") => {
    document.execCommand(command, false);
    editorRef.current?.focus();
  }, []);

  const applyHeading = useCallback((block: "h1" | "h2" | "h3" | "p") => {
    document.execCommand("formatBlock", false, block);
    editorRef.current?.focus();
  }, []);

  /** Keep editor focus/selection when clicking toolbar so format applies to selection */
  const preventFocusLoss = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleEditorClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG" && target instanceof HTMLImageElement) {
      e.preventDefault();
      setZoomedImageSrc(target.src);
    }
  }, []);

  const handleCreate = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? "";
    if (isHtmlEffectivelyEmpty(html) && images.length === 0) return;
    onCreated?.({
      notes: html,
      images: images.map((img) => img.path),
      analysisType,
    });
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    setImages([]);
  }, [analysisType, onCreated, images]);

  return (
    <>
    <div className="rounded-xl border border-sidebar-border bg-sidebar/50 p-3 mt-6">
      <div
        ref={editorRef}
        contentEditable
        spellCheck={false}
        data-placeholder={placeholder}
        role="textbox"
        aria-multiline="true"
        aria-placeholder={placeholder}
        onPaste={handlePaste}
        onInput={() => setEditorBump((n) => n + 1)}
        onClick={handleEditorClick}
        className="min-h-[82px] max-h-[123px] overflow-y-auto w-full min-w-0 rounded-lg border border-sidebar-border bg-header-input px-3 py-2.5 text-sm text-dashboard-foreground placeholder:text-dashboard-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary break-words [&:empty::before]:content-[attr(data-placeholder)] [&:empty::before]:text-dashboard-foreground/50 [&_*]:break-words [&_img]:max-w-[50%] [&_img]:w-[50%] [&_img]:h-auto [&_img]:object-contain [&_img]:rounded-lg [&_img]:cursor-pointer [&_img]:block [&_img]:my-2 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium [&_u]:underline"
        suppressContentEditableWarning
        suppressHydrationWarning
      />
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={() => applyFormat("bold")}
            className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors"
            aria-label="Bold"
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={() => applyFormat("italic")}
            className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors"
            aria-label="Italic"
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={() => applyFormat("underline")}
            className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors"
            aria-label="Underline"
            title="Underline"
          >
            <Underline className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={() => applyHeading("h1")}
            className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors text-xs font-bold"
            aria-label="Heading 1"
            title="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={() => applyHeading("h2")}
            className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors text-xs font-semibold"
            aria-label="Heading 2"
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={() => applyHeading("h3")}
            className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors text-xs font-medium"
            aria-label="Heading 3"
            title="Heading 3"
          >
            H3
          </button>
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={() => applyHeading("p")}
            className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors text-xs"
            aria-label="Normal text"
            title="Normal text"
          >
            P
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={analysisType}
            onChange={(e) => setAnalysisType(e.target.value)}
            className="rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="Analysis type"
          >
            {ANALYSIS_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleCreate}
            disabled={
              isHtmlEffectivelyEmpty(editorRef.current?.innerHTML ?? "") && images.length === 0
            }
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            <PenSquare className="h-4 w-4" />
            Create
          </button>
        </div>
      </div>

      {images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {images.map((img) => (
            <div key={img.path} className="relative">
              <button
                type="button"
                onClick={() => setZoomedImageSrc(img.url)}
                className="block"
              >
                <img
                  src={img.url}
                  alt="Attached"
                  className="h-20 w-28 object-cover rounded-lg border border-sidebar-border hover:border-primary/50 transition-colors"
                />
              </button>
              <button
                type="button"
                onClick={() => setImagePendingRemove(img.path)}
                className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center shadow"
                aria-label="Remove image"
                title="Remove image"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {zoomedImageSrc && (
        <Dialog open={!!zoomedImageSrc} onOpenChange={(open) => !open && setZoomedImageSrc(null)}>
          <DialogContent showClose={true} className="bg-black/95 border-0">
            <div className="relative w-full h-[90dvh] flex items-center justify-center">
              <img
                src={zoomedImageSrc}
                alt="Zoomed"
                className="max-w-full max-h-full w-auto h-auto object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>

    <ConfirmDeleteDialog
      open={imagePendingRemove != null}
      onOpenChange={(o) => !o && setImagePendingRemove(null)}
      title="Remove this image?"
      description="It will be removed from this draft and deleted from storage."
      details={imagePendingRemove ? `Storage path: ${imagePendingRemove}` : undefined}
      confirmLabel="Remove image"
      onConfirm={async () => {
        if (imagePendingRemove) {
          const path = imagePendingRemove;
          setImages((prev) => prev.filter((p) => p.path !== path));
          setEditorBump((n) => n + 1);
          await deleteStoredImage(path).catch(() => undefined);
        }
      }}
    />
    </>
  );
}
