import { BASE_URL, handleResponse } from "@/lib/api-client";
import type {
  WeeklyWatchlist,
  CreateWeeklyWatchlistDto,
  UpdateWeeklyWatchlistDto,
} from "@/types/api";

export const weeklyWatchlistService = {
  async getAll(): Promise<WeeklyWatchlist[]> {
    const url = `${BASE_URL}/weekly/watchlist`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res, url);
  },

  async getOne(id: string): Promise<WeeklyWatchlist> {
    const url = `${BASE_URL}/weekly/watchlist/${id}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res, url);
  },

  async create(dto: CreateWeeklyWatchlistDto): Promise<WeeklyWatchlist> {
    const url = `${BASE_URL}/weekly/watchlist`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    return handleResponse(res, url);
  },

  async update(id: string, dto: UpdateWeeklyWatchlistDto): Promise<WeeklyWatchlist> {
    const url = `${BASE_URL}/weekly/watchlist/${id}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    return handleResponse(res, url);
  },

  async delete(id: string): Promise<void> {
    const url = `${BASE_URL}/weekly/watchlist/${id}`;
    const res = await fetch(url, {
      method: "DELETE",
    });
    await handleResponse(res, url);
  },
};
