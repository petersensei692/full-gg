import { BASE_URL, handleResponse } from "@/lib/api-client";
import type { WatchItem, CreateWatchItemDto, UpdateWatchItemDto } from "@/types/api";

export const watchItemsService = {
  async getAll(): Promise<WatchItem[]> {
    const url = `${BASE_URL}/fondamental/assets/watch-items`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res, url);
  },

  async getOne(id: string): Promise<WatchItem> {
    const url = `${BASE_URL}/fondamental/assets/watch-items/${id}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res, url);
  },

  async create(dto: CreateWatchItemDto): Promise<WatchItem> {
    const url = `${BASE_URL}/fondamental/assets/watch-items`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    return handleResponse(res, url);
  },

  async update(id: string, dto: UpdateWatchItemDto): Promise<WatchItem> {
    const url = `${BASE_URL}/fondamental/assets/watch-items/${id}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    return handleResponse(res, url);
  },

  async delete(id: string): Promise<void> {
    const url = `${BASE_URL}/fondamental/assets/watch-items/${id}`;
    const res = await fetch(url, {
      method: "DELETE",
    });
    await handleResponse(res, url);
  },
};
