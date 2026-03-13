"use client";

import { useRef, useState, useCallback } from "react";
import { Bold, Italic, Underline, PenSquare, Check, ChevronDown } from "lucide-react";
import { useImagePaste } from "@/hooks/useImagePaste";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { deleteStoredImage } from "@/lib/imageUpload";
import type { AssetConfig } from "@/types/asset";

interface PostGlobalAnalysisInputProps {
  placeholder: string;
  assets: AssetConfig[];
  onCreated?: (payload: {
    notes: string;
    images: string[];
    imageNames?: string[];
    scope: "global" | string[];
    analysisType: string;
  }) => void;
}

const ANALYSIS_TYPES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "qoq", label: "QoQ" },
  { value: "yearly", label: "Yearly" },
] as const;

export function PostGlobalAnalysisInput({
  placeholder,
  assets,
  onCreated,
}: PostGlobalAnalysisInputProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [zoomedImageSrc, setZoomedImageSrc] = useState<string | null>(null);
  const [scopeMode, setScopeMode] = useState<"global" | "assets">("global");
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [analysisType, setAnalysisType] = useState<string>("daily");
  const [assetsDropdownOpen, setAssetsDropdownOpen] = useState(false);
  const [images, setImages] = useState<Array<{ path: string; url: string }>>([]);

  const { handlePaste } = useImagePaste({
    editorRef,
    onImageReady: (img) => setImages((prev) => [...prev, img]),
  });

  const toggleAsset = useCallback((id: string) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const applyFormat = useCallback((command: "bold" | "italic" | "underline") => {
    document.execCommand(command, false);
    editorRef.current?.focus();
  }, []);

  const applyHeading = useCallback((block: "h1" | "h2" | "h3" | "p") => {
    document.execCommand("formatBlock", false, block);
    editorRef.current?.focus();
  }, []);

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
    const html = editorRef.current?.innerHTML?.trim() ?? "";
    if (!html && images.length === 0) return;
    const scope: "global" | string[] =
      scopeMode === "global" ? "global" : Array.from(selectedAssetIds);
    if (scopeMode === "assets" && scope.length === 0) return;
    onCreated?.({
      notes: html,
      images: images.map((img) => img.path),
      scope,
      analysisType,
    });
    if (editorRef.current) editorRef.current.innerHTML = "";
    setImages([]);
  }, [scopeMode, selectedAssetIds, analysisType, onCreated, images]);

  const canCreate =
    scopeMode === "global" ||
    (scopeMode === "assets" && selectedAssetIds.size > 0);

  return (
    <div className="rounded-xl border border-sidebar-border bg-sidebar/50 p-3 mt-6">
      <div
        ref={editorRef}
        contentEditable
        spellCheck={false}
        data-placeholder={placeholder}
        role="textbox"
        aria-multiline="true"
        onPaste={handlePaste}
        onClick={handleEditorClick}
        className="min-h-[82px] max-h-[123px] overflow-y-auto w-full min-w-0 rounded-lg border border-sidebar-border bg-header-input px-3 py-2.5 text-sm text-dashboard-foreground placeholder:text-dashboard-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary break-words [&:empty::before]:content-[attr(data-placeholder)] [&:empty::before]:text-dashboard-foreground/50 [&_*]:break-words [&_img]:max-w-[50%] [&_img]:w-[50%] [&_img]:h-auto [&_img]:object-contain [&_img]:rounded-lg [&_img]:cursor-pointer [&_img]:block [&_img]:my-2 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium [&_u]:underline"
        suppressContentEditableWarning
        suppressHydrationWarning
      />

      <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={() => applyFormat("bold")}
            className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors"
            aria-label="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={() => applyFormat("italic")}
            className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors"
            aria-label="Italic"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={() => applyFormat("underline")}
            className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors"
            aria-label="Underline"
          >
            <Underline className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={() => applyHeading("h1")}
            className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover text-xs font-bold"
          >
            H1
          </button>
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={() => applyHeading("h2")}
            className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover text-xs font-semibold"
          >
            H2
          </button>
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={() => applyHeading("h3")}
            className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover text-xs font-medium"
          >
            H3
          </button>
          <button
            type="button"
            onMouseDown={preventFocusLoss}
            onClick={() => applyHeading("p")}
            className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover text-xs"
            aria-label="Normal text"
            title="Normal text"
          >
            P
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-dashboard-foreground/70 shrink-0">Scope</span>
          <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
            <button
              type="button"
              role="radio"
              aria-checked={scopeMode === "global"}
              onClick={() => setScopeMode("global")}
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                scopeMode === "global"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-sidebar-border bg-sidebar"
              }`}
            >
              {scopeMode === "global" ? <Check className="h-3 w-3" /> : null}
            </button>
            <span className="text-sm text-dashboard-foreground">Global</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
            <button
              type="button"
              role="radio"
              aria-checked={scopeMode === "assets"}
              onClick={() => setScopeMode("assets")}
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                scopeMode === "assets"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-sidebar-border bg-sidebar"
              }`}
            >
              {scopeMode === "assets" ? <Check className="h-3 w-3" /> : null}
            </button>
            <span className="text-sm text-dashboard-foreground">Select assets</span>
          </label>
          {scopeMode === "assets" && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setAssetsDropdownOpen((o) => !o)}
                className="flex items-center gap-1 rounded-lg border border-sidebar-border bg-sidebar px-2.5 py-1.5 text-sm text-dashboard-foreground hover:bg-sidebar-hover"
              >
                {selectedAssetIds.size > 0 ? `${selectedAssetIds.size} selected` : "Assets"}
                <ChevronDown className="h-4 w-4" />
              </button>
              {assetsDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    aria-hidden
                    onClick={() => setAssetsDropdownOpen(false)}
                  />
                  <div className="absolute left-0 bottom-full z-20 mb-1 max-h-[180px] w-56 overflow-y-auto rounded-lg border border-sidebar-border bg-sidebar p-2 shadow-lg">
                    {assets.map((asset) => {
                      const id = asset.id ?? asset.slug;
                      const checked = selectedAssetIds.has(id);
                      return (
                        <label
                          key={id}
                          role="button"
                          tabIndex={0}
                          aria-pressed={checked}
                          onClick={(e) => {
                            e.preventDefault();
                            toggleAsset(id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleAsset(id);
                            }
                          }}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-dashboard-foreground hover:bg-sidebar-hover cursor-pointer select-none"
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border pointer-events-none ${
                              checked
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-sidebar-border bg-sidebar"
                            }`}
                          >
                            {checked ? <Check className="h-3 w-3" /> : null}
                          </span>
                          {asset.label}
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
          <select
            value={analysisType}
            onChange={(e) => setAnalysisType(e.target.value)}
            className="rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
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
            disabled={!canCreate}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors shrink-0"
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
                  className="h-20 w-28 object-cover rounded-lg border border-sidebar-border hover:border-primary/50"
                />
              </button>
              <button
                type="button"
                onClick={async () => {
                  setImages((prev) => prev.filter((p) => p.path !== img.path));
                  await deleteStoredImage(img.path).catch(() => undefined);
                }}
                className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center shadow"
                aria-label="Remove image"
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
              <img src={zoomedImageSrc} alt="Zoomed" className="max-w-full max-h-full w-auto h-auto object-contain" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
