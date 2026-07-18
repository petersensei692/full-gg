import type { StreamEntry } from "@/types/asset";
import type { AllAnalysisItem } from "@/types/api";

const ANALYSIS_TYPE_TO_TAG: Record<
  string,
  { tag: StreamEntry["tag"]; tagColor: StreamEntry["tagColor"] }
> = {
  daily: { tag: "INTRADAY UPDATE", tagColor: "red" },
  weekly: { tag: "WEEKLY OUTLOOK", tagColor: "blue" },
  monthly: { tag: "MONTHLY OUTLOOK", tagColor: "yellow" },
  qoq: { tag: "QoQ OUTLOOK", tagColor: "green" },
  yearly: { tag: "YEARLY OUTLOOK", tagColor: "maroon" },
  tradeNote: { tag: "TRADE NOTE", tagColor: "blue" },
};

export function extractAnalysisTypeFromNotes(notes: string): {
  cleanedNotes: string;
  analysisType: string;
} {
  const match = notes.match(/<!--analysis-type:([^>]*)-->/);
  const analysisType = match?.[1]?.trim() || "daily";
  const cleanedNotes = notes.replace(/<!--analysis-type:[^>]*-->/, "").trim();
  return { cleanedNotes, analysisType };
}

export function formatAnalysisTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Map API rows to stream entries (oldest first). */
export function mapAllAnalysisItemsToStreamEntries(rows: AllAnalysisItem[]): StreamEntry[] {
  const entries = rows.map((r) => {
    const createdAt = new Date(r.createdAt).getTime();
    const { cleanedNotes, analysisType } = extractAnalysisTypeFromNotes(r.notes ?? "");
    const { tag, tagColor } =
      ANALYSIS_TYPE_TO_TAG[analysisType] ??
      ({ tag: "INTRADAY UPDATE" as const, tagColor: "red" as const });
    return {
      id: r.id,
      author: "You",
      time: formatAnalysisTime(r.createdAt),
      tag,
      tagColor,
      title: r.title ?? null,
      content: cleanedNotes,
      createdAt,
      analysisType,
      images: r.images ?? [],
      imageNames: r.imageNames ?? [],
      scopeLabel: r.scopeLabel ?? (r.source === "global" ? "GLOBAL" : r.assetName ?? null),
      globalFullScope: !!r.globalFullScope,
      favorite: !!r.favorite,
    } satisfies StreamEntry;
  });
  return entries.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
}

/** Preserve order of `idOrder` when picking entries from `pool`. */
export function orderStreamEntriesByIds(pool: StreamEntry[], idOrder: string[]): StreamEntry[] {
  const byId = new Map(pool.map((e) => [e.id, e]));
  const out: StreamEntry[] = [];
  for (const id of idOrder) {
    const e = byId.get(id);
    if (e) out.push(e);
  }
  return out;
}
