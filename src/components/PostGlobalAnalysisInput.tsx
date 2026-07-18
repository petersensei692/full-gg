"use client";

import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { Bold, Italic, Underline, PenSquare, Check, ChevronDown } from "lucide-react";
import { useAnalysisEditorPaste } from "@/hooks/useAnalysisEditorPaste";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { AttachedImagesStrip } from "@/components/analysis/AttachedImagesStrip";
import { deleteStoredImage } from "@/lib/imageUpload";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { isHtmlEffectivelyEmpty } from "@/lib/html-empty";
import type { AssetConfig } from "@/types/asset";
import { clearDraft, loadDraftJson, saveDraftJson } from "@/lib/form-drafts";
import { getImageUrl } from "@/lib/imageUrls";

const ASSET_TYPE_ORDER = ["currency", "commodity", "stocks", "crypto"] as const;
const ASSET_TYPE_LABELS: Record<string, string> = {
  currency: "Currencies",
  commodity: "Commodities",
  stocks: "Stocks",
  crypto: "Crypto",
};

const CURRENCY_NAMES = new Set(["USD", "EUR", "GBP", "JPY", "CAD", "CHF", "AUD", "NZD"]);
const COMMODITY_NAMES = new Set(["XAU", "XAG"]);

function getAssetType(asset: AssetConfig): string {
  if (asset.type) {
    if (asset.type === "bond") return "stocks";
    return asset.type;
  }
  const name = (asset.label ?? asset.slug?.toUpperCase().replace(/-/g, " ") ?? "").toUpperCase();
  if (CURRENCY_NAMES.has(name)) return "currency";
  if (COMMODITY_NAMES.has(name)) return "commodity";
  if (name === "STOCKS") return "stocks";
  return "currency";
}

interface PostGlobalAnalysisInputProps {
  placeholder: string;
  assets: AssetConfig[];
  /** localStorage key for drafts (default: global-analysis-compose) */
  draftKey?: string;
  onCreated?: (payload: {
    notes: string;
    images: string[];
    imageNames?: string[];
    scope: "global" | string[];
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

type GlobalComposerDraftV1 = {
  v: 1;
  title: string;
  scopeMode: "global" | "assets";
  selectedAssetIds: string[];
  analysisType: string;
  html: string;
  imagePaths: string[];
};

export function PostGlobalAnalysisInput({
  placeholder,
  assets,
  onCreated,
  draftKey = "global-analysis-compose",
}: PostGlobalAnalysisInputProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [zoomedImageSrc, setZoomedImageSrc] = useState<string | null>(null);
  const [streamTitle, setStreamTitle] = useState("");
  const [scopeMode, setScopeMode] = useState<"global" | "assets">("global");
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [analysisType, setAnalysisType] = useState<string>("daily");
  const [assetsDropdownOpen, setAssetsDropdownOpen] = useState(false);
  const [images, setImages] = useState<Array<{ path: string; url: string }>>([]);
  const [editorBump, setEditorBump] = useState(0);
  const [imagePendingRemove, setImagePendingRemove] = useState<string | null>(null);
  const [draftHydrated, setDraftHydrated] = useState(() => false);

  useEffect(() => {
    const d = loadDraftJson<GlobalComposerDraftV1>(draftKey);
    if (d?.v === 1) {
      setStreamTitle(d.title ?? "");
      setScopeMode(d.scopeMode ?? "global");
      setSelectedAssetIds(new Set(d.selectedAssetIds ?? []));
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
    if (!draftHydrated) return;
    const t = window.setTimeout(() => {
      const html = editorRef.current?.innerHTML ?? "";
      const emptyBody =
        isHtmlEffectivelyEmpty(html) && !streamTitle.trim() && images.length === 0;
      if (emptyBody && (scopeMode === "global" || selectedAssetIds.size === 0)) {
        clearDraft(draftKey);
        return;
      }
      saveDraftJson(draftKey, {
        v: 1,
        title: streamTitle,
        scopeMode,
        selectedAssetIds: Array.from(selectedAssetIds),
        analysisType,
        html,
        imagePaths: images.map((i) => i.path),
      } satisfies GlobalComposerDraftV1);
    }, 450);
    return () => window.clearTimeout(t);
  }, [
    draftKey,
    draftHydrated,
    streamTitle,
    scopeMode,
    selectedAssetIds,
    analysisType,
    images,
    editorBump,
  ]);

  const { handlePaste } = useAnalysisEditorPaste({
    editorRef,
    onImageReady: (img) => {
      setImages((prev) => [...prev, img]);
      setEditorBump((n) => n + 1);
    },
  });

  const toggleAsset = useCallback((id: string) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const assetsByType = useMemo(() => {
    const m: Record<string, AssetConfig[]> = {};
    for (const t of ASSET_TYPE_ORDER) m[t] = [];
    for (const a of assets) {
      const t = getAssetType(a);
      if (!m[t]) m[t] = [];
      m[t].push(a);
    }
    return m;
  }, [assets]);

  const toggleSection = useCallback((type: string) => {
    const typeAssets = assetsByType[type] ?? [];
    const ids = typeAssets.map((a) => a.id).filter(Boolean) as string[];
    if (ids.length === 0) return;
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      const allSelected = ids.every((id) => next.has(id));
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }, [assetsByType]);

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
    const html = editorRef.current?.innerHTML ?? "";
    if (isHtmlEffectivelyEmpty(html) && images.length === 0) return;
    const scope: "global" | string[] =
      scopeMode === "global" ? "global" : Array.from(selectedAssetIds);
    if (scopeMode === "assets" && scope.length === 0) return;
    onCreated?.({
      notes: html,
      images: images.map((img) => img.path),
      scope,
      analysisType,
      title: streamTitle.trim() ? streamTitle.trim() : undefined,
    });
    if (editorRef.current) editorRef.current.innerHTML = "";
    setImages([]);
    setStreamTitle("");
    setEditorBump((n) => n + 1);
    clearDraft(draftKey);
  }, [scopeMode, selectedAssetIds, analysisType, streamTitle, onCreated, images, draftKey]);

  const scopeOk =
    scopeMode === "global" || (scopeMode === "assets" && selectedAssetIds.size > 0);
  const hasBody =
    !isHtmlEffectivelyEmpty(editorRef.current?.innerHTML ?? "") || images.length > 0;
  const canCreate = scopeOk && hasBody;

  return (
    <>
    <div className="rounded-xl border border-sidebar-border bg-sidebar/50 p-3 mt-6">
      <div className="space-y-1 mb-2">
        <label htmlFor="global-analysis-new-title" className="text-xs font-medium text-dashboard-foreground/70">
          Title <span className="font-normal text-dashboard-foreground/50">(optional)</span>
        </label>
        <input
          id="global-analysis-new-title"
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
        onPaste={handlePaste}
        onInput={() => setEditorBump((n) => n + 1)}
        onClick={handleEditorClick}
        className="min-h-[82px] max-h-[123px] overflow-y-auto w-full min-w-0 rounded-lg border border-sidebar-border bg-header-input px-3 py-2.5 text-sm text-dashboard-foreground placeholder:text-dashboard-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary break-words antialiased [&:empty::before]:content-[attr(data-placeholder)] [&:empty::before]:text-dashboard-foreground/50 [&_*]:break-words [&_img]:max-w-[min(50%,480px)] [&_img]:w-auto [&_img]:h-auto [&_img]:object-contain [&_img]:rounded-lg [&_img]:cursor-pointer [&_img]:block [&_img]:my-2 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium [&_u]:underline"
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
                  <div className="absolute left-0 bottom-full z-20 mb-1 max-h-[320px] w-64 overflow-y-auto rounded-lg border border-sidebar-border bg-sidebar p-2 shadow-lg">
                    {ASSET_TYPE_ORDER.map((type) => {
                      const typeAssets = assetsByType[type] ?? [];
                      const typeLabel = ASSET_TYPE_LABELS[type] ?? type;
                      const typeIds = typeAssets.map((a) => a.id).filter(Boolean) as string[];
                      const allSelected = typeIds.length > 0 && typeIds.every((id) => selectedAssetIds.has(id));
                      const someSelected = typeIds.some((id) => selectedAssetIds.has(id));
                      return (
                        <div key={type} className="mb-2 last:mb-0">
                          <button
                            type="button"
                            onClick={() => toggleSection(type)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-dashboard-foreground hover:bg-sidebar-hover"
                            title={allSelected ? "Deselect all" : "Select all"}
                          >
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                allSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : someSelected
                                    ? "border-primary bg-primary/30 text-primary"
                                    : "border-sidebar-border bg-sidebar"
                              }`}
                            >
                              {allSelected ? <Check className="h-3 w-3" /> : null}
                            </span>
                            {typeLabel}
                            {typeAssets.length === 0 && (
                              <span className="text-sidebar-muted font-normal">(empty)</span>
                            )}
                          </button>
                          <div className="mt-0.5 pl-6 space-y-0.5">
                            {typeAssets.length === 0 ? (
                              <div className="py-1 text-xs text-sidebar-muted">No assets</div>
                            ) : (
                              typeAssets.map((asset) => {
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
                                    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-dashboard-foreground hover:bg-sidebar-hover cursor-pointer select-none"
                                  >
                                    <span
                                      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border pointer-events-none ${
                                        checked
                                          ? "border-primary bg-primary text-primary-foreground"
                                          : "border-sidebar-border bg-sidebar"
                                      }`}
                                    >
                                      {checked ? <Check className="h-2.5 w-2.5" /> : null}
                                    </span>
                                    {asset.label}
                                  </label>
                                );
                              })
                            )}
                          </div>
                        </div>
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
              <img src={zoomedImageSrc} alt="Zoomed" className="max-w-full max-h-full w-auto h-auto object-contain" />
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
