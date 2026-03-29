import { BASE_URL, handleResponse } from "@/lib/api-client";
import { analyticsRangeQuery } from "@/lib/analytics-range-params";
import type {
  PerformanceAnalyticsResponse,
  PerformanceFrequencyMode,
  PerformanceFrequencyUnit,
} from "@/types/api";

export const performanceAnalyticsService = {
  async get(params?: {
    from?: Date | null;
    to?: Date;
    calendarYear?: number;
    calendarMonth?: number;
    frequencyMode?: PerformanceFrequencyMode;
    frequencyUnit?: PerformanceFrequencyUnit;
    pairs?: string[];
    currencies?: string[];
  }): Promise<PerformanceAnalyticsResponse> {
    const query = new URLSearchParams();
    if (params?.pairs?.length) query.set("pairs", params.pairs.join(","));
    if (params?.currencies?.length) query.set("currencies", params.currencies.join(","));
    if (params?.to) {
      const r = analyticsRangeQuery(params.from ?? null, params.to);
      if (r.fromMs) query.set("fromMs", r.fromMs);
      query.set("toMs", r.toMs);
    }
    if (params?.calendarYear != null) query.set("calendarYear", String(params.calendarYear));
    if (params?.calendarMonth != null) query.set("calendarMonth", String(params.calendarMonth));
    if (params?.frequencyMode) query.set("frequencyMode", params.frequencyMode);
    if (params?.frequencyUnit) query.set("frequencyUnit", params.frequencyUnit);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const url = `${BASE_URL}/analytics/performance-analytics${suffix}`;
    const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
    return handleResponse(res, url);
  },
};
