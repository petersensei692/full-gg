"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import {
  ASSET_CATEGORY_LABEL,
  ASSET_CATEGORY_ORDER,
  type AssetCategory,
  normalizeAssetCategory,
} from "@/lib/asset-category";
import { eventTouchesDateRangePickerPanel } from "@/lib/date-range-picker-dom";

export interface ScopeAssetOption {
  id: string;
  name: string;
  /** When omitted, derived via {@link normalizeAssetCategory}. */
  category?: AssetCategory;
}

interface AnalysisScopeFilterDropdownProps {
  assets: ScopeAssetOption[];
  includeGlobalFull: boolean;
  onIncludeGlobalFullChange: (next: boolean) => void;
  checkedAssetIds: ReadonlySet<string>;
  onToggleAsset: (assetId: string, checked: boolean) => void;
  /** Turn on global + every listed asset. */
  onSelectAll?: () => void;
  /** Turn off global + every listed asset. */
  onClearAll?: () => void;
  /**
   * When `false`, the panel is not portaled to `document.body` (for use inside nested dialogs).
   * @default true
   */
  portal?: boolean;
  /** Notified when the scope list opens or closes (parent dialogs can suppress Radix dismiss). */
  onDropdownOpenChange?: (open: boolean) => void;
}

function summaryLabel(
  includeGlobalFull: boolean,
  checkedAssetIds: ReadonlySet<string>,
  assets: ScopeAssetOption[],
): string {
  const assetNames = assets
    .filter((a) => checkedAssetIds.has(a.id))
    .map((a) => a.name);
  const parts: string[] = [];
  if (includeGlobalFull) parts.push("Global");
  parts.push(...assetNames);
  if (parts.length === 0) return "Nothing selected";
  const allAssetsChecked =
    assets.length > 0 && assets.every((a) => checkedAssetIds.has(a.id));
  if (includeGlobalFull && allAssetsChecked) return "All sources";
  return parts.join(" · ");
}

export function AnalysisScopeFilterDropdown({
  assets,
  includeGlobalFull,
  onIncludeGlobalFullChange,
  checkedAssetIds,
  onToggleAsset,
  onSelectAll,
  onClearAll,
  portal = true,
  onDropdownOpenChange,
}: AnalysisScopeFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  const groupedSections = useMemo(() => {
    const byCat = new Map<AssetCategory, ScopeAssetOption[]>();
    for (const a of assets) {
      const cat = a.category ?? normalizeAssetCategory(null);
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat)!.push(a);
    }
    for (const list of byCat.values()) {
      list.sort((x, y) => x.name.localeCompare(y.name));
    }
    return ASSET_CATEGORY_ORDER.filter((key) => byCat.has(key)).map((key) => ({
      key,
      label: ASSET_CATEGORY_LABEL[key],
      items: byCat.get(key)!,
    }));
  }, [assets]);

  const label = summaryLabel(includeGlobalFull, checkedAssetIds, assets);

  const updatePos = useCallback(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const width = Math.min(320, Math.max(260, r.width));
    let left = r.left;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - 8 - width);
    if (left < 8) left = 8;
    let top = r.bottom + 6;
    const spaceBelow = window.innerHeight - top - 16;
    if (spaceBelow < 120) {
      top = Math.max(8, r.top - Math.min(280, window.innerHeight * 0.4) - 6);
    }
    setPanelPos({ top, left, width });
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    updatePos();
    const onResize = () => updatePos();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, updatePos]);

  useEffect(() => {
    onDropdownOpenChange?.(open);
  }, [open, onDropdownOpenChange]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | PointerEvent) => {
      if (eventTouchesDateRangePickerPanel(e)) return;
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [open]);

  const showBulk = onSelectAll != null && onClearAll != null;

  const panelInner =
    open &&
    panelPos && (
      <div
        ref={(el) => {
          panelRef.current = el;
        }}
        data-analysis-scope-filter-panel="true"
        className={`fixed isolate overflow-hidden rounded-lg border border-sidebar-border bg-sidebar p-3 shadow-xl ${
          portal ? "z-[25000]" : "z-[200]"
        }`}
        style={{
          top: panelPos.top,
          left: panelPos.left,
          width: panelPos.width,
        }}
        role="listbox"
      >
        <label className="flex cursor-pointer items-center gap-2 border-b border-sidebar-border pb-2 mb-2">
          <input
            type="checkbox"
            checked={includeGlobalFull}
            onChange={(e) => onIncludeGlobalFullChange(e.target.checked)}
            className="h-4 w-4 rounded border-sidebar-border"
          />
          <span className="text-sm font-medium text-dashboard-foreground">Global</span>
        </label>

        {showBulk ? (
          <div className="flex gap-2 mb-3 border-b border-sidebar-border pb-2">
            <button
              type="button"
              onClick={() => onSelectAll()}
              className="flex-1 rounded-md border border-sidebar-border bg-sidebar px-2 py-1.5 text-xs font-medium text-dashboard-foreground hover:bg-sidebar-hover"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => onClearAll()}
              className="flex-1 rounded-md border border-sidebar-border bg-sidebar px-2 py-1.5 text-xs font-medium text-dashboard-foreground hover:bg-sidebar-hover"
            >
              Clear all
            </button>
          </div>
        ) : null}

        {/* Target ~3 asset checkbox rows visible; category headings scroll with the list */}
        <div className="max-h-32 overflow-y-auto overscroll-y-contain pr-1 [scrollbar-gutter:stable]">
          <div className="space-y-3">
            {groupedSections.map(({ key, label: sectionLabel, items }) => (
              <div key={key}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-dashboard-foreground/55 mb-1.5">
                  {sectionLabel}
                </p>
                <ul className="space-y-1.5">
                  {items.map((a) => (
                    <li key={a.id}>
                      <label className="flex min-h-[1.75rem] cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checkedAssetIds.has(a.id)}
                          onChange={(e) => onToggleAsset(a.id, e.target.checked)}
                          className="h-4 w-4 shrink-0 rounded border-sidebar-border"
                        />
                        <span className="text-sm leading-tight text-dashboard-foreground">{a.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

  const panel =
    panelInner &&
    (portal && typeof document !== "undefined"
      ? createPortal(panelInner, document.body)
      : panelInner);

  return (
    <div className="relative w-full">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-sidebar-border bg-sidebar px-3 py-2 text-left text-sm text-dashboard-foreground hover:bg-sidebar-hover"
      >
        <span className="min-w-0 truncate">{label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-dashboard-foreground/60 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {panel}
    </div>
  );
}
