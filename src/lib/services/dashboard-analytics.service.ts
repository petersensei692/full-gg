import { BASE_URL, handleResponse } from "@/lib/api-client";
import type { AnalyticsRange, DashboardAnalyticsResponse } from "@/types/api";

export const dashboardAnalyticsService = {
  async get(params?: {
    tradeCountRange?: AnalyticsRange;
    resultRange?: AnalyticsRange;
    from?: string;
    to?: string;
  }): Promise<DashboardAnalyticsResponse> {
    const query = new URLSearchParams();
    if (params?.tradeCountRange) query.set("tradeCountRange", params.tradeCountRange);
    if (params?.resultRange) query.set("resultRange", params.resultRange);
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const url = `${BASE_URL}/analytics/dashboard-analytics${suffix}`;
    const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
    return handleResponse(res, url);
  },
};
