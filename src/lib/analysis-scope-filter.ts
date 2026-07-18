import type { AllAnalysisItem } from "@/types/api";

export type ScopeFilterSelection = {
  /** Include worldwide global analyses (`scope === 'global'`). */
  includeGlobalFull: boolean;
  /** Checked asset IDs: include that asset’s page analyses + globals scoped to that asset. */
  checkedAssetIds: ReadonlySet<string>;
};

/** Whether a unified analysis row passes the scope filter. */
export function rowMatchesScopeFilter(
  row: AllAnalysisItem,
  sel: ScopeFilterSelection,
): boolean {
  if (sel.includeGlobalFull && row.source === "global" && row.globalFullScope) {
    return true;
  }
  for (const aid of sel.checkedAssetIds) {
    if (row.source === "asset" && row.assetId === aid) return true;
    if (row.source === "global" && row.scopedAssetIds?.includes(aid)) return true;
  }
  return false;
}
