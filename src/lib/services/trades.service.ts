import { BASE_URL, handleResponse } from "@/lib/api-client";
import type { Trade, CreateTradeDto, UpdateTradeDto, TradesListResponse } from "@/types/api";

export type TradesQueryParams = {
  page?: number;
  limit?: number;
  symbols?: string[];
  currencies?: string[];
  buy?: boolean;
  sell?: boolean;
  profitMin?: string;
  profitMax?: string;
  holdMin?: string;
  holdMax?: string;
  volumeMin?: string;
  volumeMax?: string;
  dateFrom?: string;
  dateTo?: string;
};

function buildTradesQuery(params: TradesQueryParams): string {
  const sp = new URLSearchParams();
  if (params.page != null) sp.set("page", String(params.page));
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.symbols?.length) sp.set("symbols", params.symbols.join(","));
  if (params.currencies?.length) sp.set("currencies", params.currencies.join(","));
  if (params.buy === false) sp.set("buy", "false");
  if (params.sell === false) sp.set("sell", "false");
  if (params.profitMin) sp.set("profitMin", params.profitMin);
  if (params.profitMax) sp.set("profitMax", params.profitMax);
  if (params.holdMin) sp.set("holdMin", params.holdMin);
  if (params.holdMax) sp.set("holdMax", params.holdMax);
  if (params.volumeMin) sp.set("volumeMin", params.volumeMin);
  if (params.volumeMax) sp.set("volumeMax", params.volumeMax);
  if (params.dateFrom) sp.set("dateFrom", params.dateFrom);
  if (params.dateTo) sp.set("dateTo", params.dateTo);
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export const tradesService = {
  async getDistinctPairs(): Promise<string[]> {
    const url = `${BASE_URL}/analytics/trades/pairs`;
    const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
    return handleResponse<string[]>(res, url);
  },

  async getPage(params: TradesQueryParams = {}): Promise<TradesListResponse> {
    const url = `${BASE_URL}/analytics/trades${buildTradesQuery(params)}`;
    const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
    return handleResponse<TradesListResponse>(res, url);
  },

  async getOne(id: string): Promise<Trade> {
    const url = `${BASE_URL}/analytics/trades/${id}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res, url);
  },

  async create(dto: CreateTradeDto): Promise<Trade> {
    const url = `${BASE_URL}/analytics/trades`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    return handleResponse(res, url);
  },

  async update(id: string, dto: UpdateTradeDto): Promise<Trade> {
    const url = `${BASE_URL}/analytics/trades/${id}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    return handleResponse(res, url);
  },

  async delete(id: string): Promise<void> {
    const url = `${BASE_URL}/analytics/trades/${id}`;
    const res = await fetch(url, { method: "DELETE" });
    await handleResponse(res, url);
  },
};
