"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Bold, Italic, Underline, PenSquare } from "lucide-react";
import { useAnalysisEditorPaste } from "@/hooks/useAnalysisEditorPaste";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { AttachedImagesStrip } from "@/components/analysis/AttachedImagesStrip";
import { deleteStoredImage } from "@/lib/imageUpload";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { isHtmlEffectivelyEmpty } from "@/lib/html-empty";
import { clearDraft, loadDraftJson, saveDraftJson } from "@/lib/form-drafts";
import { getImageUrl } from "@/lib/imageUrls";

interface PostAnalysisInputProps {
  placeholder: string;
  /** Stable key for autosaved drafts (e.g. asset id). Omit to disable persistence. */
  draftKey?: string;
  /** Called when user clicks Create with editor HTML and selected analysis type */
  onCreated?: (payload: {
    notes: string;
    images: string[];
    analysisType: string;
    title?: string;
  }) => void;
}

const ANALYSIS_TYPES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "qoq", label: "QoQ" },
  { value: "yearly", label: "Yearly" },
] as const;

type AssetComposerDraftV1 = {
  v: 1;
  title: string;
  analysisType: string;
  html: string;
  imagePaths: string[];
};

export function PostAnalysisInput({ placeholder, onCreated, draftKey }: PostAnalysisInputProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [zoomedImageSrc, setZoomedImageSrc] = useState<string | null>(null);
  const [streamTitle, setStreamTitle] = useState("");
  const [analysisType, setAnalysisType] = useState<string>("daily");
  const [images, setImages] = useState<Array<{ path: string; url: string }>>([]);
  const [editorBump, setEditorBump] = useState(0);
  const [imagePendingRemove, setImagePendingRemove] = useState<string | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(() => !draftKey);

  useEffect(() => {
    if (!draftKey) {
      setDraftHydrated(true);
      return;
    }
    const d = loadDraftJson<AssetComposerDraftV1>(draftKey);
    if (d?.v === 1) {
      setStreamTitle(d.title ?? "");
      setAnalysisType(d.analysisType ?? "daily");
      if (d.imagePaths?.length) {
        setImages(d.imagePaths.map((path) => ({ path, url: getImageUrl(path) })));
      }
      const html = d.html ?? "";
      queueMicrotask(() => {
        if (editorRef.current) editorRef.current.innerHTML = html;
      });
    }
    setDraftHydrated(true);
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey || !draftHydrated) return;
    const t = window.setTimeout(() => {
      const html = editorRef.current?.innerHTML ?? "";
      if (isHtmlEffectivelyEmpty(html) && !streamTitle.trim() && images.length === 0) {
        clearDraft(draftKey);
        return;
      }
      saveDraftJson(draftKey, {
        v: 1,
        title: streamTitle,
        analysisType,
        html,
        imagePaths: images.map((i) => i.path),
      } satisfies AssetComposerDraftV1);
    }, 450);
    return () => window.clearTimeout(t);
  }, [draftKey, draftHydrated, streamTitle, analysisType, images, editorBump]);

  const { handlePaste } = useAnalysisEditorPaste({
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
      title: streamTitle.trim() ? streamTitle.trim() : undefined,
    });
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    setImages([]);
    setStreamTitle("");
    if (draftKey) clearDraft(draftKey);
  }, [analysisType, streamTitle, onCreated, images, draftKey]);

  return (
    <>
    <div className="rounded-xl border border-sidebar-border bg-sidebar/50 p-3 mt-6">
      <div className="space-y-1 mb-2">
        <label htmlFor="asset-analysis-new-title" className="text-xs font-medium text-dashboard-foreground/70">
          Title <span className="font-normal text-dashboard-foreground/50">(optional)</span>
        </label>
        <input
          id="asset-analysis-new-title"
          type="text"
          value={streamTitle}
          onChange={(e) => setStreamTitle(e.target.value)}
          maxLength={500}
          placeholder="Short headline on the analysis card"
          className="w-full rounded-lg border border-sidebar-border bg-header-input px-3 py-2 text-sm text-dashboard-foreground placeholder:text-dashboard-foreground/45 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
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
        className="min-h-[82px] max-h-[123px] overflow-y-auto w-full min-w-0 rounded-lg border border-sidebar-border bg-header-input px-3 py-2.5 text-sm text-dashboard-foreground placeholder:text-dashboard-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary break-words antialiased [&:empty::before]:content-[attr(data-placeholder)] [&:empty::before]:text-dashboard-foreground/50 [&_*]:break-words [&_img]:max-w-[min(50%,480px)] [&_img]:w-auto [&_img]:h-auto [&_img]:object-contain [&_img]:rounded-lg [&_img]:cursor-pointer [&_img]:block [&_img]:my-2 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium [&_u]:underline"
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
        <AttachedImagesStrip
          items={images}
          onReorder={setImages}
          onRemove={(path) => setImagePendingRemove(path)}
        />
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
