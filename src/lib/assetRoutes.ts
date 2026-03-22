/** Static-export-safe URL for any asset analysis page (avoids dynamic [asset] segments). */
export function assetAnalysisHref(slug: string): string {
  return `/fundamental-analysis/asset?slug=${encodeURIComponent(slug)}`;
}
