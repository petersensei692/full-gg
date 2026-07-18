import { BASE_URL, handleResponse } from "@/lib/api-client";
import type { Strategy, CreateStrategyDto, UpdateStrategyDto } from "@/types/api";

export const strategiesService = {
  async getAll(): Promise<Strategy[]> {
    const url = `${BASE_URL}/analytics/strategies`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<Strategy[]>(res, url);
  },

  async getOne(id: string): Promise<Strategy> {
    const url = `${BASE_URL}/analytics/strategies/${id}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<Strategy>(res, url);
  },

  async create(dto: CreateStrategyDto): Promise<Strategy> {
    const url = `${BASE_URL}/analytics/strategies`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    return handleResponse<Strategy>(res, url);
  },

  async update(id: string, dto: UpdateStrategyDto): Promise<Strategy> {
    const url = `${BASE_URL}/analytics/strategies/${id}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    return handleResponse<Strategy>(res, url);
  },

  async delete(id: string): Promise<void> {
    const url = `${BASE_URL}/analytics/strategies/${id}`;
    const res = await fetch(url, { method: "DELETE" });
    await handleResponse(res, url);
  },
};
