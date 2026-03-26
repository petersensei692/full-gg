import { BASE_URL, handleResponse } from "@/lib/api-client";
import type { Trade, CreateTradeDto, UpdateTradeDto } from "@/types/api";

export const tradesService = {
  async getAll(): Promise<Trade[]> {
    const url = `${BASE_URL}/analytics/trades`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res, url);
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
