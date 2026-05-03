import type { DateRange } from "@/components/analysis/DateRangePicker";

/** Serializable snapshot for localStorage (local calendar days, no UTC shift). */
export type AnalysisStreamFiltersStored = {
  analysisFilter: string;
  favoritesOnly: boolean;
  dateRange: {
    sy: number;
    sm: number;
    sd: number;
    ey: number;
    em: number;
    ed: number;
  } | null;
  /** Asset analysis stream: hide analyses whose scope is full GLOBAL */
  hideGlobalScoped?: boolean;
  /** Global analysis page: show only entries with scope === "global" */
  globalOnly?: boolean;
};

const GLOBAL_KEY = "gg:fundamentalAnalysisStream:global";
const FAV_WIN_GLOBAL_KEY = "gg:fundamentalAnalysisFavWindow:global";

function assetKey(assetId: string): string {
  return `gg:fundamentalAnalysisStream:asset:${assetId}`;
}

function favWinAssetKey(assetId: string): string {
  return `gg:fundamentalAnalysisFavWindow:asset:${assetId}`;
}

/** Favorites popup: only type + date range (stream is always favorites). */
export type FavoritesWindowStreamFiltersStored = Omit<AnalysisStreamFiltersStored, "favoritesOnly" | "globalOnly">;

export function serializeDateRangeForStorage(range: DateRange): AnalysisStreamFiltersStored["dateRange"] {
  if (!range) return null;
  const s = range.start;
  const e = range.end;
  return {
    sy: s.getFullYear(),
    sm: s.getMonth(),
    sd: s.getDate(),
    ey: e.getFullYear(),
    em: e.getMonth(),
    ed: e.getDate(),
  };
}

export function deserializeDateRangeFromStorage(
  raw: AnalysisStreamFiltersStored["dateRange"],
): DateRange {
  if (!raw) return null;
  return {
    start: new Date(raw.sy, raw.sm, raw.sd),
    end: new Date(raw.ey, raw.em, raw.ed),
  };
}

function safeParse(raw: string | null): Partial<AnalysisStreamFiltersStored> | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return null;
    return o as Partial<AnalysisStreamFiltersStored>;
  } catch {
    return null;
  }
}

export function loadGlobalAnalysisStreamFilters(): AnalysisStreamFiltersStored | null {
  if (typeof window === "undefined") return null;
  const p = safeParse(localStorage.getItem(GLOBAL_KEY));
  if (!p) return null;
  return normalizePartial(p);
}

export function saveGlobalAnalysisStreamFilters(f: AnalysisStreamFiltersStored): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GLOBAL_KEY, JSON.stringify(f));
}

export function loadAssetAnalysisStreamFilters(assetId: string): AnalysisStreamFiltersStored | null {
  if (typeof window === "undefined" || !assetId) return null;
  const p = safeParse(localStorage.getItem(assetKey(assetId)));
  if (!p) return null;
  return normalizePartial(p);
}

export function saveAssetAnalysisStreamFilters(assetId: string, f: AnalysisStreamFiltersStored): void {
  if (typeof window === "undefined" || !assetId) return;
  localStorage.setItem(assetKey(assetId), JSON.stringify(f));
}

function normalizeFavWindowPartial(p: Partial<AnalysisStreamFiltersStored>): FavoritesWindowStreamFiltersStored {
  const analysisFilter = typeof p.analysisFilter === "string" ? p.analysisFilter : "all";
  const hideGlobalScoped = typeof p.hideGlobalScoped === "boolean" ? p.hideGlobalScoped : false;
  let dateRange: AnalysisStreamFiltersStored["dateRange"] = null;
  if (p.dateRange && typeof p.dateRange === "object") {
    const r = p.dateRange as Record<string, unknown>;
    const nums = ["sy", "sm", "sd", "ey", "em", "ed"].every(
      (k) => typeof r[k] === "number" && Number.isFinite(r[k] as number),
    );
    if (nums) {
      dateRange = {
        sy: r.sy as number,
        sm: r.sm as number,
        sd: r.sd as number,
        ey: r.ey as number,
        em: r.em as number,
        ed: r.ed as number,
      };
    }
  }
  return { analysisFilter, dateRange, hideGlobalScoped };
}

export function loadFavoritesWindowGlobalFilters(): FavoritesWindowStreamFiltersStored | null {
  if (typeof window === "undefined") return null;
  const p = safeParse(localStorage.getItem(FAV_WIN_GLOBAL_KEY));
  if (!p) return null;
  return normalizeFavWindowPartial(p);
}

export function saveFavoritesWindowGlobalFilters(f: FavoritesWindowStreamFiltersStored): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FAV_WIN_GLOBAL_KEY, JSON.stringify(f));
}

export function loadFavoritesWindowAssetFilters(assetId: string): FavoritesWindowStreamFiltersStored | null {
  if (typeof window === "undefined" || !assetId) return null;
  const p = safeParse(localStorage.getItem(favWinAssetKey(assetId)));
  if (!p) return null;
  return normalizeFavWindowPartial(p);
}

export function saveFavoritesWindowAssetFilters(assetId: string, f: FavoritesWindowStreamFiltersStored): void {
  if (typeof window === "undefined" || !assetId) return;
  localStorage.setItem(favWinAssetKey(assetId), JSON.stringify(f));
}

function normalizePartial(p: Partial<AnalysisStreamFiltersStored>): AnalysisStreamFiltersStored {
  const analysisFilter = typeof p.analysisFilter === "string" ? p.analysisFilter : "all";
  const favoritesOnly = typeof p.favoritesOnly === "boolean" ? p.favoritesOnly : false;
  const hideGlobalScoped = typeof p.hideGlobalScoped === "boolean" ? p.hideGlobalScoped : false;
  const globalOnly = typeof p.globalOnly === "boolean" ? p.globalOnly : false;
  let dateRange: AnalysisStreamFiltersStored["dateRange"] = null;
  if (p.dateRange && typeof p.dateRange === "object") {
    const r = p.dateRange as Record<string, unknown>;
    const nums = ["sy", "sm", "sd", "ey", "em", "ed"].every(
      (k) => typeof r[k] === "number" && Number.isFinite(r[k] as number),
    );
    if (nums) {
      dateRange = {
        sy: r.sy as number,
        sm: r.sm as number,
        sd: r.sd as number,
        ey: r.ey as number,
        em: r.em as number,
        ed: r.ed as number,
      };
    }
  }
  return { analysisFilter, favoritesOnly, dateRange, hideGlobalScoped, globalOnly };
}
