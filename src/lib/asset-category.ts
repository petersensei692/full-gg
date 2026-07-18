/** Canonical grouping for assets (matches analysis / watchlist conventions). */
export type AssetCategory = "currency" | "commodity" | "stocks" | "crypto";

export function normalizeAssetCategory(type: string | null | undefined): AssetCategory {
  const v = (type ?? "").toLowerCase();
  if (v === "commodity") return "commodity";
  if (v === "stocks" || v === "bond") return "stocks";
  if (v === "crypto") return "crypto";
  return "currency";
}

export const ASSET_CATEGORY_ORDER: AssetCategory[] = [
  "currency",
  "commodity",
  "crypto",
  "stocks",
];

export const ASSET_CATEGORY_LABEL: Record<AssetCategory, string> = {
  currency: "Currencies",
  commodity: "Commodities",
  crypto: "Crypto",
  stocks: "Stocks",
};
