/** Inclusive range as epoch ms — avoids UTC/local shifts from ISO strings. */
export function analyticsRangeQuery(from: Date | null, to: Date): { fromMs?: string; toMs: string } {
  return {
    ...(from != null ? { fromMs: String(from.getTime()) } : {}),
    toMs: String(to.getTime()),
  };
}
