import { BASE_URL, handleResponse } from "@/lib/api-client";
import type {
  CreateTradingPairDto,
  TradingPair,
  UpdateTradingPairDto,
} from "@/types/api";

export const pairsService = {
  async getAll(): Promise<TradingPair[]> {
    const url = `${BASE_URL}/analytics/pairs`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<TradingPair[]>(res, url);
  },

  async create(body: CreateTradingPairDto): Promise<TradingPair> {
    const url = `${BASE_URL}/analytics/pairs`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return handleResponse<TradingPair>(res, url);
  },

  async update(id: string, body: UpdateTradingPairDto): Promise<TradingPair> {
    const url = `${BASE_URL}/analytics/pairs/${id}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return handleResponse<TradingPair>(res, url);
  },

  async remove(id: string): Promise<void> {
    const url = `${BASE_URL}/analytics/pairs/${id}`;
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) {
      await handleResponse(res, url);
    }
  },
};
