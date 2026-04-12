/** Static-export-safe URL for any asset analysis page (avoids dynamic [asset] segments). */
export function assetAnalysisHref(slug: string): string {
  return `/fundamental-analysis/asset?slug=${encodeURIComponent(slug)}`;
}

/** Favorites-only popup: asset stream (same query shape as main asset page). */
export function favoritesAssetAnalysisHref(slug: string): string {
  return `/fundamental-analysis/favorites/asset?slug=${encodeURIComponent(slug)}`;
}
