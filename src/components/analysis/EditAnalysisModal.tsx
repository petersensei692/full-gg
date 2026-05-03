"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Bold, Italic, Underline, Check, ChevronDown } from "lucide-react";
import { useAnalysisEditorPaste } from "@/hooks/useAnalysisEditorPaste";
import { getImageUrl } from "@/lib/imageUrls";
import { EventImageThumb } from "@/components/analysis/EventImageThumb";
import { deleteStoredImage } from "@/lib/imageUpload";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import type { AssetConfig } from "@/types/asset";

const ANALYSIS_TYPES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "qoq", label: "QoQ" },
  { value: "yearly", label: "Yearly" },
] as const;

const ASSET_TYPE_ORDER = ["currency", "commodity", "stocks", "crypto", "bond"] as const;
const ASSET_TYPE_LABELS: Record<string, string> = {
  currency: "Currencies",
  commodity: "Commodities",
  stocks: "Stocks",
  crypto: "Crypto",
  bond: "Bonds",
};

const CURRENCY_NAMES = new Set(["USD", "EUR", "GBP", "JPY", "CAD", "CHF", "AUD", "NZD"]);
const COMMODITY_NAMES = new Set(["XAU", "XAG"]);

function getAssetType(asset: AssetConfig): string {
  if (asset.type) return asset.type;
  const name = (asset.label ?? asset.slug?.toUpperCase().replace(/-/g, " ") ?? "").toUpperCase();
  if (CURRENCY_NAMES.has(name)) return "currency";
  if (COMMODITY_NAMES.has(name)) return "commodity";
  if (name === "STOCKS") return "stocks";
  return "currency";
}

export type EditAnalysisSubmitPayload = {
  notes: string;
  images: string[];
  analysisType?: string;
  scope?: "global" | string[];
};

interface EditAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialNotes: string;
  initialImages: string[];
  onSubmit: (payload: EditAnalysisSubmitPayload) => void;
  /** When set, show analysis type selector (asset + global analysis) */
  initialAnalysisType?: string;
  /** When set, show global scope editor (global analysis only) */
  globalScopeEditor?: {
    initialScope: "global" | string[];
    assets: AssetConfig[];
  };
}

export function EditAnalysisModal({
  open,
  onOpenChange,
  initialNotes,
  initialImages,
  onSubmit,
  initialAnalysisType,
  globalScopeEditor,
}: EditAnalysisModalProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [analysisType, setAnalysisType] = useState("daily");
  const [scopeMode, setScopeMode] = useState<"global" | "assets">("global");
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [assetsDropdownOpen, setAssetsDropdownOpen] = useState(false);
  const [scopeError, setScopeError] = useState("");
  const [imagePendingRemove, setImagePendingRemove] = useState<string | null>(null);

  const assetsWithIds = useMemo(
    () => (globalScopeEditor?.assets ?? []).filter((a) => !!a.id),
    [globalScopeEditor?.assets]
  );

  const assetsByType = useMemo(() => {
    const m: Record<string, AssetConfig[]> = {};
    for (const t of ASSET_TYPE_ORDER) m[t] = [];
    for (const a of assetsWithIds) {
      const t = getAssetType(a);
      if (!m[t]) m[t] = [];
      m[t].push(a);
    }
    return m;
  }, [assetsWithIds]);

  useEffect(() => {
    if (!open) return;
    setImages(initialImages);
    setAnalysisType(initialAnalysisType ?? "daily");
    setScopeError("");
    if (globalScopeEditor) {
      const init = globalScopeEditor.initialScope;
      if (init === "global") {
        setScopeMode("global");
        setSelectedAssetIds(new Set());
      } else {
        setScopeMode("assets");
        setSelectedAssetIds(new Set(init.filter(Boolean)));
      }
    } else {
      setScopeMode("global");
      setSelectedAssetIds(new Set());
    }
    const applyInitial = () => {
      if (editorRef.current) {
        editorRef.current.innerHTML = initialNotes;
      }
    };
    applyInitial();
    const t = setTimeout(applyInitial, 0);
    const t2 = setTimeout(applyInitial, 50);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [open, initialNotes, initialImages, initialAnalysisType, globalScopeEditor]);

  const { handlePaste } = useAnalysisEditorPaste({
    editorRef,
    onImageReady: (img) => setImages((prev) => [...prev, img.path]),
  });

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

  const toggleAsset = useCallback((id: string) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSection = useCallback(
    (type: string) => {
      const typeAssets = assetsByType[type] ?? [];
      const ids = typeAssets.map((a) => a.id!).filter(Boolean);
      if (ids.length === 0) return;
      setSelectedAssetIds((prev) => {
        const next = new Set(prev);
        const allSelected = ids.every((id) => next.has(id));
        if (allSelected) ids.forEach((id) => next.delete(id));
        else ids.forEach((id) => next.add(id));
        return next;
      });
    },
    [assetsByType]
  );

  const handleSave = () => {
    const notes = editorRef.current?.innerHTML?.trim() ?? "";
    setScopeError("");
    if (globalScopeEditor) {
      const scope: "global" | string[] =
        scopeMode === "global" ? "global" : Array.from(selectedAssetIds);
      if (scopeMode === "assets" && scope.length === 0) {
        setScopeError("Select at least one asset, or choose Global.");
        return;
      }
      onSubmit({
        notes,
        images,
        analysisType,
        scope,
      });
    } else if (initialAnalysisType !== undefined) {
      onSubmit({ notes, images, analysisType });
    } else {
      onSubmit({ notes, images });
    }
    onOpenChange(false);
  };

  const showTypeSelect = initialAnalysisType !== undefined;
  const showScope = !!globalScopeEditor;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={true}
        containToMain={true}
        className="max-h-[85dvh] flex flex-col items-stretch justify-start overflow-hidden bg-sidebar border border-sidebar-border rounded-xl p-0 shadow-xl data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100"
      >
        <div className="scrollbar-modal flex flex-col min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="space-y-4 min-w-0 overflow-x-hidden p-6">
            <h3 className="text-lg font-semibold text-dashboard-foreground">Edit Analysis</h3>

            {(showTypeSelect || showScope) && (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar/60 px-3 py-2.5">
                {showTypeSelect && (
                  <label className="flex items-center gap-2 text-sm text-dashboard-foreground">
                    <span className="text-dashboard-foreground/70 shrink-0">Type</span>
                    <select
                      value={analysisType}
                      onChange={(e) => setAnalysisType(e.target.value)}
                      className="rounded-lg border border-sidebar-border bg-header-input px-3 py-1.5 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      aria-label="Analysis type"
                    >
                      {ANALYSIS_TYPES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {showScope && (
                  <div className="flex flex-wrap items-center gap-2">
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
                            <div className="absolute left-0 top-full z-20 mt-1 max-h-[280px] w-64 overflow-y-auto rounded-lg border border-sidebar-border bg-sidebar p-2 shadow-lg">
                              {ASSET_TYPE_ORDER.map((type) => {
                                const typeAssets = assetsByType[type] ?? [];
                                const typeLabel = ASSET_TYPE_LABELS[type] ?? type;
                                const typeIds = typeAssets.map((a) => a.id!);
                                const allSelected =
                                  typeIds.length > 0 && typeIds.every((id) => selectedAssetIds.has(id));
                                const someSelected = typeIds.some((id) => selectedAssetIds.has(id));
                                return (
                                  <div key={type} className="mb-2 last:mb-0">
                                    <button
                                      type="button"
                                      onClick={() => toggleSection(type)}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-dashboard-foreground hover:bg-sidebar-hover"
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
                                    </button>
                                    <div className="mt-0.5 pl-6 space-y-0.5">
                                      {typeAssets.map((asset) => {
                                        const id = asset.id!;
                                        const checked = selectedAssetIds.has(id);
                                        return (
                                          <label
                                            key={id}
                                            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-dashboard-foreground hover:bg-sidebar-hover cursor-pointer select-none"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={checked}
                                              onChange={() => toggleAsset(id)}
                                              className="sr-only"
                                            />
                                            <span
                                              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
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
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {scopeError && <p className="text-sm text-red-400">{scopeError}</p>}

            <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-sidebar-border bg-sidebar/80 px-2 py-1.5">
              <button type="button" onMouseDown={preventFocusLoss} onClick={() => applyFormat("bold")} className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors" aria-label="Bold" title="Bold"><Bold className="h-4 w-4" /></button>
              <button type="button" onMouseDown={preventFocusLoss} onClick={() => applyFormat("italic")} className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors" aria-label="Italic" title="Italic"><Italic className="h-4 w-4" /></button>
              <button type="button" onMouseDown={preventFocusLoss} onClick={() => applyFormat("underline")} className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors" aria-label="Underline" title="Underline"><Underline className="h-4 w-4" /></button>
              <span className="w-px h-4 bg-sidebar-border mx-0.5" aria-hidden />
              <button type="button" onMouseDown={preventFocusLoss} onClick={() => applyHeading("h1")} className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors text-xs font-bold" aria-label="Heading 1" title="Heading 1">H1</button>
              <button type="button" onMouseDown={preventFocusLoss} onClick={() => applyHeading("h2")} className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors text-xs font-semibold" aria-label="Heading 2" title="Heading 2">H2</button>
              <button type="button" onMouseDown={preventFocusLoss} onClick={() => applyHeading("h3")} className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors text-xs font-medium" aria-label="Heading 3" title="Heading 3">H3</button>
              <button type="button" onMouseDown={preventFocusLoss} onClick={() => applyHeading("p")} className="rounded p-1.5 text-dashboard-foreground/60 hover:bg-sidebar-hover hover:text-dashboard-foreground transition-colors text-xs" aria-label="Paragraph" title="Paragraph">P</button>
            </div>
            <div
              ref={editorRef}
              contentEditable
              spellCheck={false}
              data-placeholder="Update your analysis notes..."
              onPaste={handlePaste}
              className="min-h-[120px] max-h-[300px] w-full min-w-0 overflow-y-auto overflow-x-hidden rounded-b-lg rounded-t-none border border-sidebar-border bg-header-input px-3 py-2.5 text-sm text-dashboard-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary break-words antialiased [&:empty::before]:content-[attr(data-placeholder)] [&:empty::before]:text-dashboard-foreground/50 [&_*]:break-words [&_img]:max-w-[min(50%,480px)] [&_img]:max-h-[200px] [&_img]:w-auto [&_img]:h-auto [&_img]:object-contain [&_img]:rounded-lg [&_img]:cursor-pointer [&_img]:block [&_img]:my-2 [&_u]:underline [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium"
              suppressContentEditableWarning
              suppressHydrationWarning
            />
            {images.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-dashboard-foreground/70">Attached images — click to preview</p>
                <div className="flex flex-wrap gap-3">
                  {images.map((path) => (
                    <div key={path} className="relative inline-block">
                      <EventImageThumb
                        src={getImageUrl(path)}
                        alt="Analysis attachment"
                        imgClassName="h-24 max-w-[200px] rounded-lg border border-sidebar-border object-contain bg-black/10"
                      />
                      <button
                        type="button"
                        onClick={() => setImagePendingRemove(path)}
                        className="absolute -top-2 -right-2 z-[2] rounded-full bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center shadow"
                        aria-label="Remove image"
                        title="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2 border-t border-sidebar-border">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg border border-sidebar-border px-4 py-2 text-sm font-medium text-dashboard-foreground hover:bg-sidebar-hover transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <ConfirmDeleteDialog
      open={imagePendingRemove != null}
      onOpenChange={(o) => !o && setImagePendingRemove(null)}
      title="Remove this image?"
      description="It will be removed from this draft and deleted from storage. Save the analysis to persist changes."
      details={imagePendingRemove ? `Storage path: ${imagePendingRemove}` : undefined}
      confirmLabel="Remove image"
      onConfirm={async () => {
        if (imagePendingRemove) {
          const path = imagePendingRemove;
          setImages((prev) => prev.filter((p) => p !== path));
          await deleteStoredImage(path).catch(() => undefined);
        }
      }}
    />
    </>
  );
}
