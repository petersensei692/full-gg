import { APP_DATE_LOCALE } from "@/lib/date-locale";

/** Calendar months touched between two dates (inclusive). */
export function distinctMonthCount(from: Date, to: Date): number {
  const set = new Set<string>();
  let d = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (d <= end) {
    set.add(`${d.getFullYear()}-${d.getMonth()}`);
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  return set.size;
}

function startOfDayMs(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export type TradePerformanceAxisTick = { index: number; label: string };

/**
 * Sparse X-axis labels for the per-trade bar chart: all bars stay visible; only some indices get labels.
 */
export function buildTradePerformanceAxisTicks(closedAtIsos: string[]): TradePerformanceAxisTick[] {
  if (closedAtIsos.length === 0) return [];
  const times = closedAtIsos.map((iso) => new Date(iso).getTime());
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const minD = new Date(minT);
  const maxD = new Date(maxT);
  const months = distinctMonthCount(minD, maxD);

  const tickTargets: number[] = [];

  if (months >= 12) {
    let d = new Date(minD.getFullYear(), minD.getMonth(), 1);
    const end = new Date(maxD.getFullYear(), maxD.getMonth(), 1);
    while (d <= end) {
      tickTargets.push(d.getTime());
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
  } else if (months > 6) {
    let cur = new Date(minD.getFullYear(), minD.getMonth(), 1);
    const end = new Date(maxD.getFullYear(), maxD.getMonth() + 1, 0, 23, 59, 59, 999);
    while (cur <= end) {
      tickTargets.push(new Date(cur.getFullYear(), cur.getMonth(), 1).getTime());
      tickTargets.push(new Date(cur.getFullYear(), cur.getMonth(), 15).getTime());
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  } else {
    const stepDays = months <= 3 ? 3 : 10;
    const start = startOfDayMs(minD);
    for (let t = start; t <= maxT; t += stepDays * 86400000) {
      tickTargets.push(t);
    }
  }

  const nearestIndex = (target: number) => {
    let bestI = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < times.length; i++) {
      const diff = Math.abs(times[i] - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestI = i;
      }
    }
    return bestI;
  };

  const labelForTarget = (targetMs: number): string => {
    const td = new Date(targetMs);
    if (months >= 12) {
      return td.toLocaleDateString(APP_DATE_LOCALE, { month: "short" });
    }
    if (months > 6) {
      const dom = td.getDate();
      return dom <= 1
        ? td.toLocaleDateString(APP_DATE_LOCALE, { month: "short" })
        : td.toLocaleDateString(APP_DATE_LOCALE, { month: "short", day: "numeric" });
    }
    return td.toLocaleDateString(APP_DATE_LOCALE, { month: "short", day: "numeric" });
  };

  const byIndex = new Map<number, string>();
  for (const target of tickTargets) {
    const idx = nearestIndex(target);
    const label = labelForTarget(target);
    if (!byIndex.has(idx)) byIndex.set(idx, label);
  }

  return [...byIndex.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, label]) => ({ index, label }));
}
