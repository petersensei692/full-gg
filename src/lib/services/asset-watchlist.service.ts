import { BASE_URL, handleResponse } from "@/lib/api-client";
import type { AssetWatchlist } from "@/types/api";

export const assetWatchlistService = {
  async getByAsset(assetId: string): Promise<AssetWatchlist[]> {
    const url = `${BASE_URL}/weekly/asset-watchlist?assetId=${encodeURIComponent(assetId)}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res, url);
  },

  async getByWeeklyWatchlist(weeklyWatchlistId: string): Promise<AssetWatchlist[]> {
    const url = `${BASE_URL}/weekly/asset-watchlist?weeklyWatchlistId=${encodeURIComponent(weeklyWatchlistId)}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res, url);
  },

  async getOne(id: string): Promise<AssetWatchlist> {
    const url = `${BASE_URL}/weekly/asset-watchlist/${id}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse(res, url);
  },
};
